import express from 'express';
import { SseError } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseMcpArgs, mcpConfig } from '../config/mcp';
import mcpProxy from '../services/mcp/proxy';
import {
  createTransport,
  getBackingServerTransport,
  setBackingServerTransport,
  webAppTransports,
  generateSessionId
} from '../services/mcp/transport';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: MCP
 *   description: ModelContextProtocol 프록시 API
 */

/**
 * @swagger
 * /mcp:
 *   get:
 *     summary: MCP Streamable HTTP 세션 연결 (GET)
 *     tags: [MCP]
 *     parameters:
 *       - in: header
 *         name: mcp-session-id
 *         required: true
 *         schema:
 *           type: string
 *         description: 세션 ID
 *     responses:
 *       200:
 *         description: 성공적인 응답
 *       404:
 *         description: 세션을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  console.log(`Received GET message for sessionId ${sessionId}`);
  try {
    const transport = webAppTransports.get(sessionId) as StreamableHTTPServerTransport;
    if (!transport) {
      res.status(404).end('Session not found');
      return;
    } else {
      await transport.handleRequest(req, res);
    }
  } catch (error) {
    console.error('Error in /mcp route:', error);
    res.status(500).json(error);
  }
});

/**
 * @swagger
 * /mcp:
 *   post:
 *     summary: MCP Streamable HTTP 세션 생성 및 메시지 전송 (POST)
 *     tags: [MCP]
 *     parameters:
 *       - in: header
 *         name: mcp-session-id
 *         required: false
 *         schema:
 *           type: string
 *         description: 세션 ID (없으면 새 세션 생성)
 *       - in: query
 *         name: transportType
 *         required: true
 *         schema:
 *           $ref: '#/components/schemas/TransportType'
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         description: 연결할 URL (sse 또는 streamable-http 전송 방식 사용 시)
 *       - in: query
 *         name: command
 *         schema:
 *           type: string
 *         description: 실행할 명령어 (stdio 전송 방식 사용 시)
 *       - in: query
 *         name: args
 *         schema:
 *           type: string
 *         description: 명령어 인자 (stdio 전송 방식 사용 시)
 *     responses:
 *       200:
 *         description: 성공적인 응답
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 세션을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/mcp', async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  console.log(`Received POST /mcp for sessionId=${sessionId}`);

  if (!sessionId) {
    // 신규 세션 생성
    try {
      // (1) 기존 백엔드 연결 종료 및 새 연결 생성
      try {
        const current = getBackingServerTransport();
        await current?.close();
        const next = await createTransport(req);
        setBackingServerTransport(next);
      } catch (err) {
        if (err instanceof SseError && err.code === 401) {
          return res.status(401).json(err);
        }
        throw err;
      }

      // (2) 웹용 Streamable HTTP 서버 트랜스포트
      const webApp = new StreamableHTTPServerTransport({
        sessionIdGenerator: generateSessionId,
        onsessioninitialized: id => {
          webAppTransports.set(id, webApp);
          console.log('Created web app transport', id);
        },
      });
      await webApp.start();

      // (3) MCP 프록시 연결
      mcpProxy({
        transportToClient: webApp,
        transportToServer: getBackingServerTransport()!,
      });

      // (4) **req.body** 나 다른 body-parser 없이** SDK 가 직접 스트림을 읽도록
      await webApp.handleRequest(req, res);
    } catch (err) {
      console.error('Error in /mcp POST:', err);
      res.status(500).json(err);
    }
  } else {
    // 기존 세션에 대한 메시지 전달
    try {
      const transport = webAppTransports.get(sessionId) as StreamableHTTPServerTransport;
      if (!transport) {
        return res.status(404).end(`Transport not found for sessionId ${sessionId}`);
      }
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error('Error in /mcp POST existing session:', err);
      res.status(500).json(err);
    }
  }
});


/**
 * @swagger
 * /stdio:
 *   get:
 *     summary: Stdio 전송 방식으로 연결
 *     tags: [MCP]
 *     parameters:
 *       - in: query
 *         name: transportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stdio]
 *       - in: query
 *         name: command
 *         required: true
 *         schema:
 *           type: string
 *         description: 실행할 명령어
 *       - in: query
 *         name: args
 *         schema:
 *           type: string
 *         description: 명령어 인자
 *     responses:
 *       200:
 *         description: 성공적인 응답 (이벤트 스트림)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
// 2. mcp.routes.ts 수정 - stdio 라우트
router.get('/stdio', async (req, res) => {
  try {
    const { serverName, transportType, command, args } = req.query;
    
    // 필수 파라미터 체크
    if (!serverName) {
      return res.status(400).json({ error: 'serverName parameter is required' });
    }
    if (!command) {
      return res.status(400).json({ error: 'command parameter is required' });
    }
    
    console.log(`🚀 Creating connection for server: ${serverName}`);
    console.log(`   Command: ${command} ${args || ''}`);

    
    try {
      const currentTransport = getBackingServerTransport();
      await currentTransport?.close();
      const newTransport = await createTransport(req);
      setBackingServerTransport(newTransport);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error('Received 401 Unauthorized from MCP server:', error.message);
        res.status(401).json(error);
        return;
      }
      throw error;
    }

    console.log(`✓ Connected to server transport for ${serverName}`);

    // 클라이언트 transport 생성
    const webAppTransport = new SSEServerTransport('/message', res);
    
    // 서버 이름과 세션 ID 조합으로 키 생성
    const sessionKey = `${serverName}-${webAppTransport.sessionId}`;
    webAppTransports.set(sessionKey, webAppTransport);

    console.log(`✓ Created web app transport: ${sessionKey}`);

    // 세션 ID 헤더 설정
    res.setHeader('mcp-session-id', sessionKey);

    await webAppTransport.start();
    (getBackingServerTransport() as StdioClientTransport).stderr!.on(
      'data',
      (chunk) => {
        webAppTransport.send({
          jsonrpc: '2.0',
          method: 'notifications/stderr',
          params: {
            content: chunk.toString(),
          },
        });
      },
    );

    mcpProxy({
      transportToClient: webAppTransport,
      transportToServer: getBackingServerTransport()!,
    });

    console.log('Set up MCP proxy');
  } catch (error) {
    console.error('Error in /stdio route:', error);
    res.status(500).json(error);
  }
});

/**
 * @swagger
 * /sse:
 *   get:
 *     summary: SSE 전송 방식으로 연결 (deprecated)
 *     tags: [MCP]
 *     deprecated: true
 *     parameters:
 *       - in: query
 *         name: transportType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sse]
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: SSE 서버 URL
 *     responses:
 *       200:
 *         description: 성공적인 응답 (이벤트 스트림)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get('/sse', async (req, res) => {
  try {
    console.log(
      'New SSE connection. NOTE: The sse transport is deprecated and has been replaced by streamable-http',
    );

    try {
      const currentTransport = getBackingServerTransport();
      await currentTransport?.close();
      const newTransport = await createTransport(req);
      setBackingServerTransport(newTransport);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error('Received 401 Unauthorized from MCP server:', error.message);
        res.status(401).json(error);
        return;
      }
      throw error;
    }

    console.log('Connected MCP client to backing server transport');

    const webAppTransport = new SSEServerTransport('/message', res);
    webAppTransports.set(webAppTransport.sessionId, webAppTransport);
    console.log('Created web app transport');

    await webAppTransport.start();

    mcpProxy({
      transportToClient: webAppTransport,
      transportToServer: getBackingServerTransport()!,
    });

    console.log('Set up MCP proxy');
  } catch (error) {
    console.error('Error in /sse route:', error);
    res.status(500).json(error);
  }
});

/**
 * @swagger
 * /message:
 *   post:
 *     summary: SSE 세션에 메시지 전송
 *     tags: [MCP]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 세션 ID
 *     responses:
 *       200:
 *         description: 성공적인 응답
 *       404:
 *         description: 세션을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.post('/message', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    console.log(`Received POST /message for sessionId=${sessionId}`);

    const transport = webAppTransports.get(sessionId) as SSEServerTransport;
    if (!transport) {
      return res.status(404).end('Session not found');
    }
    // 역시 **body-parser 없이** SDK 가 직접 스트림을 읽습니다
    await transport.handlePostMessage(req, res);
  } catch (err) {
    console.error('Error in /message POST:', err);
    res.status(500).json(err);
  }
});
/**
 * @swagger
 * /health:
 *   get:
 *     summary: 서버 상태 확인
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: 서버가 정상 작동 중
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});

/**
 * @swagger
 * /config:
 *   get:
 *     summary: 서버 설정 정보 조회
 *     tags: [MCP]
 *     responses:
 *       200:
 *         description: 설정 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 defaultEnvironment:
 *                   type: object
 *                 defaultCommand:
 *                   type: string
 *                 defaultArgs:
 *                   type: string
 *       500:
 *         description: 서버 오류
 */
router.get('/config', (req, res) => {
  try {
    const args = parseMcpArgs(process.argv.slice(2));
    res.json({
      defaultEnvironment: mcpConfig.defaultEnvironment,
      defaultCommand: args.env,
      defaultArgs: args.args,
    });
  } catch (error) {
    console.error('Error in /config route:', error);
    res.status(500).json(error);
  }
});




// 2. mcp.routes.ts 수정 - stdio 라우트
router.get('/stdio', async (req, res) => {
  try {
    console.log('New connection');

    try {
      const currentTransport = getBackingServerTransport();
      await currentTransport?.close();
      const newTransport = await createTransport(req);
      setBackingServerTransport(newTransport);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error('Received 401 Unauthorized from MCP server:', error.message);
        res.status(401).json(error);
        return;
      }
      throw error;
    }

    console.log('Connected MCP client to backing server transport');

    const webAppTransport = new SSEServerTransport('/message', res);
    webAppTransports.set(webAppTransport.sessionId, webAppTransport);

    console.log('Created web app transport');

    await webAppTransport.start();
    (getBackingServerTransport() as StdioClientTransport).stderr!.on(
      'data',
      (chunk) => {
        webAppTransport.send({
          jsonrpc: '2.0',
          method: 'notifications/stderr',
          params: {
            content: chunk.toString(),
          },
        });
      },
    );

    mcpProxy({
      transportToClient: webAppTransport,
      transportToServer: getBackingServerTransport()!,
    });

    console.log('Set up MCP proxy');
  } catch (error) {
    console.error('Error in /stdio route:', error);
    res.status(500).json(error);
  }
});

// 3. 동시 실행을 위한 새로운 라우트 추가
router.post('/mcp/batch-start', async (req, res) => {
  try {
    const { servers } = req.body; // [{serverName, command, args}, ...]
    
    if (!Array.isArray(servers) || servers.length === 0) {
      return res.status(400).json({ error: 'servers array is required' });
    }
    
    console.log(`🚀 Starting ${servers.length} servers concurrently...`);
    
    const results = await Promise.allSettled(
      servers.map(async (server) => {
        const { serverName, command, args } = server;
        
        if (!serverName || !command) {
          throw new Error(`serverName and command are required for ${JSON.stringify(server)}`);
        }
        
        // 각 서버에 대해 stdio 엔드포인트 호출
        const response = await fetch(`http://localhost:${req.app.get('port') || 4303}/stdio?serverName=${encodeURIComponent(serverName)}&transportType=stdio&command=${encodeURIComponent(command)}&args=${encodeURIComponent(args || '')}`, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to start ${serverName}: ${response.statusText}`);
        }
        
        return {
          serverName,
          status: 'started',
          sessionId: response.headers.get('mcp-session-id')
        };
      })
    );
    
    // 결과 정리
    const summary = {
      total: servers.length,
      succeeded: 0,
      failed: 0,
      results: results.map((result, index) => {
        if (result.status === 'fulfilled') {
          summary.succeeded++;
          return result.value;
        } else {
          summary.failed++;
          return {
            serverName: servers[index].serverName,
            status: 'failed',
            error: result.reason.message
          };
        }
      })
    };
    
    console.log(`✅ Batch start complete: ${summary.succeeded}/${summary.total} succeeded`);
    res.json(summary);
    
  } catch (error) {
    console.error('❌ Error in /mcp/batch-start:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 개별 서버 종료를 위한 새로운 라우트
router.post('/mcp/server/:serverId/stop', async (req, res) => {
  try {
    const { serverId } = req.params;
    
    if (!serverId) {
      return res.status(400).json({ error: 'serverId parameter is required' });
    }
    
    console.log(`🛑 Stopping server ${serverId}...`);
    
    // 해당 서버의 모든 세션 종료
    const sessions = Array.from(webAppTransports.keys())
      .filter(key => key.startsWith(`${serverId}-`));
    
    console.log(`   Closing ${sessions.length} sessions for ${serverId}`);
    
    // 모든 세션 종료
    await Promise.all(sessions.map(async (sessionKey) => {
      const transport = webAppTransports.get(sessionKey);
      if (transport) {
        await transport.close();
        webAppTransports.delete(sessionKey);
      }
    }));
    
    // 서버 transport 종료
    try {
      const currentTransport = getBackingServerTransport();
      await currentTransport?.close();
      const newTransport = await createTransport(req);
      setBackingServerTransport(newTransport);
    } catch (error) {
      if (error instanceof SseError && error.code === 401) {
        console.error('Received 401 Unauthorized from MCP server:', error.message);
        res.status(401).json(error);
        return;
      }
      throw error;
    }
    
    const result = {
      serverName: serverId,
      status: 'stopped',
      sessionsRemoved: sessions.length
    };
    
    console.log(`✅ Server ${serverId} stopped successfully`);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ Error stopping server ${req.params.serverId}:`, error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 4. 동시 종료를 위한 새로운 라우트 추가
router.post('/mcp/batch-stop', async (req, res) => {
  try {
    const { serverNames } = req.body; // ['server1', 'server2', ...]
    
    if (!Array.isArray(serverNames) || serverNames.length === 0) {
      return res.status(400).json({ error: 'serverNames array is required' });
    }
    
    console.log(`🛑 Stopping ${serverNames.length} servers...`);
    
    const results = await Promise.allSettled(
      serverNames.map(async (serverName) => {
        // 해당 서버의 모든 세션 종료
        const sessions = Array.from(webAppTransports.keys())
          .filter(key => key.startsWith(`${serverName}-`));
        
        console.log(`   Closing ${sessions.length} sessions for ${serverName}`);
        
        // 모든 세션 종료
        await Promise.all(sessions.map(async (sessionKey) => {
          const transport = webAppTransports.get(sessionKey);
          if (transport) {
            await transport.close();
            webAppTransports.delete(sessionKey);
          }
        }));
        
        try {
          const currentTransport = getBackingServerTransport();
          await currentTransport?.close();
          const newTransport = await createTransport(req);
          setBackingServerTransport(newTransport);
        } catch (error) {
          if (error instanceof SseError && error.code === 401) {
            console.error('Received 401 Unauthorized from MCP server:', error.message);
            res.status(401).json(error);
            return;
          }
          throw error;
        }

        
        return {
          serverName,
          status: 'stopped',
          sessionsRemoved: sessions.length
        };
      })
    );
    
    // 결과 정리
    const summary = {
      total: serverNames.length,
      succeeded: 0,
      failed: 0,
      results: results.map((result, index) => {
        if (result.status === 'fulfilled') {
          summary.succeeded++;
          return result.value;
        } else {
          summary.failed++;
          return {
            serverName: serverNames[index],
            status: 'failed',
            error: result.reason.message
          };
        }
      })
    };
    
    console.log(`✅ Batch stop complete: ${summary.succeeded}/${summary.total} succeeded`);
    res.json(summary);
    
  } catch (error) {
    console.error('❌ Error in /mcp/batch-stop:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});


type ActiveServerInfo = {
  serverName: string;
  sessions: { sessionId: string; active: boolean }[];
  totalSessions: number;
};

// 5. 활성 서버 목록 조회 라우트
router.get('/mcp/active-servers', (req, res) => {
  const activeServers: ActiveServerInfo[] = [];  
  // 서버별로 활성 세션 정보 수집
  for (const [sessionKey, transport] of webAppTransports.entries()) {
    const serverName = sessionKey.split('-')[0];
  let serverInfo = activeServers.find(s => s.serverName === serverName);
    
    if (!serverInfo) {
      serverInfo = {
        serverName,
        sessions: [],
        totalSessions: 0
      };
      activeServers.push(serverInfo);
    }
    
    serverInfo.sessions.push({
      sessionId: sessionKey,
      active: transport !== undefined
    });
    serverInfo.totalSessions++;
  }
  
  res.json({
    total: activeServers.length,
    servers: activeServers
  });
});






export default router;

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
  console.log(`Received POST message for sessionId ${sessionId}`);
  if (!sessionId) {
    try {
      console.log('New streamable-http connection');
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

      const webAppTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: generateSessionId,
        onsessioninitialized: (sessionId) => {
          webAppTransports.set(sessionId, webAppTransport);
          console.log('Created streamable web app transport ' + sessionId);
        },
      });

      await webAppTransport.start();

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: getBackingServerTransport()!,
      });

      await (webAppTransport as StreamableHTTPServerTransport).handleRequest(
        req,
        res,
        req.body,
      );
    } catch (error) {
      console.error('Error in /mcp POST route:', error);
      res.status(500).json(error);
    }
  } else {
    try {
      const transport = webAppTransports.get(sessionId) as StreamableHTTPServerTransport;
      if (!transport) {
        res.status(404).end('Transport not found for sessionId ' + sessionId);
      } else {
        await (transport as StreamableHTTPServerTransport).handleRequest(req, res);
      }
    } catch (error) {
      console.error('Error in /mcp route:', error);
      res.status(500).json(error);
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
    const sessionId = req.query.sessionId;
    console.log(`Received message for sessionId ${sessionId}`);

    const transport = webAppTransports.get(sessionId as string) as SSEServerTransport;
    if (!transport) {
      res.status(404).end('Session not found');
      return;
    }
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('Error in /message route:', error);
    res.status(500).json(error);
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

export default router; 
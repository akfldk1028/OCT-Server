// src/main/mcp-handler.ts
import { ipcMain } from 'electron';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema, ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';

let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;

// MCP 서버 연결
ipcMain.handle('mcp:connect', async () => {
  try {
    // 이미 연결되어 있다면 기존 연결 반환
    if (mcpClient) {
      return { success: true, message: 'Already connected' };
    }

    // MCP 서버 시작 (예: @modelcontextprotocol/server-everything)
    mcpTransport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    });

    mcpClient = new Client(
      {
        name: 'simple-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    );

    await mcpClient.connect(mcpTransport);

    return { success: true, message: 'Connected to MCP server' };
  } catch (error) {
    console.error('MCP connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
});

// MCP 서버 연결 해제
ipcMain.handle('mcp:disconnect', async () => {
  try {
    if (mcpClient) {
      await mcpClient.close();
      mcpClient = null;
      mcpTransport = null;
    }
    return { success: true };
  } catch (error) {
    console.error('MCP disconnect error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Disconnect failed',
    };
  }
});

// 메시지 전송 (간단한 에코 서버처럼 동작)

ipcMain.handle('mcp:sendMessage', async (event, message: string) => {
  try {
    if (!mcpClient) {
      throw new Error('Not connected to MCP server');
    }

    // 정확한 스키마 사용
    const toolsResponse = await mcpClient.request(
      { method: 'tools/list' },
      ListToolsResultSchema
    );

    // 구조 확인
    console.log('toolsResponse:', toolsResponse);

    const response = `MCP Server received: "${message}"\nAvailable tools: ${toolsResponse.tools?.length || 0}`;

    return {
      success: true,
      response,
    };
  } catch (error) {
    console.error('MCP message error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Message failed',
    };
  }
});
// main.ts에 추가할 내용
export function setupMCPHandlers() {
  console.log('MCP handlers setup complete');
}

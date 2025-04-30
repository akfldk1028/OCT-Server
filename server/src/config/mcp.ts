import { getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";

// MCP 서비스 설정
export const mcpConfig = {
  // 헤더 패스스루 설정
  SSE_HEADERS_PASSTHROUGH: ["authorization"],
  STREAMABLE_HTTP_HEADERS_PASSTHROUGH: [
    "authorization",
    "mcp-session-id",
    "last-event-id",
  ],
  
  // 기본 환경 변수
  defaultEnvironment: {
    ...getDefaultEnvironment(),
    ...(process.env.MCP_ENV_VARS ? JSON.parse(process.env.MCP_ENV_VARS) : {}),
  },
  
  // 기본 포트
  port: process.env.MCP_PORT || 6277,
};

// MCP 관련 인자 파싱 (필요한 경우 확장 가능)
export const parseMcpArgs = (args: string[]) => {
  // 기본 값을 반환
  return {
    env: process.env.MCP_ENV || "",
    args: process.env.MCP_ARGS || "",
  };
}; 
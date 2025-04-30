import express from "express";
import { parse as shellParseArgs } from "shell-quote";
import { findActualExecutable } from "spawn-rx";
import { randomUUID } from "node:crypto";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { SSEClientTransport, SseError } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mcpConfig } from "../../config/mcp";

// 웹 앱 전송 레이어 맵 - 세션별로 전송 레이어 저장
export const webAppTransports: Map<string, Transport> = new Map<string, Transport>();

// 서버 측 전송 레이어 저장 변수
let _backingServerTransport: Transport | undefined;

// backingServerTransport 접근 및 설정 함수
export const getBackingServerTransport = (): Transport | undefined => {
  return _backingServerTransport;
};

export const setBackingServerTransport = (transport: Transport | undefined): void => {
  _backingServerTransport = transport;
};

/**
 * 전송 레이어(transport) 생성 함수
 * 클라이언트 요청 정보를 기반으로 적절한 전송 방식 생성
 */
export const createTransport = async (req: express.Request): Promise<Transport> => {
  const query = req.query;
  console.log("Query parameters:", query);

  const transportType = query.transportType as string;

  // Stdio 전송 방식
  if (transportType === "stdio") {
    const command = query.command as string;
    const origArgs = shellParseArgs(query.args as string) as string[];
    const queryEnv = query.env ? JSON.parse(query.env as string) : {};
    const env = { ...process.env, ...mcpConfig.defaultEnvironment, ...queryEnv };

    const { cmd, args } = findActualExecutable(command, origArgs);

    console.log(`Stdio transport: command=${cmd}, args=${args}`);

    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env,
      stderr: "pipe",
    });

    await transport.start();

    console.log("Spawned stdio transport");
    return transport;
  } 
  // SSE 전송 방식
  else if (transportType === "sse") {
    const url = query.url as string;
    const headers: HeadersInit = {
      Accept: "text/event-stream",
    };

    for (const key of mcpConfig.SSE_HEADERS_PASSTHROUGH) {
      if (req.headers[key] === undefined) {
        continue;
      }

      const value = req.headers[key];
      headers[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }

    console.log(`SSE transport: url=${url}, headers=${Object.keys(headers)}`);

    const transport = new SSEClientTransport(new URL(url), {
      eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
      },
      requestInit: {
        headers,
      },
    });
    await transport.start();

    console.log("Connected to SSE transport");
    return transport;
  } 
  // Streamable HTTP 전송 방식
  else if (transportType === "streamable-http") {
    const headers: HeadersInit = {
      Accept: "text/event-stream, application/json",
    };

    for (const key of mcpConfig.STREAMABLE_HTTP_HEADERS_PASSTHROUGH) {
      if (req.headers[key] === undefined) {
        continue;
      }

      const value = req.headers[key];
      headers[key] = Array.isArray(value) ? value[value.length - 1] : value;
    }

    const transport = new StreamableHTTPClientTransport(
      new URL(query.url as string),
      {
        requestInit: {
          headers,
        },
      },
    );
    await transport.start();
    console.log("Connected to Streamable HTTP transport");
    return transport;
  } 
  // 지원하지 않는 전송 방식
  else {
    console.error(`Invalid transport type: ${transportType}`);
    throw new Error("Invalid transport type specified");
  }
};

/**
 * 세션 ID 생성 함수
 */
export const generateSessionId = () => {
  return randomUUID();
}; 
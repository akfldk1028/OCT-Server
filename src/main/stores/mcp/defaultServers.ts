// main/stores/mcp/defaultServers.ts
export const DEFAULT_MCP_SERVERS = [
  {
    id: 'server-everything',
    name: 'Everything Server',
    description: 'File, web search, and system tools',
    transportType: 'stdio' as const,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    env: {},
    autoConnect: true,
    capabilities: {
      tools: true,
      prompts: true,
      resources: true,
    },
  },
];

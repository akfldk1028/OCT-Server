import { Tables } from "@/renderer/database.types";

export interface MCPConfig {
    schema_version: string;
    mcpServers: {
      [key: string]: Partial<MCPServerExtended>;
    };
  }

  export interface MCPServerExtended extends Tables<'mcp_servers_full_view'> {
      defaultMethod?: string;
      host?: string;
      isInstalled?: boolean;
      isRunning?: boolean;
      installedMethod?: string;
      installedDir?: string;
      currentMode?: string;
      execution?: ExecutionConfig;
      userInputs?: { [key: string]: any };
      type: 'git' | 'docker' | 'npm' | 'npx' | 'local' | 'uvx' | 'uv';
      dockerImage?: string;
      uvxPackage?: string;
      installConfig?: InstallationConfig;
  }


  export interface InstallationConfig {
    command: string;
    args: string[];
    env?: { [key: string]: string };
  }


  export interface ExecutionConfig {
    command: string;
    args: string[];
    env?: { [key: string]: string };
  }


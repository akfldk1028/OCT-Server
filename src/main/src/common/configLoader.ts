// src/common/configLoader.ts
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getProductById } from '../../../renderer/features/products/queries';
// import { LocalMCPServer } from './models/LocalMCPServer';
// import { RemoteMCPServer } from './models/RemoteMCPServer';
// import { MCPConfig, MCPServerConfigExtended } from './types/server-config';
// import { BaseMCPServer } from './models/BaseMCPServer';
import type { Tables } from '../../../renderer/database.types';
import type {
  ExecutionConfig,
  InstallationConfig,
  MCPConfig,
  MCPServerExtended,
} from './types/server-config';

// --------------------------------------------------------------------

// 사용자 데이터 경로 (userServers.json - 로컬 설치 상태 등)
const appDataPath = path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? `${process.env.HOME}/Library/Application Support`
      : `${process.env.HOME}/.local/share`),
  'mcp-server-manager', // 앱 이름에 맞게 수정
);
const userConfigPath = path.join(appDataPath, 'userServers.json');

// userServers.json 로드 (이건 사용자의 로컬 설치 상태이므로 유지)
let userConfig: MCPConfig = {
  schema_version: '', // 또는 mcpConfigFromLocalFiles.schema_version
  mcpServers: {},
};
if (fs.existsSync(userConfigPath)) {
  try {
    userConfig = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
  } catch (error) {
    console.error('userServers.json 로드 실패:', error);
  }
} else {
  // userServers.json이 없으면 생성 시도 (선택적)
  try {
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }
    fs.writeFileSync(
      userConfigPath,
      JSON.stringify(userConfig, null, 2),
      'utf8',
    );
  } catch (err) {
    console.error('초기 userServers.json 생성 실패:', err);
  }
}
// --------------------------------------------------------------------

// --- Supabase 클라이언트 관리 ---
let supabaseClientInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      throw new Error(
        '[configLoader] Supabase URL 또는 Anon Key가 환경 변수에 설정되지 않았습니다.',
      );
    }
  }
  return supabaseClientInstance;
}

// src/common/configLoader.ts
// src/common/configLoader.ts
export async function getBaseMCPServerConfig(
  id: string,
  selectedCommandType: MCPServerExtended['type'],
  envVars?: Record<string, string>,
): Promise<MCPServerExtended | undefined> {
  try {
    const supabase = getSupabaseClient();
    const productData: Tables<'mcp_servers_full_view'> | null =
      await getProductById(supabase, { id: Number(id) });

    if (!productData) {
      console.warn(
        `[configLoader] Supabase에서 ID '${id}'에 해당하는 서버 정보를 찾을 수 없습니다.`,
      );
      return undefined;
    }

    // 데이터 구조 로깅
    console.log(`[configLoader] Product Data 구조:`, {
      id: productData.id,
      name: productData.name,
      hasMcpConfig: productData.mcp_config !== null,
    });

    // 서버 이름 확인
    const serverName = productData.name;
    if (!serverName) {
      console.warn(
        `[configLoader] ID '${id}': productData.name이 null이거나 undefined입니다.`,
      );
      return undefined;
    }

    // mcp_config 구조 확인
    const mcpConfig = productData.mcp_config as any;

    // 실행 설정 초기화
    let executionConfig: ExecutionConfig | undefined;
    let installationConfig: InstallationConfig | undefined;
    // 여러 경로로 config 찾기 시도
    // 1. productData.installation.generic 확인
    // if (productData.installation?.generic && Array.isArray(productData.installation.generic)) {
    //   const matchingInstall = productData.installation.generic.find(
    //     (config: any) => config.command === selectedCommandType
    //   );

    //   if (matchingInstall) {
    //     console.log(`[configLoader] ID '${id}': installation.generic에서 '${selectedCommandType}' 설정 찾음`);
    //     executionConfig = {
    //       command: matchingInstall.command,
    //       args: matchingInstall.args || [],
    //       env: { ...(matchingInstall.env || {}), ...(envVars || {}) }
    //     };
    //   }
    // }

    // 2. mcpConfig.mcpServers 확인
    if (!executionConfig && mcpConfig?.mcpServers?.[serverName]) {
      const serverConfig = mcpConfig.mcpServers[serverName];

      // 배열인 경우
      if (Array.isArray(serverConfig)) {
        const configForCommand = serverConfig.find(
          (conf: any) => conf.command === selectedCommandType,
        );

        if (configForCommand) {
          console.log(
            `[configLoader] ID '${id}': mcpConfig.mcpServers['${serverName}'] 배열에서 '${selectedCommandType}' 설정 찾음`,
          );
          executionConfig = {
            command: configForCommand.command,
            args: configForCommand.args || [],
            env: { ...(configForCommand.env || {}), ...(envVars || {}) },
          };
        }
      }
      // 객체인 경우
      else if (typeof serverConfig === 'object' && serverConfig !== null) {
        if (serverConfig.command === selectedCommandType) {
          console.log(
            `[configLoader] ID '${id}': mcpConfig.mcpServers['${serverName}'] 객체에서 '${selectedCommandType}' 설정 찾음`,
          );
          executionConfig = {
            command: serverConfig.command,
            args: serverConfig.args || [],
            env: { ...(serverConfig.env || {}), ...(envVars || {}) },
          };
        }
      }
    }

    // 3. mcpConfig.servers 확인 (이전 버전 호환성)
    if (!executionConfig && mcpConfig?.servers?.[serverName]) {
      const serverConfig = mcpConfig.servers[serverName];

      // 배열인 경우
      if (Array.isArray(serverConfig)) {
        const configForCommand = serverConfig.find(
          (conf: any) => conf.command === selectedCommandType,
        );

        if (configForCommand) {
          console.log(
            `[configLoader] ID '${id}': mcpConfig.servers['${serverName}'] 배열에서 '${selectedCommandType}' 설정 찾음`,
          );
          executionConfig = {
            command: configForCommand.command,
            args: configForCommand.args || [],
            env: { ...(configForCommand.env || {}), ...(envVars || {}) },
          };
        }
      }
      // 객체인 경우
      else if (typeof serverConfig === 'object' && serverConfig !== null) {
        if (serverConfig.command === selectedCommandType) {
          console.log(
            `[configLoader] ID '${id}': mcpConfig.servers['${serverName}'] 객체에서 '${selectedCommandType}' 설정 찾음`,
          );
          executionConfig = {
            command: serverConfig.command,
            args: serverConfig.args || [],
            env: { ...(serverConfig.env || {}), ...(envVars || {}) },
          };
        }
      }
    }

    // 설정을 찾지 못한 경우 기본값 사용
    if (!executionConfig) {
      console.warn(
        `[configLoader] ID '${id}': '${selectedCommandType}' 실행 설정을 찾을 수 없어 기본값 사용`,
      );
      executionConfig = {
        command: selectedCommandType,
        args: [],
        env: envVars || {},
      };
    }

    console.log(`[configLoader] installationConfig:`, installationConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);
    console.log(`[configLoader] executionConfig:`, executionConfig);

    // 최종 서버 템플릿 생성
    const serverTemplate: MCPServerExtended = {
      ...(productData as Tables<'mcp_servers_full_view'>),
      type: selectedCommandType,
      execution: executionConfig,
      installConfig: installationConfig,
      // 기타 필드 설정 (안전하게 액세스)
      defaultMethod:
        getNestedProperty(mcpConfig, 'defaultMethod') ||
        (mcpConfig?.mcpServers?.[serverName]
          ? getCommandProperty(
              mcpConfig.mcpServers[serverName],
              'defaultMethod',
              selectedCommandType,
            )
          : undefined) ||
        (mcpConfig?.servers?.[serverName]
          ? getCommandProperty(
              mcpConfig.servers[serverName],
              'defaultMethod',
              selectedCommandType,
            )
          : undefined),

      host:
        (mcpConfig?.mcpServers?.[serverName]
          ? getCommandProperty(
              mcpConfig.mcpServers[serverName],
              'host',
              selectedCommandType,
            )
          : undefined) ||
        (mcpConfig?.servers?.[serverName]
          ? getCommandProperty(
              mcpConfig.servers[serverName],
              'host',
              selectedCommandType,
            )
          : undefined) ||
        getNestedProperty(mcpConfig, 'host') ||
        productData.primary_url,

      dockerImage:
        (mcpConfig?.mcpServers?.[serverName]
          ? getCommandProperty(
              mcpConfig.mcpServers[serverName],
              'dockerImage',
              selectedCommandType,
            )
          : undefined) ||
        (mcpConfig?.servers?.[serverName]
          ? getCommandProperty(
              mcpConfig.servers[serverName],
              'dockerImage',
              selectedCommandType,
            )
          : undefined) ||
        getNestedProperty(mcpConfig, 'dockerImage'),

      uvxPackage:
        (mcpConfig?.mcpServers?.[serverName]
          ? getCommandProperty(
              mcpConfig.mcpServers[serverName],
              'uvxPackage',
              selectedCommandType,
            )
          : undefined) ||
        (mcpConfig?.servers?.[serverName]
          ? getCommandProperty(
              mcpConfig.servers[serverName],
              'uvxPackage',
              selectedCommandType,
            )
          : undefined) ||
        getNestedProperty(mcpConfig, 'uvxPackage'),

      userInputs:
        (mcpConfig?.mcpServers?.[serverName]
          ? getCommandProperty(
              mcpConfig.mcpServers[serverName],
              'userInputs',
              selectedCommandType,
            )
          : undefined) ||
        (mcpConfig?.servers?.[serverName]
          ? getCommandProperty(
              mcpConfig.servers[serverName],
              'userInputs',
              selectedCommandType,
            )
          : undefined) ||
        getNestedProperty(mcpConfig, 'userInputs'),

      // 로컬 상태 초기값
      isInstalled: false,
      isRunning: false,
      installedMethod: undefined,
      installedDir: undefined,
      currentMode: undefined,
    };

    console.log(`[configLoader] 최종 서버 템플릿 생성 완료:`, {
      id: serverTemplate.id,
      name: serverTemplate.name,
      type: serverTemplate.type,
      executionCommand: serverTemplate.execution?.command,
      executionArgs: serverTemplate.execution?.args,
    });

    return serverTemplate;
  } catch (error) {
    console.error(`[configLoader] getBaseMCPServerConfig 오류:`, error);
    return undefined;
  }
}

// 중첩 속성을 안전하게 가져오는 헬퍼 함수
function getNestedProperty(obj: any, propertyName: string): any {
  if (!obj) return undefined;
  return obj[propertyName];
}

// 설정에서 특정 command 타입에 해당하는 속성 가져오기
function getCommandProperty(
  configItem: any,
  propertyName: string,
  commandType: string,
): any {
  if (!configItem) return undefined;

  // 배열인 경우 해당 command 찾기
  if (Array.isArray(configItem)) {
    const matchingConfig = configItem.find(
      (conf: any) => conf.command === commandType,
    );
    return matchingConfig ? matchingConfig[propertyName] : undefined;
  }

  // 객체인 경우 직접 속성 접근
  if (typeof configItem === 'object' && configItem !== null) {
    return configItem[propertyName];
  }

  return undefined;
}

export async function getMergedMCPServerConfig(
  id: string,
  selectedCommand: MCPServerExtended['type'], // 추가
): Promise<MCPServerExtended | undefined> {
  const baseTemplate = await getBaseMCPServerConfig(id, selectedCommand); // 전달

  if (!baseTemplate) {
    return undefined;
  }
  const localState =
    userConfig.mcpServers[id] || ({} as Partial<MCPServerExtended>); // localState가 Partial이어야 함

  // 3. 템플릿과 로컬 상태 병합 (로컬 상태가 템플릿 값을 덮어씀)
  // baseTemplate은 MCPServerExtended의 모든 필드를 가짐 (로컬 상태 관련은 false/undefined)
  // localState는 MCPServerExtended의 일부 필드 (실제 로컬 상태 값)를 가짐
  const mergedConfig: MCPServerExtended = {
    ...baseTemplate, // 기본 템플릿 값들 (isInstalled: false, isRunning: false 등 포함)
    ...localState, // 로컬 상태 값으로 덮어쓰기 (isInstalled: true 등)
  };
  return mergedConfig;
}

// --- 로컬 "상태" 업데이트 함수 (userServers.json에 저장) ---
export function updateServerInstallStatus(
  id: string,
  updates: Partial<
    Pick<
      MCPServerExtended,
      | 'isInstalled'
      | 'installedDir'
      | 'isRunning'
      | 'currentMode'
      | 'installedMethod' /* 기타 로컬 상태 필드들 */
    >
  >,
): void {
  if (!userConfig.mcpServers[id]) {
    userConfig.mcpServers[id] = {} as Partial<MCPServerExtended>; // userConfig.mcpServers의 값은 Partial이 맞음
  }

  // 제공된 업데이트만 기존 상태에 병합
  Object.assign(userConfig.mcpServers[id]!, updates); // non-null assertion, 위에서 할당했으므로

  try {
    // userServers.json 파일 쓰기 전에 폴더 존재 여부 다시 한번 확인 (첫 실행 등 대비)
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }
    fs.writeFileSync(
      userConfigPath,
      JSON.stringify(userConfig, null, 2),
      'utf8',
    );
    console.log(`[configLoader] userServers.json 업데이트 완료 (ID: ${id})`);
  } catch (err) {
    console.error(
      `[configLoader] userServers.json 저장 실패 (ID: ${id}):`,
      err,
    );
  }
}

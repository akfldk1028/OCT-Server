import { MCPServerExtended } from '../types/server-config';
import { BaseMCPServer, ServerStatus } from './severManager';
import { manager } from './managerInstance';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 서버 인스턴스를 생성하는 팩토리 클래스
 * ServerInstaller, 서버 설정 로더 등에서 사용하여 BaseMCPServer 인스턴스를 생성합니다.
 */
export class ServerInstanceFactory {
  /**
   * MCPServerExtended 설정 객체를 기반으로 BaseMCPServer 인스턴스를 생성합니다.
   * 
   * @param serverName 서버 이름
   * @param config 서버 설정 객체
   * @returns BaseMCPServer 타입의 서버 인스턴스
   */
  public static createInstance(serverName: string, config: MCPServerExtended): BaseMCPServer {
    console.log(`🏭 [ServerInstanceFactory] '${serverName}' 서버 인스턴스 생성 중...`);
    
    const serverInstance: BaseMCPServer = {
      name: serverName,
      displayName: config.name || serverName,
      serverType: config.server_type || config.type || 'mcp',
      status: 'stopped',
      config: { ...config },

      start: async function() {
        console.log(`🔄 [ServerInstance/${this.name}] 시작 요청 받음`);
        if (this.status !== 'running') {
          try {
            const success = await manager.callMcpApi(this.config, this.name);
            if (success) {
              this.status = 'running';
              manager.updateServerStatus(this.name, 'running');
              console.log(`✅ [ServerInstance/${this.name}] 성공적으로 시작됨.`);
            } else {
              this.status = 'error';
              manager.updateServerStatus(this.name, 'error');
              console.error(`❌ [ServerInstance/${this.name}] 시작 실패.`);
            }
          } catch (err) {
            this.status = 'error';
            manager.updateServerStatus(this.name, 'error');
            console.error(`❌ [ServerInstance/${this.name}] 시작 중 오류:`, err);
          }
        } else {
          console.log(`⚠️ [ServerInstance/${this.name}] 이미 실행 중입니다.`);
        }
      },

      stop: async function() {
        console.log(`🔄 [ServerInstance/${this.name}] 중지 요청 받음`);
        if (this.status === 'running') {
          try {
            await manager.stopServer(this.name);
            this.status = 'stopped';
            console.log(`✅ [ServerInstance/${this.name}] 성공적으로 중지됨.`);
          } catch (err) {
            this.status = manager.getServer(this.name)?.status || 'error';
            console.error(`❌ [ServerInstance/${this.name}] 중지 중 오류:`, err);
          }
        } else {
          console.log(`⚠️ [ServerInstance/${this.name}] 실행 중이 아닙니다.`);
        }
      },

      checkStatus: async function(): Promise<ServerStatus> {
        const serverStatus = await manager.getServerStatus(this.name);
        if (serverStatus) {
          return serverStatus;
        }
        return {
          name: this.name,
          displayName: this.displayName,
          serverType: this.serverType,
          online: this.status === 'running',
          status: this.status,
          pingMs: this.status === 'running' ? 0 : undefined,
        };
      },
    };

    console.log(`✅ [ServerInstanceFactory] '${serverName}' 서버 인스턴스 생성 완료`);
    return serverInstance;
  }

  /**
   * 생성된 서버 인스턴스를 ServerManager에 등록합니다.
   * 
   * @param serverInstance 등록할 서버 인스턴스
   * @returns 등록 성공 여부
   */
  public static registerInstance(serverInstance: BaseMCPServer): boolean {
    try {
      manager.addServer(serverInstance);
      console.log(`📦 [ServerInstanceFactory] '${serverInstance.name}' 인스턴스가 ServerManager에 등록됨`);
      return true;
    } catch (e) {
      console.error(`❌ [ServerInstanceFactory] '${serverInstance.name}' 인스턴스 등록 실패:`, e);
      return false;
    }
  }

  /**
   * 서버 설정을 기반으로 인스턴스를 생성하고 바로 ServerManager에 등록합니다.
   * 
   * @param serverName 서버 이름
   * @param config 서버 설정 객체 
   * @returns 생성 및 등록 성공 여부
   */
  public static createAndRegister(serverName: string, config: MCPServerExtended): boolean {
    try {
      const instance = this.createInstance(serverName, config);
      return this.registerInstance(instance);
    } catch (e) {
      console.error(`❌ [ServerInstanceFactory] '${serverName}' 인스턴스 생성 및 등록 실패:`, e);
      return false;
    }
  }

  /**
   * 지정된 디렉토리 내의 모든 서버 설정 JSON 파일을 찾아 서버 인스턴스를 로드합니다.
   * 
   * @param appDataPath 앱 데이터 경로
   * @returns 로드된 서버 인스턴스 수
   */
  public static loadServerConfigs(appDataPath: string): number {
    console.log(`🔍 [ServerInstanceFactory] 서버 설정 로드 시작 (경로: ${appDataPath})`);
    
    // servers 디렉토리 경로
    const serversDir = path.join(appDataPath, 'servers');
    
    if (!fs.existsSync(serversDir)) {
      console.log(`⚠️ [ServerInstanceFactory] 서버 디렉토리가 존재하지 않습니다: ${serversDir}`);
      return 0;
    }
    
    // 등록된 서버 수를 추적하는 카운터
    let loadedCount = 0;
    
    try {
      // 모든 서버 디렉토리 목록 가져오기
      const serverDirs = fs.readdirSync(serversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log(`🔎 [ServerInstanceFactory] 발견된 서버 디렉토리: ${serverDirs.length}개`);
      
      // 각 서버 디렉토리 처리
      for (const serverName of serverDirs) {
        const serverDir = path.join(serversDir, serverName);
        
        // 설정 파일 찾기 - 우선순위: {서버명}_config.json, 그 다음 메타 파일들
        const configFileName = `${serverName}_config.json`;
        const configFilePath = path.join(serverDir, configFileName);
        
        // 모든 가능한 설정 파일 목록 (우선순위 순서)
        const potentialConfigFiles = [
          configFilePath, // {서버명}_config.json이 최우선
          path.join(serverDir, 'meta.json'),
          path.join(serverDir, 'git-meta.json'),
          path.join(serverDir, 'docker-meta.json'), 
          path.join(serverDir, 'npm-meta.json'),
          path.join(serverDir, 'npx-meta.json'),
          path.join(serverDir, 'uv-meta.json'),
          path.join(serverDir, 'uvx-meta.json'),
          path.join(serverDir, 'local-meta.json')
        ];
        
        // 존재하는 첫 번째 설정 파일을 사용
        for (const filePath of potentialConfigFiles) {
          if (fs.existsSync(filePath)) {
            try {
              console.log(`📄 [ServerInstanceFactory] 설정 파일 발견: ${filePath}`);
              
              // JSON 파일 로드
              const configContent = fs.readFileSync(filePath, 'utf8');
              const config = JSON.parse(configContent) as MCPServerExtended;
              
              // 서버 인스턴스 생성 및 등록
              console.log(`🏭 [ServerInstanceFactory] 서버 ${serverName} 인스턴스 생성 중...`);
              const instance = this.createInstance(serverName, config);
              manager.addServer(instance);
              console.log(`✅ [ServerInstanceFactory] 서버 ${serverName} 로드 완료`);
              loadedCount++;
              break; // 첫 번째 발견된 설정 파일로 처리 후 다음 서버로
            } catch (error) {
              console.error(`❌ [ServerInstanceFactory] ${serverName} 설정 로드 오류 (${path.basename(filePath)}):`, error);
              // 계속 다음 파일 시도
            }
          }
        }
      }
      
      console.log(`✅ [ServerInstanceFactory] 서버 설정 로드 완료. 총 ${loadedCount}개 서버 로드됨.`);
      return loadedCount;
    } catch (error) {
      console.error(`❌ [ServerInstanceFactory] 서버 설정 로드 중 오류:`, error);
      return loadedCount;
    }
  }
}
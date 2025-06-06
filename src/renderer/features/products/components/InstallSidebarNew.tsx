// renderer/features/products/components/InstallSidebarNew.tsx
import React, { useState, useEffect } from 'react'
import { CopyIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../../../common/components/ui/sheet'
import { Button } from '../../../common/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../../../common/components/ui/tabs'
import { Input } from '../../../common/components/ui/input'
import { Label } from '../../../common/components/ui/label'
import { Tables } from '../../../database.types'
import { useStore, useDispatch } from '../../../hooks/useStore'
import { MCPServerDetailView } from "../types/MCPServerDetailTypes"
import { useOutletContext } from 'react-router'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../database.types'
import { checkUserServerInstallStatus, getUserServerAllInstallRecords } from '../queries'


interface InstallSidebarProps {
  product: MCPServerDetailView
  onClose: () => void
  isOpen: boolean
}

// 🔥 새로운 훅 - installer store 사용
function useInstaller(serverName: string) {
  const store = useStore();
  const installer = store.installer;

  // 현재 서버의 설치 진행 상태
  const progress = installer?.installProgress?.[serverName] || null;

  // 사용 가능한 설치 방법
  const availableMethods = installer?.availableMethods || {};

  // 설치된 서버 정보
  const installedServer = installer?.installedServers?.[serverName] || null;

  // 🐛 디버깅 로그
  useEffect(() => {
    console.log(`🔍 [useInstaller] '${serverName}' 상태 업데이트:`, {
      '📊 progress': progress,
      '🛠️ availableMethods': availableMethods,
      '✅ installedServer': installedServer,
      '⚡ isInstalling': progress && progress.percent < 100 && progress.percent > 0
    });
  }, [progress, availableMethods, installedServer, serverName]);

  return {
    progress,
    availableMethods,
    installedServer,
    isInstalling: progress && progress.percent < 100 && progress.percent > 0,
  };
}

export function InstallSidebarNew({
  product,
  onClose,
  isOpen,
}: InstallSidebarProps) {
  const dispatch = useDispatch();

  // 🔥 Outlet context에서 사용자 정보 가져오기
  const { userId, product: contextProduct } = useOutletContext<{
    product: MCPServerDetailView;
    isLoggedIn: boolean;
    name: string;
    userId: string;
    username: string;
    avatar: string | null;
    email: string;
  }>();

  console.log('🎭 [InstallSidebarNew] 렌더링 시작:', {
    '📦 product.name': product.name,
    '🆔 product.id': product.id,
    '🎪 isOpen': isOpen,
    '👤 userId': userId,
    '👤 userId 타입': typeof userId,
    '👤 userId 길이': userId?.length,
    '🔍 product': product
  });

  // 🔥 MCPServerDetailView에서는 install_methods 사용
  const installMethods = product.install_methods
  if (!installMethods || !Array.isArray(installMethods) || installMethods.length === 0) {
    console.log('⚠️ [InstallSidebarNew] install_methods가 없음');
    return null;
  }

  // 🔥 is_zero_install 체크 및 설치 방법 전처리
  const processedMethods: any[] = []
  
  installMethods.forEach((method) => {
    console.log('🔍 [processedMethods] 설치 방법 처리 중:', method);
    
    // 🚀 Zero-install 우선 처리
    if (method.is_zero_install) {
      console.log('⚡ [processedMethods] Zero-install 방법 발견:', method);
      processedMethods.unshift(method); // 맨 앞에 추가
      return;
    }
    
    // 🔨 Multi-command 처리 (예: Docker build)
    if (method.is_multi_command && method.multi_command) {
      console.log('🔧 [processedMethods] Multi-command 처리:', method.multi_command);
      const multiCmd = method.multi_command;
      
      if (multiCmd.commands && Array.isArray(multiCmd.commands)) {
        multiCmd.commands.forEach((cmd: any) => {
          processedMethods.push({
            ...method,
            command: cmd.command,
            args: cmd.args,
            env: multiCmd.env || method.env || {}
          });
        });
      }
    }
    // 🎯 일반 단일 명령어 처리
    else if (method.command) {
      processedMethods.push(method);
    }
    // 🚀 Zero-install 서버는 command가 없어도 처리
    else if (method.is_zero_install) {
      console.log('⚡ [processedMethods] Zero-install 서버 (command 없음):', method);
      processedMethods.push(method);
    }
    // 📝 명령어가 없는 경우 로그만 출력
    else {
      console.log('⚠️ [processedMethods] 명령어가 없는 설치 방법:', method);
    }
  });

  console.log('📋 [processedMethods] 처리된 설치 방법들:', processedMethods);

  if (processedMethods.length === 0) {
    console.log('🚫 [InstallSidebarNew] 처리 가능한 설치 방법이 없음');
    return null;
  }

  // 🔥 npx 우선순위 설정 - npx가 있으면 맨 앞으로
  const sortedMethods = [...processedMethods].sort((a, b) => {
    // Zero-install이 최우선
    if (a.is_zero_install && !b.is_zero_install) return -1;
    if (!a.is_zero_install && b.is_zero_install) return 1;
    
    // npx가 두 번째 우선순위
    if (a.command === 'npx' && b.command !== 'npx') return -1;
    if (a.command !== 'npx' && b.command === 'npx') return 1;
    
    return 0;
  });

  console.log('🎯 [sortedMethods] 우선순위 정렬된 설치 방법들:', sortedMethods.map(m => `${m.command}${m.is_zero_install ? ' (zero-install)' : ''}`));

  // 🔥 명령어별로 그룹화 (Zero-install의 경우 command가 null일 수 있음)
  const commandGroups: Record<string, any[]> = {}
  sortedMethods.forEach((method) => {
    // 🚀 Zero-install 서버는 command가 null이어도 'zero-install' 그룹으로 처리
    let groupKey = method.command;
    if (method.is_zero_install && !groupKey) {
      groupKey = 'zero-install';
    }
    
    if (groupKey) {
      if (!commandGroups[groupKey]) {
        commandGroups[groupKey] = []
      }
      commandGroups[groupKey].push(method)
      console.log(`📝 [commandGroups] '${groupKey}' 그룹에 추가:`, method);
    } else {
      console.log('⚠️ [commandGroups] 그룹화 불가능한 방법:', method);
    }
  })

  console.log('📋 [InstallSidebarNew] 명령어 그룹:', Object.keys(commandGroups));

  // commandGroups가 비어있는지 확인
  if (Object.keys(commandGroups).length === 0) {
    console.log('🚫 [InstallSidebarNew] commandGroups가 비어있음');
    return null;
  }

  // 모든 명령어 옵션을 한 배열로 평탄화
  const allOpts = Object.values(commandGroups).flat()
  console.log('🔧 [InstallSidebarNew] 모든 옵션들:', allOpts);

  // 명령어 종류별로 탭 생성 (docker, uvx, python 등)
  const commands = Object.keys(commandGroups)

  console.log('🎯 [InstallSidebarNew] 사용 가능한 명령어들:', commands);

  if (commands.length === 0) {
    console.log('🚨 [InstallSidebarNew] 사용 가능한 명령어가 없음');
    return null;
  }

  const [activeCommand, setActiveCommand] = useState(commands[0])
  console.log(`🎪 [InstallSidebarNew] 활성 명령어: ${activeCommand}`);

  // 환경 변수를 저장할 상태
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({})
  const [envErrors, setEnvErrors] = useState<Record<string, string[]>>({})

  // 🔥 Store에서 설치 상태 가져오기
  const serverId = String(product.id ?? '')
  const { progress, availableMethods, installedServer, isInstalling } = useInstaller(serverId);

  console.log(`🎮 [InstallSidebarNew] Store 상태 for '${serverId}':`, {
    '📈 progress': progress,
    '🛠️ availableMethods': availableMethods,
    '✅ installedServer': installedServer,
    '⚡ isInstalling': isInstalling
  });

  // 🔥 DB 기반 설치 상태 확인
  const [dbInstallStatus, setDbInstallStatus] = useState<any[]>([]);
  const [isCheckingDb, setIsCheckingDb] = useState(true);

  // DB에서 설치 상태 확인 함수
  const checkDbInstallStatus = async () => {
    if (!userId || !product.id) {
      setIsCheckingDb(false);
      return;
    }

    try {
      setIsCheckingDb(true);
      console.log('🔍 [checkDbInstallStatus] DB 설치 상태 확인 시작:', {
        userId,
        productId: product.id
      });

      // Supabase 클라이언트 생성
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ [checkDbInstallStatus] Supabase 환경변수 없음');
        return;
      }

      const client = createClient<Database>(supabaseUrl, supabaseAnonKey);
      
      // 🔥 먼저 모든 기록 확인 (디버깅용)
      const allRecords = await getUserServerAllInstallRecords(client, {
        profile_id: userId,
        original_server_id: product.id
      });

      // 성공한 설치만 가져오기
      const installStatus = await checkUserServerInstallStatus(client, {
        profile_id: userId,
        original_server_id: product.id
      });

      console.log('📋 [checkDbInstallStatus] DB 설치 상태 결과:', {
        '🔢 성공한 설치': installStatus.length,
        '🔢 전체 기록': allRecords.length,
        '📊 성공한 설치 상세': installStatus,
        '📊 전체 기록 상세': allRecords,
        '👤 userId': userId,
        '🆔 productId': product.id
      });
      
      setDbInstallStatus(installStatus);

    } catch (error) {
      console.error('❌ [checkDbInstallStatus] DB 설치 상태 확인 실패:', error);
      setDbInstallStatus([]);
    } finally {
      setIsCheckingDb(false);
    }
  };

  // 컴포넌트 마운트 시 DB 상태 확인
  useEffect(() => {
    checkDbInstallStatus();
  }, [userId, product.id]);

  // 🔥 실제 설치 상태 결정 (DB 우선, Store는 보조)
  const isActuallyInstalled = dbInstallStatus.length > 0 || installedServer;
  const actualInstallMethods = dbInstallStatus.map(record => ({
    id: record.install_method_id,
    command: record.mcp_install_methods?.command,
    is_zero_install: record.mcp_install_methods?.is_zero_install,
    install_completed_at: record.install_completed_at
  }));

  console.log('🎯 [InstallSidebarNew] 실제 설치 상태:', {
    '🔍 isCheckingDb': isCheckingDb,
    '📊 dbInstallStatus.length': dbInstallStatus.length,
    '✅ installedServer': !!installedServer,
    '🎯 isActuallyInstalled': isActuallyInstalled,
    '📋 actualInstallMethods': actualInstallMethods
  });

  // 🔥 설치 상태 메시지 생성 (DB 기반)
  const getInstallStatusMessage = () => {
    // DB에서 확인 중
    if (isCheckingDb) {
      return '🔍 설치 상태 확인 중...';
    }

    // DB에서 설치 상태 확인됨
    if (dbInstallStatus.length > 0) {
      const methods = actualInstallMethods.map(m => m.command || 'unknown').join(', ');
      const message = `✅ 설치 완료 (${methods}) - ${dbInstallStatus.length}개 방법`;
      console.log(`🎉 [getInstallStatusMessage] DB 기반: ${message}`);
      return message;
    }

    // Store 기반 상태 (새로 설치 중인 경우)
    if (installedServer && !dbInstallStatus.length) {
      const message = `✅ 설치 완료 (${installedServer.installMethod}) - 동기화 대기 중`;
      console.log(`🎉 [getInstallStatusMessage] Store 기반: ${message}`);
      return message;
    }

    if (progress) {
      if (progress.error) {
        const message = `❌ 설치 실패: ${progress.error}`;
        console.log(`💥 [getInstallStatusMessage] ${message}`);
        return message;
      }

      if (progress.percent === 100) {
        const message = `✅ ${progress.status}`;
        console.log(`🏁 [getInstallStatusMessage] ${message}`);
        return message;
      }

      const message = `${progress.status} (${progress.percent}%) - ${progress.currentStep || ''}`;
      console.log(`⏳ [getInstallStatusMessage] ${message}`);
      return message;
    }

    return ''
  }

  // 🔥 사용 가능한 설치 방법 확인 - 한 번만 실행
  useEffect(() => {
    // 이미 설치 방법이 확인되었으면 다시 확인하지 않음
    if (Object.keys(availableMethods).length > 0) {
      console.log('✅ [checkMethods] 이미 설치 방법이 확인됨:', availableMethods);
      return;
    }

    // 컴포넌트 마운트 시 사용 가능한 설치 방법 확인
    const checkMethods = async () => {
      console.log('🔍 [checkMethods] 사용 가능한 설치 방법 확인 시작...');
      dispatch({
        type: 'installer.checkAvailableMethods',
        payload: {}
      });
      console.log('📤 [checkMethods] checkAvailableMethods 액션 dispatch 완료');
    };
    checkMethods();
  }, []); // 의존성 배열을 빈 배열로 변경

  // 액티브 명령어가 변경될 때 해당 명령어의 환경 변수 초기화
  useEffect(() => {
    console.log(`🔄 [activeCommand 변경] ${activeCommand}로 변경됨`);
    
    // 현재 명령어의 옵션들 찾기
    const activeOpts = allOpts.filter(
      (o) => o.command === activeCommand && Array.isArray(o.args)
    )

    console.log(`🎯 [activeCommand] '${activeCommand}'의 옵션들:`, activeOpts);

    // 초기 환경 변수 상태 설정
    if (activeOpts.length > 0 && activeOpts[0].env) {
      // 현재 상태에 이미 값이 있는지 확인
      const currentEnvValues = envValues[activeCommand] || {}

      // 환경 변수 템플릿으로부터 필드 생성
      const envTemplate = { ...activeOpts[0].env }
      console.log(`🌍 [환경변수] '${activeCommand}' 템플릿:`, envTemplate);

      // 새 환경 변수 객체 생성 (기존 값 유지)
      const newEnvValues = { ...currentEnvValues }

      // 템플릿의 모든 키에 대해 값이 없으면 템플릿 값으로 설정
      Object.keys(envTemplate).forEach(key => {
        if (!newEnvValues[key]) {
          newEnvValues[key] = envTemplate[key]
          console.log(`🔧 [환경변수] '${key}' 기본값 설정: ${envTemplate[key]}`);
        }
      })

      // 상태 업데이트
      setEnvValues(prev => ({
        ...prev,
        [activeCommand]: newEnvValues
      }))

      console.log(`💾 [환경변수] '${activeCommand}' 환경변수 상태 업데이트:`, newEnvValues);

      // 필수 필드 확인
      validateEnvValues(activeCommand, newEnvValues)
    }
  }, [activeCommand])

  // 환경 변수 유효성 검사 함수
  const validateEnvValues = (command: string, values: Record<string, string>) => {
    console.log(`🔍 [validateEnvValues] '${command}' 유효성 검사 시작:`, values);
    
    const errors: string[] = []

    // 현재 명령어의 옵션들 찾기
    const opts = allOpts.filter(
      (o) => o.command === command && Array.isArray(o.args)
    )

    if (opts.length > 0 && opts[0].env) {
      const envTemplate = opts[0].env

      // 모든 환경 변수가 채워졌는지 확인
      Object.keys(envTemplate).forEach(key => {
        const value = values[key]
        if (!value || value.includes('YOUR_') || value.includes('<YOUR_')) {
          errors.push(key)
          console.log(`❌ [validateEnvValues] '${key}' 값이 유효하지 않음: ${value}`);
        } else {
          console.log(`✅ [validateEnvValues] '${key}' 값이 유효함`);
        }
      })
    }

    setEnvErrors(prev => ({
      ...prev,
      [command]: errors
    }))

    const isValid = errors.length === 0;
    console.log(`🎯 [validateEnvValues] '${command}' 유효성 검사 결과: ${isValid ? '✅ 통과' : '❌ 실패'} (에러: ${errors.length}개)`);

    return isValid;
  }

  // 환경 변수 입력 핸들러
  const handleEnvChange = (command: string, key: string, value: string) => {
    console.log(`📝 [handleEnvChange] ${command}.${key} = "${value}"`);
    
    setEnvValues(prev => ({
      ...prev,
      [command]: {
        ...(prev[command] || {}),
        [key]: value
      }
    }))

    // 유효성 검사 업데이트
    setTimeout(() => {
      validateEnvValues(command, {
        ...(envValues[command] || {}),
        [key]: value
      })
    }, 0)
  }

  // 클립보드에 복사
  const copyToClipboard = (text: string) => {
    console.log('📋 [copyToClipboard] 클립보드에 복사 중...', text.length, '문자');
    navigator.clipboard.writeText(text);
    console.log('✅ [copyToClipboard] 복사 완료!');
  }

  // 🔥 서버 제거
  const handleUninstall = async (serverId: string) => {
    console.log(`🗑️ [handleUninstall] '${serverId}' 서버 제거 시작...`, { 
      userId, 
      productId: product.id,
      dbInstallStatus: dbInstallStatus.length 
    });

    try {
      const result = await dispatch({
        type: 'installer.uninstallServer',
        payload: {
          serverName: serverId,
          userProfileId: userId // 🔥 사용자 ID 추가
        }
      });

      console.log(`🎉 [handleUninstall] '${serverId}' 서버 제거 요청 완료!`, result);
      
      // 🔥 제거 완료 후 즉시 + 3초 후 DB 상태 새로고침
      console.log('🔄 [handleUninstall] 즉시 DB 상태 새로고침...');
      await checkDbInstallStatus();
      
      setTimeout(async () => {
        console.log('🔄 [handleUninstall] 3초 후 DB 상태 재확인...');
        await checkDbInstallStatus();
      }, 3000);
      
      setTimeout(async () => {
        console.log('🔄 [handleUninstall] 5초 후 DB 상태 재확인...');
        await checkDbInstallStatus();
      }, 5000);
      
    } catch (error) {
      console.error(`💥 [handleUninstall] '${serverId}' 서버 제거 중 오류:`, error);
    }
  };


  // 🔥 서버 설치 시작 (환경 변수 포함) - dispatch 사용
  const handleInstall = async (serverId: string, command: string) => {
    console.log(`🚀 [handleInstall] '${serverId}' 서버 설치 시작... (command: ${command})`);

    // 🔥 중복 클릭 방지 - 이미 설치 중이거나 DB에서 설치된 것으로 확인되면 무시
    if (isInstalling || isActuallyInstalled) {
      console.log(`⚠️ [handleInstall] 중복 요청 무시:`, {
        isInstalling,
        isActuallyInstalled,
        dbInstallCount: dbInstallStatus.length,
        storeInstalled: !!installedServer
      });
      return;
    }

    // 현재 명령어의 환경 변수 가져오기
    const commandEnvVars = envValues[command] || {}
    console.log(`🌍 [handleInstall] 환경 변수:`, commandEnvVars);

    // 현재 명령어에 해당하는 설치 방법 찾기
    const currentMethods = commandGroups[command] || []
    const currentMethod = currentMethods[0] // 첫 번째 방법 사용
    
    console.log(`🔧 [handleInstall] 현재 명령어의 설치 방법:`, {
      command,
      methodsCount: currentMethods.length,
      currentMethod,
      availableMethods,
      isZeroInstall: currentMethod?.is_zero_install
    });

    try {
      // 🚀 Zero-install 처리 (currentMethod가 없어도 처리)
      const isZeroInstallRequest = currentMethod?.is_zero_install || 
                                   currentMethods.some((m: any) => m.is_zero_install);
      
      if (isZeroInstallRequest) {
        console.log(`⚡ [handleInstall] Zero-install 설치 요청`);
        
        console.log('🚀 [handleInstall] Zero-install dispatch 직전:', {
          '🆔 serverId': serverId,
          '👤 userId': userId,
          '👤 userId 타입': typeof userId,
          '👤 userId 길이': userId?.length,
          '🔧 currentMethod': currentMethod
        });

        await dispatch({
          type: 'installer.installServer',
          payload: {
            serverName: serverId,
            config: {
              is_zero_install: true,
              type: command,
              install_method: command,
              env: commandEnvVars,
              package: product.name,
              source: product.github_url,
              description: product.description,
              command: currentMethod?.command || (command === 'zero-install' ? null : command),
              args: currentMethod?.args || [],
              install_method_id: null, // 🔥 나중에 recordInstallStart에서 설정됨
              ...commandEnvVars
            },
            preferredMethod: command,
            selectedInstallMethod: currentMethod, // 🔥 선택된 설치 방법 전체 정보 추가
            userProfileId: userId // 🔥 사용자 profile_id 추가
          }
        });
      } else {
        // 🔥 일반 설치 요청
        console.log('🚀 [handleInstall] 일반 설치 dispatch 직전:', {
          '🆔 serverId': serverId,
          '👤 userId': userId,
          '👤 userId 타입': typeof userId,
          '👤 userId 길이': userId?.length,
          '🔧 currentMethod': currentMethod
        });

        await dispatch({
          type: 'installer.installServer',
          payload: {
            serverName: serverId,
            config: {
              type: command,
              install_method: command,
              env: commandEnvVars,
              // product에서 추가 정보 가져오기
              package: product.name,
              source: product.github_url || currentMethod?.repository,
              repository: currentMethod?.repository,
              description: product.description,
              command: currentMethod?.command,
              args: currentMethod?.args,
              dockerImage: currentMethod?.dockerImage,
              installCommand: currentMethod?.installCommand,
              version: currentMethod?.version,
              install_method_id: null, // 🔥 나중에 recordInstallStart에서 설정됨
              ...commandEnvVars // 환경 변수 병합
            },
            preferredMethod: command,
            selectedInstallMethod: currentMethod, // 🔥 선택된 설치 방법 전체 정보 추가
            userProfileId: userId // 🔥 사용자 profile_id 추가
          }
        });
      }

      console.log(`🎉 [handleInstall] '${serverId}' 서버 설치 요청 완료! 이제 progress를 지켜보세요~`);
      
      // 🔥 설치 완료 후 DB 상태 새로고침 (3초 후)
      setTimeout(() => {
        console.log('🔄 [handleInstall] 설치 완료 후 DB 상태 새로고침...');
        checkDbInstallStatus();
      }, 3000);
    } catch (error) {
      console.error(`💥 [handleInstall] '${serverId}' 서버 설치 중 오류:`, error);
      
      // 에러 발생 시 progress 업데이트
      dispatch({
        type: 'installer.updateProgress',
        payload: {
          serverName: serverId,
          status: '설치 실패',
          percent: 0,
          currentStep: error instanceof Error ? error.message : '알 수 없는 오류',
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        }
      });
      
      console.log(`📤 [handleInstall] 에러 상태 dispatch 완료`);
    }
  };

  const capitalize = (s: string) => {
    if (s === 'zero-install') {
      return 'Zero-Install';
    }
    const result = s.charAt(0).toUpperCase() + s.slice(1);
    console.log(`✨ [capitalize] "${s}" → "${result}"`);
    return result;
  }

  // 🔥 설치 버튼 활성화 여부 확인
  const isInstallButtonEnabled = (command: string) => {
    const errors = envErrors[command] || []
    const methodAvailable = availableMethods[command] !== false

    // 🚀 Zero-install 서버는 항상 설치 가능 (시스템 도구 불필요)
    const currentMethods = commandGroups[command] || []
    const isZeroInstall = currentMethods.some((method: any) => method.is_zero_install)

    const enabled = (isZeroInstall || (errors.length === 0 && methodAvailable)) && !isInstalling;
    console.log(`🎛️ [isInstallButtonEnabled] '${command}' 버튼 활성화:`, {
      '❌ errors': errors.length,
      '⚡ isInstalling': isInstalling,
      '🛠️ methodAvailable': methodAvailable,
      '⚡ isZeroInstall': isZeroInstall,
      '🎯 enabled': enabled
    });

    return enabled;
  }

  

  const installStatusMessage = getInstallStatusMessage()
  console.log(`📢 [InstallSidebarNew] 최종 상태 메시지: "${installStatusMessage}"`);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Installation Options</SheetTitle>
          <SheetDescription>
            명령어별 탭을 선택해 JSON args와 설명을 확인하세요.
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeCommand}
          onValueChange={setActiveCommand}
          className="mt-4"
        >
          <TabsList>
            {commands.map((cmd) => {
              const hasZeroInstall = commandGroups[cmd]?.some(method => method.is_zero_install);
              return (
                <TabsTrigger key={cmd} value={cmd}>
                  {capitalize(cmd)}
                  {hasZeroInstall && (
                    <span className="ml-1 text-xs text-green-600">⚡</span>
                  )}
                  {availableMethods[cmd] === false && (
                    <span className="ml-1 text-xs text-red-500">✗</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {commands.map((cmd) => {
            // 🔥 해당 명령어의 옵션들 필터링 (Zero-install 그룹 특별 처리)
            const opts = cmd === 'zero-install' 
              ? commandGroups[cmd] || [] // zero-install 그룹에서 직접 가져오기
              : allOpts.filter((o) => o.command === cmd)
            
            // JSON으로 보여줄 배열 (args, command만) - args가 없어도 표시
            const display = opts.map(({ command, args, is_zero_install }) => {
              if (is_zero_install) {
                return {
                  type: 'zero-install',
                  description: 'No installation required',
                  command: command || null,
                  args: args || []
                };
              }
              return {
                command, 
                args: args || [] // args가 없으면 빈 배열
              };
            })
            const jsonString = JSON.stringify(display, null, 2)
            
            // 설명: 첫 옵션의 description (있으면)
            const description = opts[0]?.description || ''
            // 환경 변수
            const env = opts[0]?.env || {}
            const hasEnvVars = Object.keys(env).length > 0
            // 현재 명령어의 저장된 환경 변수 값
            const commandEnvValues = envValues[cmd] || {}
            // 환경 변수 오류
            const commandErrors = envErrors[cmd] || []

            // 🚀 Zero-install 서버인지 확인
            const isZeroInstall = opts.some((opt: any) => opt.is_zero_install);
            
            console.log(`🔍 [TabContent] '${cmd}' 탭 정보:`, {
              '📊 opts.length': opts.length,
              '⚡ isZeroInstall': isZeroInstall,
              '🛠️ hasEnvVars': hasEnvVars,
              '✅ installedServer': installedServer,
              '⚡ isInstalling': isInstalling,
              '📋 opts': opts
            });

            return (
              <TabsContent key={cmd} value={cmd}>
                {description && (
                  <p className="mb-2 font-medium">{description}</p>
                )}

                {/* 🚀 Zero-install 안내 메시지 */}
                {isZeroInstall && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">⚡</span>
                      <span className="text-green-700 font-medium">Zero-Install Server</span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      이 서버는 별도 설치 없이 바로 사용할 수 있습니다. Install 버튼을 클릭하면 설정이 저장되고 Registry에 등록됩니다.
                    </p>
                  </div>
                )}

                <div className="relative bg-black text-white rounded-md p-4 font-mono text-sm overflow-y-auto overflow-x-hidden h-40">
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(jsonString)}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                  <pre className="whitespace-pre-wrap break-words">
                    {jsonString}
                  </pre>
                </div>

                {hasEnvVars && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-lg font-medium">환경 변수 설정</h3>

                    <div className="grid gap-4">
                      {Object.entries(env).map(([key, defaultValue]) => (
                        <div key={key} className="grid gap-2">
                          <Label htmlFor={`env-${cmd}-${key}`} className="font-medium">
                            {key}
                          </Label>
                          <Input
                            id={`env-${cmd}-${key}`}
                            value={commandEnvValues[key] || String(defaultValue)}
                            onChange={(e) => handleEnvChange(cmd, key, e.target.value)}
                            className={
                              commandErrors.includes(key)
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }
                            placeholder={`Enter your ${key}`}
                            disabled={isInstalling}
                          />
                          {commandErrors.includes(key) && (
                            <p className="text-sm text-red-500">
                              유효한 값을 입력해주세요
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🔥 Store 기반 설치 상태 표시 */}
                {installStatusMessage && (
                  <div className={`mt-4 p-3 rounded-md ${
                    installStatusMessage.includes('✅')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : installStatusMessage.includes('❌')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {installStatusMessage}
                  </div>
                )}

                {/* 🔥 진행 상태 상세 정보 */}
                {progress && progress.percent > 0 && progress.percent < 100 && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  {/* 🔥 Zero-install 서버는 opts가 없어도 버튼 표시 */}
                  {(opts.length > 0 || isZeroInstall) && (
                    <>
                      {/* 설치 버튼 - DB에서 설치되지 않았을 때만 표시 */}
                      {!isActuallyInstalled && !isCheckingDb && (
                        <Button
                          onClick={() => handleInstall(serverId, cmd)}
                          disabled={!isInstallButtonEnabled(cmd) || isInstalling}
                          className="text-white text-lg font-bold px-8 py-3 rounded shadow-lg transition-all duration-150"
                          style={{ minWidth: 150 }}
                        >
                          {isInstalling ? 'Installing...' : 'Install'}
                        </Button>
                      )}

                      {/* DB 확인 중 표시 */}
                      {isCheckingDb && (
                        <Button
                          disabled
                          className="text-gray-500 bg-gray-100 border-gray-300 text-lg font-bold px-8 py-3 rounded shadow-lg"
                          style={{ minWidth: 150 }}
                        >
                          🔍 Checking...
                        </Button>
                      )}

                      {/* 설치 완료 상태 표시 - DB 기반 */}
                      {isActuallyInstalled && !isInstalling && !isCheckingDb && (
                        <Button
                          disabled
                          className="text-green-700 bg-green-100 border-green-300 text-lg font-bold px-8 py-3 rounded shadow-lg"
                          style={{ minWidth: 150 }}
                        >
                          ✅ Installed ({dbInstallStatus.length > 0 ? dbInstallStatus.length : 1})
                        </Button>
                      )}

                      {/* 제거 버튼 - DB에서 설치되었을 때만 표시 */}
                      {isActuallyInstalled && !isCheckingDb && (
                        <Button
                          onClick={() => handleUninstall(serverId)}
                          disabled={isInstalling || (progress && progress.status.includes('제거'))}
                          variant="destructive"
                          className="text-white text-lg font-bold px-8 py-3 rounded shadow-lg transition-all duration-150"
                          style={{ minWidth: 150 }}
                        >
                          {progress && progress.status.includes('제거') ? 'Removing...' : 'Uninstall'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

      </SheetContent>
    </Sheet>
  )
}

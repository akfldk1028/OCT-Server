// OCT\src\renderer\features\products\components\InstallSidebar.tsx
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
import { installServer } from '../mutations'

type mcp_servers_full_view = Tables<'mcp_servers_full_view'>

interface InstallSidebarProps {
  product: mcp_servers_full_view
  onClose: () => void
  isOpen: boolean
}

export function InstallSidebar({
  product,
  onClose,
  isOpen,
}: InstallSidebarProps) {
  // mcp_config에서 명령어 추출
  const raw = product.mcp_config
  if (!raw) return null

  let serversMap: Record<string, any[]>
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      serversMap = parsed.servers || parsed.mcpServers || {}
    } catch {
      return null
    }
  } else {
    serversMap = (raw as any).servers || (raw as any).mcpServers || {}
  }

  // serversMap이 비어있는지 확인
  if (Object.keys(serversMap).length === 0) return null

  // 모든 명령어 옵션을 한 배열로 평탄화
  const allOpts = Object.values(serversMap).flat()

  // 명령어 종류별로 탭 생성 (docker, uvx, python 등)
  const commands = Array.from(new Set(
    allOpts
      .filter((o) => o.command && Array.isArray(o.args))
      .map((o) => o.command)
  ))

  if (commands.length === 0) return null

  const [activeCommand, setActiveCommand] = useState(commands[0])
  const [processingServer, setProcessingServer] = useState<string | null>(null)
  const [installStatus, setInstallStatus] = useState<string>('')
  
  // 환경 변수를 저장할 상태 추가
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({})
  const [envErrors, setEnvErrors] = useState<Record<string, string[]>>({})

  // 설치 결과 리스너 설정
  useEffect(() => {
    // 결과 및 진행 상황 이벤트 리스너 등록
    const { electron } = window as any;
    
    if (electron?.ipcRenderer) {
      const resultUnsubscribe = electron.ipcRenderer.on('installResult', (result: any) => {
        console.log('설치 결과 수신:', result);
        setProcessingServer(null);
        if (result.success) {
          setInstallStatus(`설치 성공: ${result.message || ''}`);
        } else {
          setInstallStatus(`설치 실패: ${result.error || '알 수 없는 오류'}`);
        }
      });
      
      const progressUnsubscribe = electron.ipcRenderer.on('installProgress', (progress: any) => {
        console.log('설치 진행 상황:', progress);
        setInstallStatus(`설치 중: ${progress.message || ''}`);
      });
      
      // 컴포넌트 언마운트 시 리스너 제거
      return () => {
        resultUnsubscribe && resultUnsubscribe();
        progressUnsubscribe && progressUnsubscribe();
      };
    }
    
    return undefined;
  }, []);

  // 액티브 명령어가 변경될 때 해당 명령어의 환경 변수 초기화
  useEffect(() => {
    // 현재 명령어의 옵션들 찾기
    const activeOpts = allOpts.filter(
      (o) => o.command === activeCommand && Array.isArray(o.args)
    )
    
    // 초기 환경 변수 상태 설정
    if (activeOpts.length > 0 && activeOpts[0].env) {
      // 현재 상태에 이미 값이 있는지 확인
      const currentEnvValues = envValues[activeCommand] || {}
      
      // 환경 변수 템플릿으로부터 필드 생성
      const envTemplate = { ...activeOpts[0].env }
      
      // 새 환경 변수 객체 생성 (기존 값 유지)
      const newEnvValues = { ...currentEnvValues }
      
      // 템플릿의 모든 키에 대해 값이 없으면 템플릿 값으로 설정
      Object.keys(envTemplate).forEach(key => {
        if (!newEnvValues[key]) {
          newEnvValues[key] = envTemplate[key]
        }
      })
      
      // 상태 업데이트
      setEnvValues(prev => ({
        ...prev,
        [activeCommand]: newEnvValues
      }))
      
      // 필수 필드 확인
      validateEnvValues(activeCommand, newEnvValues)
    }
  }, [activeCommand])

  // 환경 변수 유효성 검사 함수
  const validateEnvValues = (command: string, values: Record<string, string>) => {
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
        }
      })
    }
    
    setEnvErrors(prev => ({
      ...prev,
      [command]: errors
    }))
    
    return errors.length === 0
  }

  // 환경 변수 입력 핸들러
  const handleEnvChange = (command: string, key: string, value: string) => {
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
  const copyToClipboard = (text: string) =>
    navigator.clipboard.writeText(text)

  // 서버 설치 시작 (환경 변수 포함)
  const handleInstall = async (serverId: string, command: string) => {
    setProcessingServer(serverId);
    setInstallStatus('설치 시작...');
    console.log(`🔄 '${serverId}' 서버 설치 시작...`);
    
    // 현재 명령어의 환경 변수 가져오기
    const commandEnvVars = envValues[command] || {}
    
    try {
      // 직접 window.api.installServer 함수 호출
      const { api } = window as any;
      
      if (!api || typeof api.installServer !== 'function') {
        throw new Error('API installServer function not available');
      }
      
      // api.installServer 함수 직접 호출
      const result = await api.installServer(serverId, command, commandEnvVars);
      console.log(`'${serverId}' 서버 설치 요청 완료`, result);
      
      // 응답은 installResult 이벤트를 통해 수신됨
    } catch (error) {
      console.error(`'${serverId}' 서버 설치 중 오류:`, error);
      setInstallStatus(`설치 오류: ${String(error)}`);
      setProcessingServer(null);
    }
  };

  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1)

  // 설치 버튼 활성화 여부 확인
  const isInstallButtonEnabled = (command: string) => {
    const errors = envErrors[command] || []
    return errors.length === 0 && processingServer !== String(product.id ?? '')
  }

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
            {commands.map((cmd) => (
              <TabsTrigger key={cmd} value={cmd}>
                {capitalize(cmd)}
              </TabsTrigger>
            ))}
          </TabsList>

          {commands.map((cmd) => {
            // 해당 명령어의 옵션들만 필터링
            const opts = allOpts.filter(
              (o) => o.command === cmd && Array.isArray(o.args)
            )
            // JSON으로 보여줄 배열 (args, command만)
            const display = opts.map(({ command, args }) => ({ command, args }))
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

            return (
              <TabsContent key={cmd} value={cmd}>
                {description && (
                  <p className="mb-2 font-medium">{description}</p>
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

                {installStatus && (
                  <div className={`mt-4 p-3 rounded-md ${
                    installStatus.includes('성공') 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : installStatus.includes('실패') || installStatus.includes('오류')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {installStatus}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  {opts[0] && (
                    <Button
                      onClick={() => handleInstall(String(product.id ?? ''), cmd)}
                      disabled={!isInstallButtonEnabled(cmd)}
                      className="text-white text-lg font-bold px-8 py-3 rounded shadow-lg transition-all duration-150"
                      style={{ minWidth: 200 }}
                    >
                      {processingServer === String(product.id ?? '')
                        ? '설치 중...'
                        : `${capitalize(cmd)} Install`}
                    </Button>
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
// components/Chat/WindowSelector.tsx
// 🎯 순수 Electron API 기반 창 선택 UI 컴포넌트
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Monitor, X, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface WindowInfo {
  id: string;
  name: string;
  thumbnailURL: string;
  appIcon?: string;
  display_id?: string;
}

interface WindowSelectorProps {
  onWindowSelect: (window: WindowInfo) => void;
  onCancel?: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WindowSelector({ 
  onWindowSelect, 
  onCancel, 
  isOpen, 
  onOpenChange 
}: WindowSelectorProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasPermission, setHasPermission] = useState(false);

  // 화면 접근 권한 확인
  const checkPermission = async () => {
    try {
      const access = await window.electron.ipcRenderer.invoke('get-screen-access');
      setHasPermission(access);
      return access;
    } catch (error) {
      console.error('권한 확인 실패:', error);
      return false;
    }
  };

  // 창 목록 새로고침 (순수 Electron desktopCapturer API 사용)
  const refreshWindows = async () => {
    setLoading(true);
    try {
      const permission = await checkPermission();
      if (!permission) {
        setLoading(false);
        return;
      }

      // 🔥 간단한 API 호출: get-all-windows
      const windowList = await window.electron.ipcRenderer.invoke('get-all-windows');
      setWindows(windowList || []);
      
      console.log('✅ [WindowSelector] 창 목록 새로고침 완료:', windowList?.length || 0, '개');
      
    } catch (error) {
      console.error('❌ [WindowSelector] 창 목록 가져오기 실패:', error);
      setWindows([]);
    } finally {
      setLoading(false);
    }
  };

  // 권한 설정 열기
  const openPermissionSettings = async () => {
    try {
      await window.electron.ipcRenderer.invoke('open-screen-security');
      
      // 권한 설정을 열었으니 잠시 후 다시 권한 확인
      setTimeout(async () => {
        await checkPermission();
      }, 1000);
      
    } catch (error) {
      console.error('권한 설정 열기 실패:', error);
    }
  };

  // 다이얼로그가 열릴 때 창 목록 새로고침
  useEffect(() => {
    if (isOpen) {
      refreshWindows();
    }
  }, [isOpen]);

  // 검색 필터링
  const filteredWindows = windows.filter(window =>
    window.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWindowSelect = async (window: WindowInfo) => {
    console.log('🎯 [WindowSelector] 창 선택됨:', window.name);
    
    try {
      // 🔥 선택된 창을 부모 컴포넌트에 전달
      onWindowSelect(window);
      
      // 짧은 딜레이 후 창 닫기 (사용자가 선택을 확인할 수 있도록)
      setTimeout(() => {
        onOpenChange(false);
      }, 200);
      
    } catch (error) {
      console.error('❌ [WindowSelector] 창 선택 처리 실패:', error);
    }
  };

  const handleCancel = () => {
    console.log('⚠️ [WindowSelector] 창 선택 취소됨');
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            🎯 어떤 창에서 도움이 필요하신가요?
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            AI가 분석할 창을 선택해주세요. 선택한 창 옆에 프로그램이 위치합니다.
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* 권한 확인 섹션 */}
          {!hasPermission && (
            <Card className="p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">화면 접근 권한이 필요합니다</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    창별 기능을 사용하려면 화면 기록 권한이 필요합니다.
                  </p>
                </div>
                <Button onClick={openPermissionSettings} variant="outline">
                  권한 설정
                </Button>
              </div>
            </Card>
          )}

          {/* 검색 및 새로고침 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="창 이름으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={refreshWindows}
              disabled={loading}
              variant="outline"
              size="icon"
              title="창 목록 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* 창 목록 */}
          <div className="overflow-y-auto max-h-96">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">창 목록을 가져오는 중...</span>
              </div>
            ) : filteredWindows.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {!hasPermission 
                  ? '화면 접근 권한을 설정한 후 새로고침해주세요'
                  : searchTerm 
                    ? '검색 결과가 없습니다'
                    : '사용 가능한 창이 없습니다. 다른 프로그램을 실행해보세요.'
                }
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredWindows.map((window) => (
                  <Card
                    key={window.id}
                    className="p-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 hover:border-blue-200"
                    onClick={() => handleWindowSelect(window)}
                  >
                    <div className="space-y-2">
                      {/* 윈도우 썸네일 */}
                      <div className="relative">
                        <img
                          src={window.thumbnailURL}
                          alt={window.name}
                          className="w-full h-24 object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        {window.appIcon && (
                          <img
                            src={window.appIcon}
                            alt="App Icon"
                            className="absolute top-1 right-1 w-6 h-6 rounded border bg-white"
                          />
                        )}
                      </div>
                      
                      {/* 윈도우 정보 */}
                      <div>
                        <h3 className="font-medium text-sm text-gray-900 truncate" title={window.name}>
                          {window.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {window.display_id ? `디스플레이 ${window.display_id}` : '기본 디스플레이'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            클릭하여 선택
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* 하단 버튼들 */}
          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm text-gray-500">
              {filteredWindows.length}개 창 표시됨
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline">
                취소
              </Button>
              {hasPermission && filteredWindows.length === 0 && (
                <Button onClick={refreshWindows} variant="default">
                  다시 검색
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
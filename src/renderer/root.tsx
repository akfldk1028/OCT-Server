// Root.tsx
import {
  Outlet,
  useLocation,
  useNavigation,
  isRouteErrorResponse,
  useLoaderData,
  LoaderFunctionArgs,
  useNavigate
} from 'react-router';
import { Settings } from 'luxon';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from './lib/utils';
import useTheme from '@/lib/useTheme';
import Sidebar from './common/components/Sidebar-M';
import { makeSSRClient, supabase } from './supa-client';
import { getUserById } from './features/users/queries';
import {  IS_ELECTRON, IS_WEB } from './utils/environment';
import Navigation from './common/components/navigation';
import {ensureOverlayApi} from './utils/api'
import {ShortcutHandlerMap, shortcutManager, SHORTCUTS} from '@/common/shortcut_action/shortcut'; // 경로는 실제 위치에 맞게 조정
import { useDispatch, useStore } from '@/hooks/useStore';
import ChannelSidebar from './common/components/ChannelSidebar';
import CustomTitleBar from './common/components/CustomTitleBar';
import { DnDProvider } from './features/server/hook/DnDContext';
import { getClients } from './features/server/queries';
import { getUserInstalledServers } from './features/products/queries';
import { getMcpConfigsByServerId } from './features/products/queries';
import { getUserWorkflows, getWorkflowWithDetails } from './features/server/workflow-queries';

// 🔥 WorkflowListModal에서 가져온 분석 함수들
// 타입 정의
type AnalysisResult = {
  clients: string[];
  mcpServers: string[];
  hasClaudeClient: boolean;
  hasOpenAIClient: boolean; 
  hasLocalClient: boolean;
  hasMCPServers: boolean;
  primaryClientType: string | null;
};

// 🎯 메인 분석 함수
const analyzeWorkflowClientType = async (workflow: any, client: any, userId: string): Promise<{ client_type: string; target_clients: string[] }> => {
  try {
    // 1. 워크플로우 데이터 로드
    const workflowDetails = await loadWorkflowDetails(workflow.id, client, userId);
    if (!workflowDetails) {
      return { client_type: 'unknown', target_clients: [] };
    }

    // 2. DFS 기반 노드 분석
    const analysisResult = await analyzeNodesByDFS(workflowDetails);
    if (!analysisResult) {
      return { client_type: 'unknown', target_clients: [] };
    }

    // 3. 최종 클라이언트 타입 결정
    const clientType = determineClientType(analysisResult, workflowDetails);
    
    return { 
      client_type: clientType, 
      target_clients: [...new Set(analysisResult.clients)] 
    };
    
  } catch (error) {
    console.error('❌ 워크플로우 분석 실패:', error);
    return { client_type: 'unknown', target_clients: [] };
  }
};

// 📥 워크플로우 상세 정보 로드
const loadWorkflowDetails = async (workflowId: number, client: any, userId: string) => {
  const workflowDetails = await getWorkflowWithDetails(client as any, {
    workflow_id: workflowId,
    profile_id: userId,
  });
  
  if (!workflowDetails?.nodes || !workflowDetails?.edges) {
    return null;
  }
  
  return workflowDetails;
};

// 🔄 DFS 기반 노드 분석
const analyzeNodesByDFS = async (workflowDetails: any): Promise<AnalysisResult | null> => {
  // 트리거 노드 찾기
  const triggerNode = workflowDetails.nodes.find((node: any) => node.node_type === 'trigger');
  if (!triggerNode) {
    console.log('⚠️ 트리거 노드 없음');
    return null;
  }

  // ReactFlow 형식으로 변환
  const { nodes, edges } = convertToReactFlowFormat(workflowDetails);
  
  // 간단한 DFS 순회 (dfsTraverse 함수 없이)
  const orderedNodes = performSimpleDFS(triggerNode.node_id, nodes, edges);

  // 분석 결과 초기화
  const result: AnalysisResult = {
    clients: [],
    mcpServers: [],
    hasClaudeClient: false,
    hasOpenAIClient: false,
    hasLocalClient: false,
    hasMCPServers: false,
    primaryClientType: null
  };

  // 순서대로 노드 분석
  for (const node of orderedNodes) {
    analyzeNode(node, result);
  }

  return result;
};

// 🔄 ReactFlow 형식 변환
const convertToReactFlowFormat = (workflowDetails: any) => {
  const nodes = workflowDetails.nodes.map((node: any) => ({
    id: node.node_id,
    type: node.node_type,
    data: node.node_config || {},
    mcp_servers: node.mcp_servers,
  }));

  const edges = workflowDetails.edges.map((edge: any) => ({
    id: edge.edge_id,
    source: edge.source_node_id,
    target: edge.target_node_id,
  }));

  return { nodes, edges };
};

// 간단한 DFS 구현
const performSimpleDFS = (startNodeId: string, nodes: any[], edges: any[]): any[] => {
  const visited = new Set<string>();
  const result: any[] = [];
  
  const dfs = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      result.push(node);
      
      // 연결된 노드들 찾기
      const connectedEdges = edges.filter(e => e.source === nodeId);
      for (const edge of connectedEdges) {
        dfs(edge.target);
      }
    }
  };
  
  dfs(startNodeId);
  return result;
};

// 🔍 개별 노드 분석
const analyzeNode = (node: any, result: AnalysisResult) => {
  if (node.type === 'service' || node.type === 'client') {
    analyzeServiceNode(node, result);
  } else if (node.type === 'server') {
    analyzeServerNode(node, result);
  }
};

// 🔧 서비스 노드 분석
const analyzeServiceNode = (node: any, result: AnalysisResult) => {
  const config = node.data?.config || node.data;
  const clientName = config?.name;
  
  if (!clientName) return;

  // 첫 번째 클라이언트가 주요 타겟
  if (!result.primaryClientType) {
    result.clients.push(clientName);
    result.primaryClientType = classifyClientType(clientName);
    
    // 플래그 설정
    if (result.primaryClientType === 'claude_desktop') {
      result.hasClaudeClient = true;
    } else if (result.primaryClientType === 'openai') {
      result.hasOpenAIClient = true;
    } else {
      result.hasLocalClient = true;
    }
  } else if (!result.clients.includes(clientName)) {
    // 추가 클라이언트 수집
    result.clients.push(clientName);
    
    const additionalType = classifyClientType(clientName);
    if (additionalType === 'claude_desktop') result.hasClaudeClient = true;
    else if (additionalType === 'openai') result.hasOpenAIClient = true;
    else result.hasLocalClient = true;
  }
};

// 🖥️ 서버 노드 분석
const analyzeServerNode = (node: any, result: AnalysisResult) => {
  if (node.mcp_servers) {
    result.hasMCPServers = true;
    const serverName = node.mcp_servers.name || `서버 ${node.id}`;
    result.mcpServers.push(serverName);
  }
};

// 🏷️ 클라이언트 타입 분류
const classifyClientType = (clientName: string): string => {
  const name = clientName.toLowerCase();
  
  if (name.includes('claude')) {
    return 'claude_desktop';
  } else if (name.includes('openai') || name.includes('gpt')) {
    return 'openai';
  } else {
    return 'local';
  }
};

// 🎯 최종 클라이언트 타입 결정
const determineClientType = (result: AnalysisResult, workflowDetails: any): string => {
  // 1. 명시적 클라이언트가 있는 경우
  if (result.primaryClientType) {
    return checkMixedType(result) || result.primaryClientType;
  }

  // 2. MCP 서버만 있는 경우
  if (result.hasMCPServers) {
    return analyzeWorkflowMetadata(workflowDetails, result);
  }

  // 3. 분류 기준 부족
  return 'unknown';
};

// 🔀 Mixed 타입 체크
const checkMixedType = (result: AnalysisResult): string | null => {
  const activeTypes = [
    result.hasClaudeClient,
    result.hasOpenAIClient, 
    result.hasLocalClient
  ].filter(Boolean).length;
  
  if (activeTypes > 1) {
    return 'mixed';
  }
  
  return null;
};

// 📝 워크플로우 메타데이터 분석
const analyzeWorkflowMetadata = (workflowDetails: any, result: AnalysisResult): string => {
  const workflowName = workflowDetails.name?.toLowerCase() || '';
  const workflowDesc = workflowDetails.description?.toLowerCase() || '';
  
  const localKeywords = ['local', 'prototype', 'test', '로컬', '테스트', '개발'];
  const hasLocalKeywords = localKeywords.some(keyword => 
    workflowName.includes(keyword) || workflowDesc.includes(keyword)
  );
  
  if (hasLocalKeywords) {
    result.hasLocalClient = true;
    return 'local';
  } else {
    result.hasClaudeClient = true;
    return 'claude_desktop';
  }
};

// loader 함수 정의
export const loader = async ({ request }: LoaderFunctionArgs) => {
  let user = null;
  
  // 🔥 일렉트론 환경에서는 IPC를 통해 세션 정보 가져오기
  if (IS_ELECTRON && typeof window !== 'undefined' && window.electronAPI) {
    try {
      console.log('🔍 [root loader] 일렉트론 환경 - IPC로 세션 정보 요청');
      // IPC를 통해 메인 프로세스에서 세션 정보 가져오기
      const sessionResult = await (window.electronAPI as any).invoke('auth:get-session');
      if (sessionResult.success && sessionResult.user) {
        user = sessionResult.user;
        console.log('🔍 [root loader] 일렉트론 세션 정보 (IPC):', user?.email);
      } else {
        console.log('🔍 [root loader] 일렉트론 세션 없음 (IPC)');
      }
    } catch (error) {
      console.warn('⚠️ [root loader] 일렉트론 세션 정보 가져오기 실패:', error);
    }
  } else {
    // 웹 환경에서는 기존 방식 사용
    const { data } = await supabase.auth.getUser();
    user = data.user;
    console.log('🔍 [root loader] 웹 세션 정보:', user?.email);
  }
  
  if (user && user.id) {
    console.log('🔍 [root loader] 프로필 로드 시작...');
    const [profile] = await Promise.all([getUserById(supabase as any, {id: user.id})]);
    console.log('🔍 [root loader] 프로필 로드 완료:', profile);
    
    // 🔥 서버/클라이언트/워크플로우 데이터 함께 가져오기
    try {
      // 병렬로 데이터 가져오기 (모두 supabase client 사용)
      console.log('🔍 [root loader] 데이터 로드 시작...');

      
      const [clients, installedServers, rawWorkflows] = await Promise.all([
        // 클라이언트 데이터 가져오기
        getClients(supabase as any, { limit: 100 }).then(result => {
          console.log('🔍 [root loader] 클라이언트 데이터:', result?.length || 0, '개');
          return result;
        }).catch(error => {
          console.error('❌ [root loader] 클라이언트 로드 실패:', error);
          return [];
        }),
        
        // 설치된 서버 데이터 가져오기
        getUserInstalledServers(supabase as any, {
          profile_id: user.id,
        }).then(result => {
          console.log('🔍 [root loader] 서버 데이터:', result?.length || 0, '개');
          return result;
        }).catch(error => {
          console.error('❌ [root loader] 서버 로드 실패:', error);
          return [];
        }),
        
        // 🔥 워크플로우 원본 데이터 가져오기 (supabase client 사용)
        getUserWorkflows(supabase as any, {
          profile_id: user.id,
          limit: 100,
        }).then(result => {
          console.log('🔍 [root loader] 워크플로우 원본 데이터:', result?.length || 0, '개');
          console.log('🔍 [root loader] 워크플로우 첫 번째 항목:', result?.[0]);
          return result;
        }).catch(error => {
          console.error('❌ [root loader] 워크플로우 데이터 로드 실패:', error);
          return [];
        })
      ]);
      
      // 🔥 워크플로우 분석 처리 (별도로 처리)
      let workflows: any[] = [];
      try {
        if (rawWorkflows && rawWorkflows.length > 0) {
          console.log('🔍 [root loader] 워크플로우 원본 데이터:', rawWorkflows.length, '개');
          
          // 🔥 WorkflowListModal과 동일한 정교한 분석 로직 사용
          workflows = await Promise.all(
            rawWorkflows.map(async (workflow: any) => {
              try {
                const { client_type, target_clients } = await analyzeWorkflowClientType(workflow, supabase, user.id);
                
                console.log(`🔍 [root loader] 워크플로우 ${workflow.id} 분석 완료:`, {
                  name: workflow.name,
                  client_type,
                  target_clients,
                  hasFlowStructure: !!workflow.flow_structure,
                  nodeCount: workflow.flow_structure?.nodes?.length || 0
                });

                return {
                  ...workflow,
                  description: workflow.description || undefined,
                  status: workflow.status || 'draft',
                  client_type,
                  target_clients
                };
              } catch (error) {
                console.warn(`⚠️ [root loader] 워크플로우 ${workflow.id} 분석 실패:`, error);
                return {
                  ...workflow,
                  description: workflow.description || undefined,
                  status: workflow.status || 'draft',
                  client_type: 'unknown',
                  target_clients: []
                };
              }
            })
          );
        } else {
          console.log('🔍 [root loader] 워크플로우 데이터 없음');
        }
      } catch (error) {
        console.warn('⚠️ [root loader] 워크플로우 분석 실패:', error);
        workflows = rawWorkflows || [];
      }
      
      // 각 서버의 설정들 병렬로 가져오기
      const servers = await Promise.all(
        installedServers.map(async (server) => {
          try {
            const configs = await getMcpConfigsByServerId(supabase as any, {
              original_server_id: server.original_server_id
            });
            
            return {
              ...server,
              mcp_configs: configs
            };
          } catch (configError) {
            console.warn(`⚠️ [root loader] 서버 ${server.original_server_id} 설정 로드 실패:`, configError);
            return {
              ...server,
              mcp_configs: []
            };
          }
        })
      );
      
      console.log('✅ [root loader] 서버+클라이언트+워크플로우 데이터 로드 완료:', {
        servers: servers.length,
        clients: clients.length,
        workflows: workflows.length
      });
      
      return { user, profile, servers, clients, workflows };
      
    } catch (error) {
      console.error('❌ [root loader] 서버/클라이언트/워크플로우 데이터 로드 실패:', error);
      return { user, profile, servers: [], clients: [], workflows: [] };
    }
  }
  
  return { user: null, profile: null, servers: [], clients: [], workflows: [] };
};

// 로더 데이터 타입 정의
type LoaderData = {
  user: { id: string; email: string } | null;
  profile: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  } | null;
  servers: any[];
  clients: any[];
  workflows: any[];
};

// 이 타입은 Route.LoaderArgs를 대체합니다

export function Root() {
  const loaderData = useLoaderData() as LoaderData | undefined;

  const { user: initialUser, profile: initialProfile, servers = [], clients = [], workflows = [] } = loaderData ?? { user: null, profile: null, servers: [], clients: [], workflows: [] };  
  
  // 🔥 로그인 상태 동적 관리
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  
  const { pathname } = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate(); // 훅은 컴포넌트 최상단에서 호출

  const isLoading = navigation.state === 'loading';
  const isLoggedIn = !!user;

  const dispatch = useDispatch();
  const store = useStore();
  
  // 🔥 Auth 세션 업데이트 리스너 (일렉트론 환경에서만)
  useEffect(() => {
    if (!IS_ELECTRON || typeof window === 'undefined' || !window.electronAPI) return;

    console.log('🔥 [Root] Auth 이벤트 리스너 등록');
    
    // 세션 업데이트 리스너
    const removeSessionListener = window.electronAPI.onAuthSessionUpdated(({ user: newUser, session }) => {
      console.log('🔥 [Root] Auth 세션 업데이트 받음:', newUser?.email);
      
      if (newUser) {
        // 사용자 정보 업데이트
        setUser({
          id: newUser.id,
          email: newUser.email
        });
        
        // 프로필 정보 업데이트 (user_metadata에서 가져오기)
        setProfile({
          id: newUser.id,
          name: newUser.user_metadata?.name || newUser.user_metadata?.full_name || '사용자',
          username: newUser.user_metadata?.preferred_username || newUser.user_metadata?.user_name || 'user',
          avatar: newUser.user_metadata?.avatar_url || null
        });
        
        console.log('🔥 [Root] 프로필 정보 업데이트 완료:', {
          name: newUser.user_metadata?.name,
          avatar: newUser.user_metadata?.avatar_url
        });
        
        // 🔥 로그인 성공 시 자동으로 데이터 다시 로드 (더 부드러운 방식)
        console.log('🔥 [Root] 로그인 완료 - 데이터 다시 로드');
        setTimeout(() => {
          // React Router의 revalidate 대신 현재 페이지로 navigate (데이터 다시 로드 트리거)
          navigate('/', { replace: true });
        }, 1000); // 1초 후 재로드 (UI 업데이트를 보여준 후)
      }
    });

    // 🔥 로그아웃 리스너 추가
    const removeLogoutListener = window.electronAPI.onLoggedOut(() => {
      console.log('🔥 [Root] 로그아웃 이벤트 받음 - 사용자 정보 초기화');
      
      // 상태 초기화
      setUser(null);
      setProfile(null);
      
      console.log('🔥 [Root] 로그아웃 완료 - UI 업데이트됨');
    });

    return () => {
      removeSessionListener();
      removeLogoutListener();
    };
  }, []);
  
  // 🔥 선택된 메뉴 상태 관리 (Slack 스타일)
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // 🔥 URL 기반으로 selectedMenu 자동 설정
  useEffect(() => {
    if (pathname.startsWith('/chat')) {
      setSelectedMenu('Chat');
    } else if (pathname.startsWith('/jobs')) {
      setSelectedMenu('Server');
    } else if (pathname.startsWith('/products')) {
      setSelectedMenu('Products');
    } else if (pathname.startsWith('/overlay') || pathname.startsWith('/community')) {
      setSelectedMenu('Community');
    } else if (pathname.startsWith('/teams')) {
      setSelectedMenu('Tools');
    }
  }, [pathname]);

  Settings.defaultLocale = 'ko';
  Settings.defaultZone = 'utc';


  useEffect(() => {
    if (!IS_ELECTRON) return;

    const overlayApi = ensureOverlayApi();

    // 단축키 핸들러 정의
    const handlers: ShortcutHandlerMap = {
      'setGuideWindow': () => {
        overlayApi.sendMessage('set-guide-window');
        navigate('/overlay');
      },
      'resetWindow': () => {
        overlayApi.sendMessage('reset-window');
      }

    };

    // 핸들러 등록 및 초기화
    shortcutManager.registerHandlers(handlers);
    shortcutManager.initialize();

    // 컴포넌트 언마운트 시 정리
    return () => {
      shortcutManager.cleanup();
    };
  }, [navigate]); // navigate가 의존성 배열에 포함되어야 함



  // App.tsx 또는 MainLayout.tsx
  useEffect(() => {
    dispatch({
      type: 'open_router.initialize',
      payload: {
        endpoint: 'http://127.0.0.1:8787',
      }
    });
        // 2. MCP 기본 서버들 등록
    dispatch({
          type: 'mcp_registry.initializeDefaultServers',
    });

  }, []);

  console.log(isLoggedIn);
  if (IS_WEB) {
    return (
      <div
        className={cn({
          'py-20 md:py-40 px-5 md:px-20': !pathname.includes('/auth/'),
          'transition-opacity animate-pulse': isLoading,
        })}
      >
        {pathname.includes('/auth') ? null : (
          <Navigation
            isLoggedIn={isLoggedIn}
            username={profile?.username}
            avatar={profile?.avatar}
            name={profile?.name}
            hasNotifications={false}
            hasMessages={false}
          />
        )}
        <Outlet
          context={{
            isLoggedIn,
            name: profile?.name,
            userId: user?.id,
            username: profile?.username,
            avatar: profile?.avatar,
            email: user?.email,
            servers,
            clients,
            workflows,
          }}
        />
      </div>
    );
  }

  // Electron 환경 (기존)
  return (
    <DnDProvider>
      <div className="relative flex flex-col h-screen overflow-hidden">
      {/* 🌲 커스텀 타이틀바 - Electron에서만 표시 */}
      {!pathname.includes('/auth') && (
        <CustomTitleBar 
          title="OCT Server"
          showMenuButton={true}
        />
      )}
      
      {/* 🌲 타이틀바 높이(32px)만큼 여백 추가 */}
      <div className={cn(
        "flex flex-1 overflow-hidden",
        {
          "pt-8": !pathname.includes('/auth'), // 32px (h-8) 여백 추가
        }
      )}>
        {!pathname.includes('/auth') && (
          <>
            <Sidebar
              isLoggedIn={isLoggedIn}
              username={profile?.username || ""}
              avatar={profile?.avatar || null}
              name={profile?.name || ""}
              hasNotifications={false}
              hasMessages={false}
              collapsed={true} // 🔥 Slack 스타일: 항상 아이콘만 표시
              onMenuSelect={setSelectedMenu} // 🔥 메뉴 선택 핸들러
              />
            {/* 🔥 ChannelSidebar 항상 표시 - Slack 스타일 */}
            <ChannelSidebar 
              selectedMenu={selectedMenu}
              servers={servers}
              clients={clients}
              onNodeDragStart={(event, nodeType) => {
                // 🔥 노드 드래그 시작 - React Flow로 전달
                event.dataTransfer.setData('application/node-type', nodeType);
                event.dataTransfer.effectAllowed = 'move';
              }}
            />
          </>
        )}
        <main
          className={cn(
            'flex-1 h-full',
            {
              'overflow-y-auto py-20 md:py-40 px-5 md:px-20': (!pathname.startsWith('/chat') && !pathname.includes('/auth/') && !pathname.includes('/server/node-page') && !(typeof window !== 'undefined' && (window as any).IS_ELECTRON && pathname === '/')),
              'overflow-hidden py-0 md:py-0 px-0 md:px-0': pathname.includes('/jobs/node'),
              'overflow-hidden py-10 md:py-10 px-5 md:px-10': pathname.includes('/jobs/inspector'),
              'overflow-y-auto py-10 md:py-20 px-5 md:px-20': IS_ELECTRON && pathname === '/',
              'overflow-hidden py-0 px-0 md:py-0 h-full bg-background': pathname.includes('/chat/'),
              'transition-opacity animate-pulse': isLoading,
            }
          )}
        >
          <Outlet
            context={{
              isLoggedIn,
              name: profile?.name || "",
              userId: user?.id || "",
              username: profile?.username || "",
              avatar: profile?.avatar || null,
              email: user?.email || "",
              servers,
              clients,
              workflows,
            }}
          />
        </main>
      </div>
    </div>
    </DnDProvider>
  );
}

// 에러 바운더리 컴포넌트
export function ErrorBoundary({ error }: { error: unknown }) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

import { useOutletContext } from "react-router";
import { Code2, Terminal, FileJson, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/components/ui/card";
import { Badge } from "../../../common/components/ui/badge";
import { Button } from "../../../common/components/ui/button";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../common/components/ui/collapsible";
import { MCPServerDetailView } from "../types/MCPServerDetailTypes";

export default function ProductToolsPage() {
  const { product, isLoggedIn } = useOutletContext<{
    product: MCPServerDetailView;
    isLoggedIn: boolean;
  }>();

  // 🔥 페이지 로드 시 스크롤을 맨 위로
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
      
      const scrollableElements = document.querySelectorAll('[style*="overflow"], .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });
    };
    
    scrollToTop();
    const timers = [
      setTimeout(scrollToTop, 50),
      setTimeout(scrollToTop, 150),
      setTimeout(scrollToTop, 300)
    ];
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [product.id]);

  // detected_tools를 배열로 안전하게 처리
  const detected_tools = Array.isArray(product.detected_tools) ? product.detected_tools : [];

  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  const toggleTool = (toolName: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(toolName)) {
      newExpanded.delete(toolName);
    } else {
      newExpanded.add(toolName);
    }
    setExpandedTools(newExpanded);
  };

  // 파라미터 타입별 색상과 아이콘
  const getTypeInfo = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('string')) return { color: 'text-green-600', bg: 'bg-green-50', icon: '📝' };
    if (lowerType.includes('number') || lowerType.includes('integer')) return { color: 'text-blue-600', bg: 'bg-blue-50', icon: '🔢' };
    if (lowerType.includes('boolean')) return { color: 'text-purple-600', bg: 'bg-purple-50', icon: '✅' };
    if (lowerType.includes('array')) return { color: 'text-orange-600', bg: 'bg-orange-50', icon: '📚' };
    if (lowerType.includes('object')) return { color: 'text-pink-600', bg: 'bg-pink-50', icon: '📦' };
    return { color: 'text-gray-600', bg: 'bg-gray-50', icon: '❓' };
  };

  if (!detected_tools || detected_tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="p-4 rounded-full bg-gray-100">
          <Wrench className="size-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-600">도구가 없습니다</h3>
        <p className="text-sm text-muted-foreground">이 서버는 도구를 제공하지 않습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 도구 요약 */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Code2 className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground mb-1">제공되는 도구</h3>
              <p className="text-muted-foreground">
                총 <span className="font-semibold text-primary">{detected_tools.length}개</span>의 도구를 사용할 수 있습니다
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">{detected_tools.length}</div>
              <div className="text-xs text-muted-foreground">TOOLS</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 도구 목록 */}
      <div className="space-y-4">
        {detected_tools.map((tool, index) => {
          const isExpanded = expandedTools.has(tool.name);
          const requiredParams = tool.parameters.filter(p => p.required);
          const optionalParams = tool.parameters.filter(p => !p.required);

          return (
            <Card key={tool.name} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Terminal className="size-5 text-primary" />
                      </div>
                      <code className="text-lg font-mono">{tool.name}</code>
                    </CardTitle>
                    <p className="mt-2 text-muted-foreground">{tool.description}</p>
                    
                    {/* 파라미터 요약 */}
                    <div className="flex items-center gap-3 mt-3 text-sm">
                      <Badge variant="secondary" className="gap-1">
                        <FileJson className="size-3" />
                        {tool.parameters.length} 파라미터
                      </Badge>
                      {requiredParams.length > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          {requiredParams.length} 필수
                        </Badge>
                      )}
                      {optionalParams.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          {optionalParams.length} 선택
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTool(tool.name)}
                    className="ml-4"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="size-4 mr-1" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-4 mr-1" />
                        펼치기
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <Collapsible open={isExpanded}>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-6">
                      {/* 필수 파라미터 */}
                      {requiredParams.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-sm text-muted-foreground">필수 파라미터</h4>
                          <div className="space-y-3">
                            {requiredParams.map((param) => {
                              const typeInfo = getTypeInfo(param.type);
                              return (
                                <div key={param.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                  <span className="text-xl mt-0.5">{typeInfo.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="font-mono font-medium">{param.name}</code>
                                      <Badge variant="outline" className={`text-xs ${typeInfo.color} ${typeInfo.bg}`}>
                                        {param.type}
                                      </Badge>
                                      <Badge variant="destructive" className="text-xs">필수</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{param.description}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 선택 파라미터 */}
                      {optionalParams.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-sm text-muted-foreground">선택 파라미터</h4>
                          <div className="space-y-3">
                            {optionalParams.map((param) => {
                              const typeInfo = getTypeInfo(param.type);
                              return (
                                <div key={param.name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                  <span className="text-xl mt-0.5">{typeInfo.icon}</span>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="font-mono font-medium">{param.name}</code>
                                      <Badge variant="outline" className={`text-xs ${typeInfo.color} ${typeInfo.bg}`}>
                                        {param.type}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">선택</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{param.description}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 사용 예시 */}
                      <div className="mt-6 p-4 bg-black text-white rounded-lg">
                        <p className="text-xs text-gray-400 mb-2">// 사용 예시</p>
                        <code className="text-sm font-mono">
                          <span className="text-blue-400">await</span> <span className="text-yellow-400">{tool.name}</span>(
                          {requiredParams.length > 0 && (
                            <>
                              {`{`}
                              {requiredParams.map((param, idx) => (
                                <div key={param.name} className="ml-4">
                                  <span className="text-green-400">{param.name}</span>: 
                                  <span className="text-orange-400">
                                    {param.type === 'string' ? ' "..."' : 
                                     param.type === 'number' || param.type === 'integer' ? ' 123' :
                                     param.type === 'boolean' ? ' true' :
                                     param.type === 'array' ? ' []' :
                                     param.type === 'object' ? ' {}' : ' value'}
                                  </span>
                                  {idx < requiredParams.length - 1 && ','}
                                </div>
                              ))}
                              {`}`}
                            </>
                          )}
                          )
                        </code>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
import { useOutletContext } from "react-router";
import { Calendar, GitBranch, Scale, Shield, FileCode, Package, Globe, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../common/components/ui/card";
import { Badge } from "../../../common/components/ui/badge";
import { Progress } from "../../../common/components/ui/progress";
import { Separator } from "../../../common/components/ui/separator";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { MCPServerDetailView } from "../types/MCPServerDetailTypes";
import { useEffect } from "react";

export default function ProductDetailsPage() {
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
  
  console.log('🎭 [ProductDetailsPage] product:', product);
  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "알 수 없음";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy년 MM월 dd일");
    } catch {
      return "알 수 없음";
    }
  };

  // 상대 시간 포맷팅
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ko });
    } catch {
      return "";
    }
  };

  // 인기도 점수 계산 (임의)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 프로젝트 정보 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 기본 정보 카드 */}
        <Card className="border border-border bg-card hover:bg-card/80 transition-colors duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <FileCode className="size-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">기본 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground">서버 ID</span>
                <code className="text-xs bg-muted px-3 py-1.5 rounded-lg font-mono">{product.id}</code>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground">버전</span>
                <Badge variant="outline" className="font-medium">{product.version || "최신"}</Badge>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground">라이선스</span>
                <Badge className="font-medium">{product.license || "없음"}</Badge>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-muted-foreground">서버 타입</span>
                <Badge variant="secondary" className="font-medium">{product.server_type || "알 수 없음"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 저장소 정보 카드 */}
        <Card className="border border-border bg-card hover:bg-card/80 transition-colors duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <GitBranch className="size-5 text-primary" />
              </div>
              <span className="text-lg font-semibold">저장소 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-medium text-muted-foreground">소유자</span>
                <span className="font-semibold text-foreground">{product.owner || "알 수 없음"}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-muted-foreground">저장소명</span>
                <span className="font-semibold text-foreground">{product.repo_name || "알 수 없음"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 날짜 정보 */}
      <Card className="border border-border bg-card hover:bg-card/80 transition-colors duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Calendar className="size-5 text-primary" />
            </div>
            <span className="text-lg font-semibold">타임라인</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-sm font-medium text-muted-foreground">생성일</p>
              </div>
              <p className="font-semibold text-foreground">{formatDate(product.created_at)}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(product.created_at)}</p>
            </div>
            
            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-sm font-medium text-muted-foreground">최종 업데이트</p>
              </div>
              <p className="font-semibold text-foreground">{formatDate(product.updated_at)}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(product.updated_at)}</p>
            </div>

            <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <p className="text-sm font-medium text-muted-foreground">GitHub 최종 업데이트</p>
              </div>
              <p className="font-semibold text-foreground">{formatDate(product.last_updated)}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(product.last_updated)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 안전성 정보 */}
      {/* <Card className={product.enhanced_info?.is_safety_verified ? "border-green-200" : "border-yellow-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className={`size-5 ${product.enhanced_info?.is_safety_verified ? "text-green-600" : "text-yellow-600"}`} />
            안전성 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {product.enhanced_info?.is_safety_verified ? (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <Shield className="size-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">안전성 검증 완료</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    이 서버는 안전성 검증을 통과했습니다.
                    {product.enhanced_info.safety_check_at && (
                      <span className="block mt-1">
                        검증일: {formatDate(product.enhanced_info.safety_check_at)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-yellow-100">
                  <AlertTriangle className="size-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-yellow-900">안전성 미검증</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    아직 안전성 검증이 완료되지 않았습니다. 사용에 주의하세요.
                  </p>
                </div>
              </div>
            )}

            {product.enhanced_info?.safety_issues && product.enhanced_info.safety_issues.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="font-medium mb-2">발견된 이슈</p>
                  <ul className="space-y-1">
                    {product.enhanced_info.safety_issues.map((issue: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card> */}

      {/* 추가 언어 지원 */}
      {(product.enhanced_info?.description_en || product.enhanced_info?.description_ja) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="size-5" />
              다국어 지원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {product.enhanced_info?.description_ko && (
                  <Badge variant="default">한국어</Badge>
                )}
                {product.enhanced_info?.description_en && (
                  <Badge variant="secondary">English</Badge>
                )}
                {product.enhanced_info?.description_ja && (
                  <Badge variant="secondary">日本語</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                이 서버는 여러 언어로 설명이 제공됩니다. 개요 탭에서 한국어 설명을 확인하세요.
              </p>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}
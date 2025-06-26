import { useOutletContext } from "react-router";
import { Sparkles, BookOpen, Zap, Target, Copy, Check } from "lucide-react";
import { Card, CardContent } from "../../../common/components/ui/card";
import { Badge } from "../../../common/components/ui/badge";
import { Button } from "../../../common/components/ui/button";
import { MCPServerDetailView } from "../types/MCPServerDetailTypes";
import { useState, useEffect } from "react";

// 코드 블록 컴포넌트
const CodeBlock = ({ code, language }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  // 언어별 아이콘과 라벨 및 색상 테마
  const getLanguageInfo = (lang?: string) => {
    if (!lang) return { 
      label: 'Code', 
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700'
    };
    
    const lowerLang = lang.toLowerCase();
    if (lowerLang === 'json') return { 
      label: 'JSON', 
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800'
    };
    if (lowerLang === 'bash' || lowerLang === 'shell') return { 
      label: 'Bash', 
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800'
    };
    if (lowerLang === 'javascript' || lowerLang === 'js') return { 
      label: 'JavaScript', 
      color: 'text-yellow-700 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800'
    };
    if (lowerLang === 'typescript' || lowerLang === 'ts') return { 
      label: 'TypeScript', 
      color: 'text-blue-700 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800'
    };
    if (lowerLang === 'python' || lowerLang === 'py') return { 
      label: 'Python', 
      color: 'text-green-700 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800'
    };
    if (lowerLang === 'docker' || lowerLang === 'dockerfile') return { 
      label: 'Docker', 
      color: 'text-sky-700 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-900/20',
      border: 'border-sky-200 dark:border-sky-800'
    };
    return { 
      label: lang.toUpperCase(), 
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700'
    };
  };

  const langInfo = getLanguageInfo(language);

  return (
    <div className={`relative group my-6 rounded-xl overflow-hidden border ${langInfo.border} shadow-sm hover:shadow-md transition-all duration-200`}>
      {/* 헤더 */}
      <div className={`flex items-center justify-between ${langInfo.bg} px-4 py-3 border-b ${langInfo.border}`}>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
            <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-md text-xs font-medium ${langInfo.color} bg-white/50 dark:bg-black/20`}>
              {langInfo.label}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className={`h-8 px-3 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:${langInfo.bg}`}
        >
          {copied ? (
            <>
              <Check className="size-4 mr-1.5 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">복사됨!</span>
            </>
          ) : (
            <>
              <Copy className="size-4 mr-1.5" />
              <span className="text-xs font-medium">복사</span>
            </>
          )}
        </Button>
      </div>
      
      {/* 코드 내용 */}
      <div className="relative">
        <pre className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4 overflow-x-auto text-sm leading-relaxed font-mono">
          <code className="text-slate-800 dark:text-slate-200">{code}</code>
        </pre>
        
        {/* 그라디언트 오버레이 (긴 코드를 위한 fade effect) */}
        <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white dark:from-slate-900 to-transparent pointer-events-none opacity-50"></div>
      </div>
    </div>
  );
};

// 간단한 마크다운 렌더링 컴포넌트
const MarkdownRenderer = ({ content }: { content: string }) => {
  // 코드 블록을 임시 플래이스홀더로 대체하고 나중에 복원
  const codeBlocks: Array<{ code: string; language?: string }> = [];
  let processedContent = content;

  console.log('🐛 [MarkdownRenderer] 원본 내용:', content);

  // 1. 먼저 ```로 감싸진 코드 블록 처리
  processedContent = processedContent.replace(/```(\w+)?\s*\n?([\s\S]*?)```/g, (match, language, code) => {
    const index = codeBlocks.length;
    codeBlocks.push({ code: code.trim(), language: language || undefined });
    console.log('🔍 찾은 ``` 코드 블록:', { code: code.trim(), language });
    return `__CODE_BLOCK_${index}__`;
  });

  // 2. JSON 블록을 더 정교하게 찾기 - 중괄호 균형 맞추기
  const findBalancedJSON = (text: string): Array<{ start: number; end: number; content: string }> => {
    const matches: Array<{ start: number; end: number; content: string }> = [];
    let i = 0;
    
    while (i < text.length) {
      if (text[i] === '{') {
        let braceCount = 1;
        let start = i;
        let j = i + 1;
        
        while (j < text.length && braceCount > 0) {
          if (text[j] === '{') braceCount++;
          else if (text[j] === '}') braceCount--;
          j++;
        }
        
        if (braceCount === 0) {
          const content = text.slice(start, j);
          // JSON처럼 보이는지 확인 (따옴표와 콜론이 있는지)
          if (content.includes('"') && content.includes(':') && content.length > 10) {
            matches.push({ start, end: j, content });
          }
        }
        i = j;
      } else {
        i++;
      }
    }
    
    return matches;
  };

  // JSON 블록들을 찾아서 플래이스홀더로 교체
  const jsonMatches = findBalancedJSON(processedContent);
  
  // 뒤에서부터 교체해야 인덱스가 안 꼬임
  for (let i = jsonMatches.length - 1; i >= 0; i--) {
    const match = jsonMatches[i];
    const index = codeBlocks.length;
    codeBlocks.push({ code: match.content.trim(), language: 'json' });
    
    processedContent = 
      processedContent.slice(0, match.start) + 
      `__CODE_BLOCK_${index}__` + 
      processedContent.slice(match.end);
  }



  // 마크다운 텍스트를 HTML로 변환하는 함수
  const parseMarkdown = (text: string) => {
    return text
      // 헤딩 처리 - 더 관대하게 (앞뒤 공백 허용)
      .replace(/^\s*#### (.*$)/gim, '<h4 class="text-base font-semibold mt-6 mb-3 text-foreground">$1</h4>')
      .replace(/^\s*### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3 text-foreground">$1</h3>')
      .replace(/^\s*## (.*$)/gim, '<h2 class="text-xl font-bold mt-8 mb-4 text-foreground">$1</h2>')
      .replace(/^\s*# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-6 text-foreground">$1</h1>')
      
      // 볼드 텍스트 (**text** -> <strong>)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      
      // 이탤릭 텍스트 (*text* -> <em>)
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // 인라인 코드 (`code` -> <code>)
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-primary">$1</code>')
      
      // 링크 ([text](url) -> <a>)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // 불릿 포인트 (- item -> <li>)
      .replace(/^- (.*$)/gim, '<li class="flex items-start gap-2 mb-2"><span class="text-primary mt-1">•</span><span>$1</span></li>')
      
      // 번호 목록 (1. item -> <li>)
      .replace(/^\d+\. (.*$)/gim, '<li class="flex items-start gap-2 mb-2 ml-4"><span class="text-primary font-medium">1.</span><span>$1</span></li>')
      
      // 줄바꿈 처리
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br />');
  };

  const parsedContent = parseMarkdown(processedContent);

  // HTML을 JSX 요소로 변환하면서 코드 블록을 복원
  const renderContent = () => {
    const parts = parsedContent.split(/(__CODE_BLOCK_\d+__)/g);
    
    console.log('🐛 [MarkdownRenderer] 분할된 파트들:', parts);
    
    return parts.map((part, index) => {
      const codeBlockMatch = part.match(/__CODE_BLOCK_(\d+)__/);
      if (codeBlockMatch) {
        const blockIndex = parseInt(codeBlockMatch[1]);
        const codeBlock = codeBlocks[blockIndex];
        if (codeBlock) {
          console.log('🐛 [MarkdownRenderer] 코드 블록 렌더링:', codeBlock);
          return (
            <CodeBlock 
              key={`code-${index}`}
              code={codeBlock.code} 
              language={codeBlock.language} 
            />
          );
        } else {
          console.error('🚨 코드 블록을 찾을 수 없음:', blockIndex);
          return <div key={index}>코드 블록 오류</div>;
        }
      }
      
      return (
        <div 
          key={index}
          className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: part }}
        />
      );
    });
  };

  return <div className="space-y-2">{renderContent()}</div>;
};

export default function ProductOverviewPage() {
  const { product, isLoggedIn } = useOutletContext<{
    product: MCPServerDetailView;
    isLoggedIn: boolean;
  }>();

  // product에서 필요한 데이터 추출
  const enhanced_info = product.enhanced_info;

  // 🔥 페이지 로드 시 스크롤을 맨 위로 (모든 가능한 스크롤 컨테이너 대상)
  useEffect(() => {
    const scrollToTop = () => {
      // 기본 스크롤 대상들
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // 메인 컨테이너들도 확인
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTop = 0;
      }
      
      // 오버플로우가 있는 모든 요소들 찾아서 스크롤 리셋
      const scrollableElements = document.querySelectorAll('[style*="overflow"], .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.scrollTop = 0;
        }
      });
    };
    
    // 즉시 실행
    scrollToTop();
    
    // 여러 시점에서 실행 (렌더링 완료를 기다림)
    const timers = [
      setTimeout(scrollToTop, 50),
      setTimeout(scrollToTop, 150),
      setTimeout(scrollToTop, 300)
    ];
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [product.id]); // product.id가 바뀔 때마다 실행



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 주요 설명 카드 */}
 

      {/* 한국어 설명 (있을 경우) */}
      {enhanced_info?.description_ko && (
        <Card className="border border-border bg-card hover:bg-card/80 transition-colors duration-200">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="flex items-start gap-4">
              {/* 🔥 심플한 아이콘 */}
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <BookOpen className="size-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                {/* 🔥 깔끔한 헤더 */}
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold text-foreground">설명</h3>
                  <Badge variant="outline" className="text-xs font-medium">KR</Badge>
                </div>
                
                {/* 🔥 콘텐츠 */}
                <div className="text-muted-foreground">
                  <MarkdownRenderer content={enhanced_info.description_ko} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

 

    </div>
  );
}
import { useCallback, useRef } from 'react';

// 📜 스트리밍 채팅을 위한 자동 스크롤 훅 - 개선된 버전
export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    console.log('🔄 [scrollToBottom] 호출됨!');
    
    if (!containerRef.current) {
      console.log('❌ [scrollToBottom] containerRef.current가 null입니다!');
      return;
    }

    const container = containerRef.current;
    
    console.log('📊 [scrollToBottom] 스크롤 정보:', {
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      scrollTop: container.scrollTop,
      hasOverflow: container.scrollHeight > container.clientHeight
    });
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
    
    console.log('✅ [scrollToBottom] scrollTo 실행됨!');
    
    // 추가 확인: 실제로 스크롤되었는지 체크
    setTimeout(() => {
      console.log('📈 [scrollToBottom] 스크롤 후 위치:', {
        scrollTop: container.scrollTop,
        maxScroll: container.scrollHeight - container.clientHeight
      });
    }, 100);
  }, []);

  return { containerRef, scrollToBottom };
}

// 📜 기본 스크롤 훅 (수동 제어용) - 개선된 버전
export function useChatScrollManual() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (!containerRef.current) return;

    // 🔍 개선된 스크롤 컨테이너 찾기
    let scrollContainer: Element | null = null;
    
    scrollContainer = 
      containerRef.current.closest('[data-radix-scroll-area-viewport]') ||
      containerRef.current.parentElement?.closest('[data-radix-scroll-area-viewport]') ||
      document.querySelector('[data-radix-scroll-area-viewport]');

    if (!scrollContainer) {
      let parent = containerRef.current.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    const targetContainer = scrollContainer || containerRef.current;

    if (targetContainer) {
      targetContainer.scrollTo({
        top: targetContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  // 즉시 스크롤 (애니메이션 없이)
  const scrollToBottomInstant = useCallback(() => {
    if (!containerRef.current) return;

    let scrollContainer: Element | null = null;
    
    scrollContainer = 
      containerRef.current.closest('[data-radix-scroll-area-viewport]') ||
      containerRef.current.parentElement?.closest('[data-radix-scroll-area-viewport]') ||
      document.querySelector('[data-radix-scroll-area-viewport]');

    if (!scrollContainer) {
      let parent = containerRef.current.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainer = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    const targetContainer = scrollContainer || containerRef.current;

    if (targetContainer) {
      targetContainer.scrollTop = targetContainer.scrollHeight;
    }
  }, []);

  return { containerRef, scrollToBottom, scrollToBottomInstant };
}

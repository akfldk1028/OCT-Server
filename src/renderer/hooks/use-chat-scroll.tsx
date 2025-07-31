import { useCallback, useRef } from 'react';

// 📜 스트리밍 채팅을 위한 자동 스크롤 훅 - 개선된 버전
export function useChatScroll() {
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    
    // 더 강력한 스크롤 함수
    const performScroll = () => {
      if (!containerRef.current) {
        console.log('❌ [scrollToBottom] containerRef.current가 null입니다!');
        return false;
      }

      const container = containerRef.current;
      // 강제 스크롤 (smooth 대신 instant로 확실하게)
      container.scrollTop = container.scrollHeight;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
      
      const isAtBottom = Math.abs(container.scrollTop - (container.scrollHeight - container.clientHeight)) < 5;
      return isAtBottom;
    };
    
    // 즉시 실행
    const success1 = performScroll();
    
    // requestAnimationFrame으로 한 번 더
    requestAnimationFrame(() => {
      const success2 = performScroll();
      
      // 마지막으로 한 번 더 확인
      setTimeout(() => {
        if (!success1 && !success2) {
          console.log('🔄 [scrollToBottom] 마지막 시도...');
          performScroll();
        }
      }, 50);
    });
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

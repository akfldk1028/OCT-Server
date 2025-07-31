import { useState, useCallback } from 'react';
import { useDispatch } from '@/hooks/useStore';
import type { Tag } from '../TagInput';

export function useTagManager() {
  const dispatch = useDispatch();
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // 태그 추가
  const addTag = useCallback((tag: Tag) => {
    setSelectedTags(prev => {
      const exists = prev.some(t => t.type === tag.type && t.name === tag.name);
      if (exists) return prev;
      return [...prev, tag];
    });
  }, []);

  // 태그 제거
  const removeTag = useCallback((type: string, name: string) => {
    setSelectedTags(prev => prev.filter(tag => !(tag.type === type && tag.name === name)));
  }, []);

  // 모든 태그 초기화
  const clearTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // 스키마 기반 기본 파라미터 생성
  const generateDefaultArgs = useCallback((inputSchema?: Tag['inputSchema']): any => {
    if (!inputSchema || !inputSchema.properties) return {};
    
    const args: any = {};
    const required = inputSchema.required || [];
    
    Object.entries(inputSchema.properties).forEach(([key, prop]: [string, any]) => {
      if (required.includes(key)) {
        // 필수 파라미터에 대한 기본값 제공
        switch (prop.type) {
          case 'string':
            if (key.includes('message')) {
              args[key] = `안녕하세요! "${key}" 파라미터를 테스트하고 있습니다.`;
            } else if (key.includes('location') || key.includes('place')) {
              args[key] = '서울';
            } else if (key.includes('query') || key.includes('search')) {
              args[key] = '테스트 검색어';
            } else if (key.includes('path') || key.includes('file')) {
              args[key] = './';
            } else {
              args[key] = `테스트 ${key}`;
            }
            break;
          case 'number':
            args[key] = 1;
            break;
          case 'boolean':
            args[key] = true;
            break;
          default:
            args[key] = `테스트 ${key}`;
        }
      }
    });
    
    return args;
  }, []);

  // MCP 액션 실행
  const executeMCPAction = useCallback(async (tag: Tag, sessionId: string): Promise<string> => {
    if (!sessionId) throw new Error('세션이 없습니다');
    
    switch (tag.type) {
      case 'tool':
        try {
          // 스키마 정보를 활용한 파라미터 생성
          let args = generateDefaultArgs(tag.inputSchema);
          
          // 🚨 Fallback: 스키마가 없거나 args가 비어있으면 도구명 기반 기본값 제공
          if (Object.keys(args).length === 0) {
            console.log(`⚠️ 스키마 정보가 없어서 fallback 로직 사용`);
            if (tag.name === 'echo') {
              args = { message: `안녕하세요! Echo 도구를 테스트하고 있습니다.` };
            } else if (tag.name.includes('weather')) {
              args = { location: '서울' };
            } else if (tag.name.includes('search')) {
              args = { query: '테스트 검색어' };
            } else if (tag.name.includes('read') || tag.name.includes('list')) {
              args = { path: './' };
            }
          }
          
          console.log(`🎯 최종 생성된 파라미터:`, args);
          
          const result = await dispatch({
            type: 'mcp_coordinator.executeToolForSession',
            payload: { sessionId, toolName: tag.name, args }
          });
          
          // MCP 응답에서 텍스트 추출
          let resultText = '';
          if (result && result.content && Array.isArray(result.content)) {
            resultText = result.content
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text)
              .join('\n');
          } else {
            resultText = JSON.stringify(result, null, 2);
          }
          
          return `🔧 도구 "${tag.name}" 실행 결과:\n${resultText}`;
        } catch (error) {
          throw new Error(`도구 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      case 'prompt':
        try {
          // 프롬프트 파라미터 생성
          const args = generateDefaultArgs(tag.inputSchema);
          console.log(`🎯 생성된 파라미터:`, args);
          
          const content = await dispatch({
            type: 'mcp_registry.getPrompt',
            payload: { promptName: tag.name, args }
          });
          return `📝 프롬프트 "${tag.name}" 내용:\n${content}`;
        } catch (error) {
          throw new Error(`프롬프트 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      case 'resource':
        try {
          const contents = await dispatch({
            type: 'mcp_registry.readResource',
            payload: { resourceUri: tag.name }
          });
          return `📄 리소스 "${tag.name}" 내용:\n${JSON.stringify(contents, null, 2)}`;
        } catch (error) {
          throw new Error(`리소스 읽기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }

      default:
        throw new Error(`지원하지 않는 태그 타입: ${tag.type}`);
    }
  }, [dispatch, generateDefaultArgs]);

  return {
    selectedTags,
    addTag,
    removeTag,
    clearTags,
    generateDefaultArgs,
    executeMCPAction
  };
} 
import type { 
  GetPromptResult, 
  ReadResourceResult, 
  CallToolResult 
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP SDK 표준: 프롬프트 결과를 텍스트로 변환
 */
export function extractPromptText(promptResult: GetPromptResult): string {
  return promptResult.messages
    .map(msg => {
      if (typeof msg.content === 'string') return msg.content;
      if (msg.content?.type === 'text') return msg.content.text;
      return JSON.stringify(msg.content);
    })
    .join('\n');
}

/**
 * MCP SDK 표준: 리소스 결과를 텍스트로 변환 - 개선된 버전
 */
export function extractResourceText(resourceResult: ReadResourceResult): string {
  return resourceResult.contents
    .map(content => {
      if (content.type === 'text') {
        // 📄 텍스트 리소스를 더 구조화해서 반환
        const resourceData = JSON.parse(JSON.stringify(content));
        
        let formattedText = content.text;
        
        // 📋 메타데이터가 있으면 함께 표시
        if (resourceData.uri || resourceData.mimeType || resourceData.name) {
          const metadata = [];
          if (resourceData.name) metadata.push(`제목: ${resourceData.name}`);
          if (resourceData.mimeType) metadata.push(`타입: ${resourceData.mimeType}`);
          if (resourceData.uri) metadata.push(`URI: ${resourceData.uri}`);
          
          formattedText = `📋 메타데이터: ${metadata.join(', ')}\n📄 내용: ${content.text}`;
        }
        
        return formattedText;
      }
      if (content.type === 'blob') return `[Blob: ${String(content.blob).length} chars]`;
      return JSON.stringify(content);
    })
    .join('\n');
}

/**
 * MCP SDK 표준: 도구 결과를 텍스트로 변환 - 개선된 버전
 */
export function extractToolText(toolResult: CallToolResult): string {
  if (!toolResult.content || toolResult.content.length === 0) {
    return '도구 실행 완료 (결과 없음)';
  }

  return toolResult.content
    .map(item => {
      if (item.type === 'text') {
        return item.text;
      } else if (item.type === 'image') {
        return `📷 이미지: ${item.data ? `[${item.data.length} bytes]` : '[이미지 데이터]'}`;
      } else if (item.type === 'resource') {
        return `📄 리소스: ${item.resource?.uri || '알 수 없는 리소스'}`;
      } else {
        return `🔧 ${item.type}: ${JSON.stringify(item)}`;
      }
    })
    .join('\n');
}

/**
 * 간단한 태그 처리 - 프롬프트 (개선된 버전)
 */
export async function processPrompts(
  selectedPrompts: any[], 
  getPrompt: (name: string, args: any) => Promise<GetPromptResult>
): Promise<string> {
  if (selectedPrompts.length === 0) return '';
  
  const results = await Promise.all(
    selectedPrompts.map(async (prompt) => {
      try {
        const result = await getPrompt(prompt.name, {});
        const promptText = extractPromptText(result);
        
        // 📝 프롬프트를 더 명확하게 구조화
        return `📝 **활성 프롬프트: ${prompt.name}**
${prompt.description ? `💡 설명: ${prompt.description}` : ''}
📋 프롬프트 내용:
${promptText}
---`;
      } catch (error) {
        console.error(`❌ 프롬프트 로드 실패: ${prompt.name}`, error);
        return `❌ **프롬프트 로드 실패: ${prompt.name}** - ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    })
  );
  
  return results.join('\n\n');
}

/**
 * 간단한 태그 처리 - 리소스 (개선된 버전)
 */
export async function processResources(
  selectedResources: any[],
  readResource: (uri: string) => Promise<ReadResourceResult>,
  findResourceUri: (name: string) => string | null
): Promise<string> {
  if (selectedResources.length === 0) return '';
  
  const results = await Promise.all(
    selectedResources.map(async (resource) => {
      try {
        const uri = findResourceUri(resource.name);
        if (!uri) throw new Error(`리소스 URI를 찾을 수 없습니다: ${resource.name}`);
        
        const result = await readResource(uri);
        const resourceText = extractResourceText(result);
        
        // 📄 리소스를 더 명확하게 구조화
        return `📄 **활성 리소스: ${resource.name}**
${resource.description ? `💡 설명: ${resource.description}` : ''}
🔗 URI: ${uri}
📋 리소스 내용:
${resourceText}
---`;
      } catch (error) {
        console.error(`❌ 리소스 로드 실패: ${resource.name}`, error);
        return `❌ **리소스 로드 실패: ${resource.name}** - ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    })
  );
  
  return results.join('\n\n');
}

/**
 * 개선된 도구 실행 결과 처리 - 구조화된 형태로 반환
 */
export function formatToolExecutionResult(
  toolName: string, 
  args: any, 
  result: CallToolResult, 
  executionTime?: number
): string {
  const formattedResult = extractToolText(result);
  const argsString = Object.keys(args).length > 0 ? 
    `\n📋 입력 파라미터: ${JSON.stringify(args, null, 2)}` : '';
  
  const timeInfo = executionTime ? 
    `\n⏱️ 실행 시간: ${executionTime}ms` : '';

  // 🔧 도구 실행 결과를 명확하게 구조화
  return `🔧 **도구 실행 완료: ${toolName}**${argsString}${timeInfo}
📊 실행 결과:
${formattedResult}
---`;
}

/**
 * 도구 실행 실패 결과 포맷팅
 */
export function formatToolExecutionError(
  toolName: string, 
  args: any, 
  error: Error | string
): string {
  const argsString = Object.keys(args).length > 0 ? 
    `\n📋 시도한 파라미터: ${JSON.stringify(args, null, 2)}` : '';
  
  const errorMessage = error instanceof Error ? error.message : String(error);

  return `❌ **도구 실행 실패: ${toolName}**${argsString}
🚨 오류 내용: ${errorMessage}
💡 도구 사용법을 확인하거나 다른 파라미터로 시도해보세요.
---`;
} 
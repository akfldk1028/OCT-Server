import type { Connection, Node } from '@xyflow/react';

// 🎯 노드 타입별 연결 규칙 정의
export interface NodeConnectionRule {
  // 이 노드가 연결할 수 있는 타겟 노드 타입들
  allowedTargets?: string[];
  // 이 노드로 연결될 수 있는 소스 노드 타입들  
  allowedSources?: string[];
  // 최대 출력 연결 수 (-1은 무제한)
  maxOutputs?: number;
  // 최대 입력 연결 수 (-1은 무제한)
  maxInputs?: number;
  // 커스텀 validation 함수
  customValidator?: (connection: Connection, nodes: Node[]) => boolean;
}

// 🔥 단순한 노드 타입별 연결 규칙 (연결 수 제한 없음)
export const NODE_CONNECTION_RULES: Record<string, NodeConnectionRule> = {
  // 트리거 노드: 시작점, 서비스로만 연결 가능
  trigger: {
    allowedTargets: ['service'], // 서비스로만!
    allowedSources: [], // 입력 불가
  },
  
  // 서비스 노드: 서버로만 연결 가능 (핵심 규칙!)
  service: {
    allowedTargets: ['server'], // 🎯 서버로만 연결!
    allowedSources: ['trigger'], // 트리거에서만 입력
  },
  
  // 서버 노드: 결과로만 연결 가능
  server: {
    allowedTargets: ['result'], // 결과로만!
    allowedSources: ['service'], // 서비스에서만 입력
  },
  
  // 텍스트 노드: 사용 안 함 (임시)
  text: {
    allowedTargets: [],
    allowedSources: [],
  },
  
  // 결과 노드: 최종 출력
  result: {
    allowedTargets: [], // 출력 불가
    allowedSources: ['server'], // 서버에서만 입력
  },
  
  // 기본 노드
  default: {
    allowedTargets: ['default'],
    allowedSources: ['default'],
  },
};

// 🛡️ 연결 유효성 검사 메인 함수 (디버깅 강화)
export const isValidConnection = (
  connection: Connection,
  nodes: Node[]
): boolean => {
  const { source, target } = connection;
  
  // 🐞 디버깅 로그 시작
  console.log('🔍 Validation 시작:', { source, target });
  
  if (!source || !target || source === target) {
    console.log('❌ 기본 체크 실패: 소스/타겟 없음 또는 같음');
    return false;
  }
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  console.log('🔍 노드 찾기:', {
    sourceNode: { id: sourceNode?.id, type: sourceNode?.type },
    targetNode: { id: targetNode?.id, type: targetNode?.type }
  });
  
  if (!sourceNode || !targetNode) {
    console.log('❌ 노드 찾기 실패');
    return false;
  }
  
  const sourceType = sourceNode.type || 'default';
  const targetType = targetNode.type || 'default';
  
  console.log('🔍 노드 타입:', { sourceType, targetType });
  
  const sourceRule = NODE_CONNECTION_RULES[sourceType];
  const targetRule = NODE_CONNECTION_RULES[targetType];
  
  console.log('🔍 적용된 규칙:', {
    sourceRule: sourceRule?.allowedTargets,
    targetRule: targetRule?.allowedSources
  });
  
  // 1. 소스 노드가 타겟 타입을 허용하는지 확인
  if (sourceRule?.allowedTargets && !sourceRule.allowedTargets.includes(targetType)) {
    console.log(`❌ ${sourceType} cannot connect to ${targetType}. 허용된 타겟:`, sourceRule.allowedTargets);
    return false;
  }
  
  // 2. 타겟 노드가 소스 타입을 허용하는지 확인
  if (targetRule?.allowedSources && !targetRule.allowedSources.includes(sourceType)) {
    console.log(`❌ ${targetType} cannot accept connection from ${sourceType}. 허용된 소스:`, targetRule.allowedSources);
    return false;
  }
  
  // 3. 커스텀 validation 함수 실행
  if (sourceRule?.customValidator && !sourceRule.customValidator(connection, nodes)) {
    console.log(`❌ Custom validation failed for ${sourceType}`);
    return false;
  }
  
  console.log(`✅ Valid connection: ${sourceType} → ${targetType}`);
  return true;
};

// 🔢 현재 연결 개수 확인 함수
export const getConnectionCount = (
  nodeId: string,
  type: 'input' | 'output',
  edges: any[]
): number => {
  if (type === 'output') {
    return edges.filter(edge => edge.source === nodeId).length;
  } else {
    return edges.filter(edge => edge.target === nodeId).length;
  }
};



// 🎨 연결 상태에 따른 스타일 반환
export const getConnectionStyle = (
  connection: Connection,
  nodes: Node[]
): { isValid: boolean; style: Record<string, any>; message?: string } => {
  const isValid = isValidConnection(connection, nodes);
  
  return {
    isValid,
    style: {
      stroke: isValid ? '#10b981' : '#ef4444', // 녹색/빨간색
      strokeWidth: isValid ? 2 : 3,
      strokeDasharray: isValid ? 'none' : '5,5',
    },
    message: isValid ? '연결 가능합니다' : '연결할 수 없는 노드 타입입니다',
  };
};

// 🍞 Toast 메시지 생성 함수
export const getValidationErrorMessage = (
  connection: Connection,
  nodes: Node[]
): { title: string; description: string } => {
  const { source, target } = connection;
  
  if (!source || !target) {
    return {
      title: '연결 오류',
      description: '올바르지 않은 연결입니다.',
    };
  }
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  if (!sourceNode || !targetNode) {
    return {
      title: '노드 찾기 오류',
      description: '연결할 노드를 찾을 수 없습니다.',
    };
  }
  
  const sourceType = sourceNode.type || 'default';
  const targetType = targetNode.type || 'default';
  
  // 🎯 특별한 케이스들
  if (sourceType === 'service' && targetType !== 'server') {
    return {
      title: '🚫 잘못된 연결',
      description: `서비스 노드는 서버 노드로만 연결할 수 있습니다! 현재 시도: ${targetType}`,
    };
  }
  
  if (sourceType === 'trigger' && targetType !== 'service') {
    return {
      title: '🚫 잘못된 연결',
      description: `트리거 노드는 서비스 노드로만 연결할 수 있습니다! 현재 시도: ${targetType}`,
    };
  }
  
  if (sourceType === 'server' && targetType !== 'result') {
    return {
      title: '🚫 잘못된 연결',
      description: `서버 노드는 결과 노드로만 연결할 수 있습니다! 현재 시도: ${targetType} (역방향 연결 불가)`,
    };
  }
  
  if (sourceType === 'result') {
    return {
      title: '🚫 잘못된 연결',
      description: `결과 노드는 최종 노드입니다. 다른 노드로 연결할 수 없습니다!`,
    };
  }

  // 기본 메시지
  return {
    title: '🚫 연결 불가',
    description: `${sourceType} → ${targetType} 연결은 허용되지 않습니다.`,
  };
}; 
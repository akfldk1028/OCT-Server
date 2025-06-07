import { Edge } from "@xyflow/react";
import { ServerStatus } from './server';
import type { InstalledServer, ClientType } from '@/renderer/features/server/types/server-types';

export interface NodeMetadata {
    typeVersion: string | number;
    category?: string;
    description?: string;
}



export interface TextNodeData {
  text: string;
  label?: string;
}




// 제네릭 노드 타입
export interface WorkflowNodeData<T = any> extends NodeMetadata {
  id: string | number; // 서버 고유 ID (ServerStatus의 name과 별개로 필요)
  type: string;
  typeVersion: string | number;
  category?: string;
  description?: string;
  position?: { x: number; y: number };
  config?: T; // <-- 이렇게 "?"를 붙여서 선택적으로!
  [key: string]: any;
}


export interface TriggerNodeData extends NodeMetadata
{
    id: string | number; // 서버 고유 ID (ServerStatus의 name과 별개로 필요)
    type: string;
    position?: { x: number; y: number };
    label: string;

}

export interface ServiceNodeData extends NodeMetadata 
{
    id: string | number; // 서버 고유 ID (ServerStatus의 name과 별개로 필요)
    type: string;
    position?: { x: number; y: number };
    config: ClientType;
}

export interface ServerNodeData extends NodeMetadata 
{
    id: string | number; // 서버 고유 ID (ServerStatus의 name과 별개로 필요)
    type: string;
    position?: { x: number; y: number };
    config?: InstalledServer; // InstalledServer 타입으로 변경

}

// 타입별 유니언 (확장 가능)
export type AnyWorkflowNode =
  | WorkflowNodeData<TriggerNodeData>
  | WorkflowNodeData<ServiceNodeData>
  | WorkflowNodeData<TextNodeData>
  | WorkflowNodeData<ServerNodeData>
  // ... 필요시 추가
  | WorkflowNodeData<any>;

export interface WorkflowPayload {
  workflowId: string;
  nodes: AnyWorkflowNode[];
  edges: Edge[];
  triggerId: string;
  context: Record<string, any>;
}
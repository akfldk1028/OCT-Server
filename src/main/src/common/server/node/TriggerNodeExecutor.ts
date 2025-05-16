// [1] 🟩 context {}
// [1] 🟦 this.node {
// [1]   label: 'START TRIGGER',
// [1]   id: '1',
// [1]   type: 'trigger',
// [1]   typeVersion: '0.0.1',
// [1]   category: 'Flow Control',
// [1]   description: '워크플로우의 시작점, 수동 또는 자동으로 트리거됨',
// [1]   position: { x: 12, y: 12 }
// [1] }
// [1] 🟩 triggerId 1


import { getInputEdges, getPrevNodeIds, getPrevResults, logPrevNodeInfo } from './INodeExecutor';

import { INodeExecutor } from './INodeExecutor';
import { WorkflowNodeData, TriggerNodeData, WorkflowPayload, AnyWorkflowNode } from 'src/common/types/workflow';
import { Edge } from '@xyflow/react';

export class TriggerNodeExecutor implements INodeExecutor {
  constructor(
    private node: TriggerNodeData,
    private nodes: AnyWorkflowNode[],
    private edges: Edge[],
    private triggerId: string
  ) {}
  async execute(
    context: any,
    nodes: AnyWorkflowNode[],
    edges: Edge[],
    triggerId: string
  ) {
    console.log('🟩 context', context); // 🟩 context {}
    console.log('🟦 this.node', this.node); // 현재 실행 중인 노드만 나옴
    console.log('🟩 triggerId', triggerId);
    console.log('🟦 this.node', this.node.label); // 현재 실행 중인 노드만 나옴

    
    const inputEdges = getInputEdges(this.node.id.toString(), edges);
    const prevNodeIds = getPrevNodeIds(this.node.id.toString(), edges);
    const prevResults = getPrevResults(this.node.id.toString(), edges, context);
    logPrevNodeInfo(this.node.id.toString(), edges, context);


    return { node : this.node, triggerId: triggerId, started: true, timestamp: new Date().toISOString() };
  }
}
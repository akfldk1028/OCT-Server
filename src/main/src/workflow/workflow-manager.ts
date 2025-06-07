// ===== 6. 수정된 WorkflowManager =====
// main/workflow/workflow-manager.ts

import { v4 as uuidv4 } from 'uuid';
import { IWorkflowExecutor, IWorkflowRepository } from './interfaces/workflow-interfaces';
import { SerializedWorkflow } from './persistence/workflow-persistence-types';
import { AnyWorkflowNode } from '@/common/types/workflow';
import { Edge } from '@xyflow/react';

export class WorkflowManager {
  constructor(
    private repository: IWorkflowRepository,
    private executor: IWorkflowExecutor
  ) {}
  
  // 새 워크플로우 생성
  async createWorkflow(params: {
    name: string;
    description?: string;
    nodes: AnyWorkflowNode[];
    edges: Edge[];
    author?: string;
    tags?: string[];
  }): Promise<SerializedWorkflow> {
    const workflow: SerializedWorkflow = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: params.author,
      tags: params.tags,
      nodes: params.nodes,
      edges: params.edges
    };
    
    await this.repository.save(workflow);
    return workflow;
  }
  
  // 워크플로우 업데이트
  async updateWorkflow(
    id: string,
    updates: Partial<SerializedWorkflow>
  ): Promise<SerializedWorkflow> {
    const existing = await this.repository.load(id);
    
    const updated: SerializedWorkflow = {
      ...existing,
      ...updates,
      id: existing.id, // ID는 변경 불가
      updatedAt: new Date().toISOString()
    };
    
    await this.repository.save(updated);
    return updated;
  }
  
  // 워크플로우 실행
  async executeWorkflow(id: string, triggerId?: string): Promise<void> {
    const workflow = await this.repository.load(id);
    
    await this.executor.executeWorkflow({
      nodes: workflow.nodes,
      edges: workflow.edges,
      triggerId: triggerId || uuidv4()
    });
  }
  
  // 워크플로우 복제
  async cloneWorkflow(id: string, newName: string): Promise<SerializedWorkflow> {
    const original = await this.repository.load(id);
    
    const cloned: SerializedWorkflow = {
      ...original,
      id: uuidv4(),
      name: newName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.repository.save(cloned);
    return cloned;
  }
  
  // 워크플로우 내보내기 (공유용)
  async exportWorkflow(id: string, includeMetadata = true): Promise<string> {
    const workflow = await this.repository.load(id);
    
    if (!includeMetadata) {
      // 메타데이터 제거
      const { metadata, author, ...essentials } = workflow;
      return JSON.stringify(essentials, null, 2);
    }
    
    return JSON.stringify(workflow, null, 2);
  }
  
  // 워크플로우 가져오기
  async importWorkflow(
    jsonString: string,
    options?: {
      overwriteId?: boolean;
      addImportTag?: boolean;
    }
  ): Promise<SerializedWorkflow> {
    const workflow = JSON.parse(jsonString) as SerializedWorkflow;
    
    if (options?.overwriteId || await this.repository.exists(workflow.id)) {
      workflow.id = uuidv4();
    }
    
    if (options?.addImportTag) {
      workflow.tags = [...(workflow.tags || []), 'imported'];
    }
    
    workflow.updatedAt = new Date().toISOString();
    
    await this.repository.save(workflow);
    return workflow;
  }
  
  // 워크플로우 검색
  async searchWorkflows(query: {
    name?: string;
    tags?: string[];
    author?: string;
  }): Promise<SerializedWorkflow[]> {
    const manifest = await this.repository.list();
    let workflows = manifest.workflows;
    
    if (query.name) {
      workflows = workflows.filter(w => 
        w.name.toLowerCase().includes(query.name!.toLowerCase())
      );
    }
    
    if (query.tags?.length) {
      workflows = workflows.filter(w =>
        query.tags!.some(tag => w.tags?.includes(tag))
      );
    }
    
    // 실제 워크플로우 로드
    return Promise.all(
      workflows.map(w => this.repository.load(w.id))
    );
  }
}
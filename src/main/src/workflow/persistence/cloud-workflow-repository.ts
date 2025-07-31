// ===== 4. 수정된 cloud-workflow-repository.ts =====
// main/workflow/persistence/cloud-workflow-repository.ts

import { SerializedWorkflow, WorkflowManifest } from "./workflow-persistence-types";
import { IWorkflowRepository } from "../interfaces/workflow-interfaces";
import { FileWorkflowRepository } from "./file-workflow-repository";

export class CloudWorkflowRepository implements IWorkflowRepository {
  constructor(
    private apiEndpoint: string,
    private authToken: string,
    private localCache: FileWorkflowRepository
  ) {}
  
  async save(workflow: SerializedWorkflow): Promise<void> {
    // 로컬 캐시에 먼저 저장
    await this.localCache.save(workflow);
    
    // 클라우드에 업로드
    try {
      await fetch(`${this.apiEndpoint}/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
      });
    } catch (error) {
      console.error('Failed to sync to cloud:', error);
      // 로컬은 성공했으므로 에러를 던지지 않음
    }
  }
  
  async load(id: string): Promise<SerializedWorkflow> {
    try {
      // 클라우드에서 먼저 시도
      const response = await fetch(`${this.apiEndpoint}/workflows/${id}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        const workflow = await response.json();
        // 로컬 캐시 업데이트
        await this.localCache.save(workflow);
        return workflow;
      }
    } catch (error) {
      console.error('Failed to load from cloud:', error);
    }
    
    // 클라우드 실패시 로컬에서 로드
    return this.localCache.load(id);
  }
  
  async list(): Promise<WorkflowManifest> {
    try {
      const response = await fetch(`${this.apiEndpoint}/workflows`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to list from cloud:', error);
    }
    
    return this.localCache.list();
  }
  
  async delete(id: string): Promise<void> {
    // 로컬에서 먼저 삭제
    await this.localCache.delete(id);
    
    // 클라우드에서도 삭제
    try {
      await fetch(`${this.apiEndpoint}/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
    } catch (error) {
      console.error('Failed to delete from cloud:', error);
    }
  }
  
  async exists(id: string): Promise<boolean> {
    // 로컬 캐시 먼저 확인
    if (await this.localCache.exists(id)) {
      return true;
    }
    
    // 클라우드 확인
    try {
      const response = await fetch(`${this.apiEndpoint}/workflows/${id}`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async export(id: string): Promise<string> {
    return this.localCache.export(id);
  }
  
  async import(jsonString: string): Promise<SerializedWorkflow> {
    return this.localCache.import(jsonString);
  }
}
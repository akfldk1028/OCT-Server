// ===== 4. 수정된 File Repository =====
// main/workflow/persistence/file-workflow-repository.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { SerializedWorkflow, WorkflowManifest } from './workflow-persistence-types';
import { IWorkflowRepository } from '../interfaces/workflow-interfaces';

export class FileWorkflowRepository implements IWorkflowRepository {
  private workflowDir: string;
  private manifestPath: string;
  
  constructor(customPath?: string) {
    this.workflowDir = customPath || path.join(
      app.getPath('documents'),
      'MCPWorkflows'
    );
    this.manifestPath = path.join(this.workflowDir, 'manifest.json');
    
    this.ensureDirectory();
  }
  
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.workflowDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create workflow directory:', error);
    }
  }
  
  async save(workflow: SerializedWorkflow): Promise<void> {
    try {
      // 워크플로우 파일 저장
      const filePath = path.join(this.workflowDir, `${workflow.id}.json`);
      await fs.writeFile(
        filePath,
        JSON.stringify(workflow, null, 2),
        'utf-8'
      );
      
      // 매니페스트 업데이트
      await this.updateManifest(workflow);
      
      console.log(`✅ Workflow saved: ${workflow.name} (${workflow.id})`);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw new Error(`Failed to save workflow: ${error}`);
    }
  }
  
  async load(id: string): Promise<SerializedWorkflow> {
    try {
      const filePath = path.join(this.workflowDir, `${id}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load workflow ${id}: ${error}`);
    }
  }
  
  async list(): Promise<WorkflowManifest> {
    try {
      const content = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // 매니페스트가 없으면 빈 매니페스트 반환
      return { workflows: [] };
    }
  }
  
  async delete(id: string): Promise<void> {
    try {
      const filePath = path.join(this.workflowDir, `${id}.json`);
      await fs.unlink(filePath);
      
      // 매니페스트에서도 제거
      const manifest = await this.list();
      manifest.workflows = manifest.workflows.filter(w => w.id !== id);
      await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log(`🗑️ Workflow deleted: ${id}`);
    } catch (error) {
      throw new Error(`Failed to delete workflow ${id}: ${error}`);
    }
  }
  
  async exists(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.workflowDir, `${id}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  async export(id: string): Promise<string> {
    const workflow = await this.load(id);
    return JSON.stringify(workflow, null, 2);
  }
  
  async import(jsonString: string): Promise<SerializedWorkflow> {
    try {
      const workflow = JSON.parse(jsonString) as SerializedWorkflow;
      
      // 유효성 검증
      this.validateWorkflow(workflow);
      
      // ID 충돌 방지
      if (await this.exists(workflow.id)) {
        workflow.id = `${workflow.id}_imported_${Date.now()}`;
      }
      
      // 저장
      await this.save(workflow);
      
      return workflow;
    } catch (error) {
      throw new Error(`Failed to import workflow: ${error}`);
    }
  }
  
  private async updateManifest(workflow: SerializedWorkflow): Promise<void> {
    const manifest = await this.list();
    
    // 기존 항목 찾기
    const existingIndex = manifest.workflows.findIndex(w => w.id === workflow.id);
    
    const manifestEntry = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      tags: workflow.tags
    };
    
    if (existingIndex >= 0) {
      manifest.workflows[existingIndex] = manifestEntry;
    } else {
      manifest.workflows.push(manifestEntry);
    }
    
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));
  }
  
  private validateWorkflow(workflow: any): void {
    if (!workflow.id || !workflow.name || !workflow.version) {
      throw new Error('Invalid workflow: missing required fields');
    }
    
    if (!Array.isArray(workflow.nodes) || !Array.isArray(workflow.edges)) {
      throw new Error('Invalid workflow: nodes and edges must be arrays');
    }
  }
}

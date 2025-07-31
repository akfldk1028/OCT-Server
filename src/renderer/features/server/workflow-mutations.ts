import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';
import { updateWorkflow, deleteWorkflow } from './workflow-queries';
import { makeSSRClient } from '@/renderer/supa-client';

// 🔥 워크플로우 Mutation Hook 타입
export interface WorkflowItem {
  id: number;
  name: string;
  description?: string | null;
  status: 'draft' | 'active' | 'archived' | 'shared';
  is_template: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    name?: string;
    username?: string;
  };
  client_type?: 'claude_desktop' | 'local' | 'openai' | 'mixed' | 'unknown';
  target_clients?: string[];
}

export interface MutationCallbacks {
  onSuccess: (message: string, description: string) => void;
  onError: (title: string, description: string) => void;
  onUpdate: (updater: (workflows: WorkflowItem[]) => WorkflowItem[]) => void;
  setLoading: (workflowId: number, loading: boolean) => void;
}

// 🔥 워크플로우 Mutations 클래스
export class WorkflowMutations {
  private userId: string;
  private callbacks: MutationCallbacks;

  constructor(userId: string, callbacks: MutationCallbacks) {
    this.userId = userId;
    this.callbacks = callbacks;
  }

  // 🗑️ 워크플로우 삭제
  async deleteWorkflow(workflowId: number, workflowName: string): Promise<boolean> {
    const confirmDelete = window.confirm(
      `정말로 "${workflowName}" 워크플로우를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
    );
    
    if (!confirmDelete) return false;
    
    try {
      this.callbacks.setLoading(workflowId, true);
      
      const { client } = makeSSRClient();
      await deleteWorkflow(client as any, {
        workflow_id: workflowId,
        profile_id: this.userId,
      });
      
      // UI에서 제거
      this.callbacks.onUpdate(workflows => workflows.filter(w => w.id !== workflowId));
      
      this.callbacks.onSuccess(
        '워크플로우 삭제 완료',
        `"${workflowName}"이 성공적으로 삭제되었습니다.`
      );
      
      console.log('🗑️ 워크플로우 삭제 완료:', workflowId);
      return true;
      
    } catch (error) {
      console.error('❌ 워크플로우 삭제 실패:', error);
      this.callbacks.onError(
        '삭제 실패',
        error instanceof Error ? error.message : '워크플로우를 삭제할 수 없습니다.'
      );
      return false;
    } finally {
      this.callbacks.setLoading(workflowId, false);
    }
  }

  // 📊 상태 변경
  async updateStatus(workflowId: number, newStatus: 'draft' | 'active' | 'archived' | 'shared', workflowName: string): Promise<boolean> {
    try {
      this.callbacks.setLoading(workflowId, true);
      
      const { client } = makeSSRClient();
      await updateWorkflow(client as any, {
        workflow_id: workflowId,
        profile_id: this.userId,
        data: { status: newStatus }
      });
      
      // UI 업데이트
      this.callbacks.onUpdate(workflows => 
        workflows.map(workflow => 
          workflow.id === workflowId 
            ? { ...workflow, status: newStatus }
            : workflow
        )
      );
      
      const statusText = {
        draft: '초안',
        active: '활성',
        archived: '보관됨',
        shared: '공유됨'
      }[newStatus];
      
      this.callbacks.onSuccess(
        '상태 변경 완료',
        `"${workflowName}"의 상태가 "${statusText}"로 변경되었습니다.`
      );
      
      console.log('📊 상태 변경 완료:', { workflowId, newStatus });
      return true;
      
    } catch (error) {
      console.error('❌ 상태 변경 실패:', error);
      this.callbacks.onError(
        '상태 변경 실패',
        error instanceof Error ? error.message : '상태를 변경할 수 없습니다.'
      );
      return false;
    } finally {
      this.callbacks.setLoading(workflowId, false);
    }
  }

  // ⭐ 템플릿 토글
  async toggleTemplate(workflowId: number, currentValue: boolean, workflowName: string): Promise<boolean> {
    try {
      this.callbacks.setLoading(workflowId, true);
      
      const { client } = makeSSRClient();
      await updateWorkflow(client as any, {
        workflow_id: workflowId,
        profile_id: this.userId,
        data: { is_template: !currentValue }
      });
      
      // UI 업데이트
      this.callbacks.onUpdate(workflows => 
        workflows.map(workflow => 
          workflow.id === workflowId 
            ? { ...workflow, is_template: !currentValue }
            : workflow
        )
      );
      
      this.callbacks.onSuccess(
        !currentValue ? '템플릿으로 설정' : '템플릿 해제',
        `"${workflowName}"을 ${!currentValue ? '템플릿으로 설정' : '템플릿에서 해제'}했습니다.`
      );
      
      console.log('⭐ 템플릿 토글 완료:', { workflowId, newValue: !currentValue });
      return true;
      
    } catch (error) {
      console.error('❌ 템플릿 상태 변경 실패:', error);
      this.callbacks.onError('변경 실패', '템플릿 상태를 변경할 수 없습니다.');
      return false;
    } finally {
      this.callbacks.setLoading(workflowId, false);
    }
  }

  // 🌐 공개 상태 토글
  async togglePublic(workflowId: number, currentValue: boolean, workflowName: string): Promise<boolean> {
    try {
      this.callbacks.setLoading(workflowId, true);
      
      const { client } = makeSSRClient();
      await updateWorkflow(client as any, {
        workflow_id: workflowId,
        profile_id: this.userId,
        data: { is_public: !currentValue }
      });
      
      // UI 업데이트
      this.callbacks.onUpdate(workflows => 
        workflows.map(workflow => 
          workflow.id === workflowId 
            ? { ...workflow, is_public: !currentValue }
            : workflow
        )
      );
      
      this.callbacks.onSuccess(
        !currentValue ? '공개로 설정' : '비공개로 설정',
        `"${workflowName}"을 ${!currentValue ? '공개' : '비공개'}로 변경했습니다.`
      );
      
      console.log('🌐 공개 상태 토글 완료:', { workflowId, newValue: !currentValue });
      return true;
      
    } catch (error) {
      console.error('❌ 공개 상태 변경 실패:', error);
      this.callbacks.onError('변경 실패', '공개 상태를 변경할 수 없습니다.');
      return false;
    } finally {
      this.callbacks.setLoading(workflowId, false);
    }
  }

  // ✏️ 이름 변경
  async updateName(workflowId: number, newName: string): Promise<boolean> {
    if (!newName.trim()) {
      this.callbacks.onError('이름 입력 필요', '워크플로우 이름은 필수입니다.');
      return false;
    }

    try {
      this.callbacks.setLoading(workflowId, true);
      
      const { client } = makeSSRClient();
      await updateWorkflow(client as any, {
        workflow_id: workflowId,
        profile_id: this.userId,
        data: { name: newName.trim() }
      });
      
      // UI 업데이트
      this.callbacks.onUpdate(workflows => 
        workflows.map(workflow => 
          workflow.id === workflowId 
            ? { ...workflow, name: newName.trim() }
            : workflow
        )
      );
      
      this.callbacks.onSuccess(
        '이름 변경 완료',
        `워크플로우 이름이 "${newName.trim()}"로 변경되었습니다.`
      );
      
      console.log('✏️ 이름 변경 완료:', { workflowId, newName: newName.trim() });
      return true;
      
    } catch (error) {
      console.error('❌ 이름 변경 실패:', error);
      this.callbacks.onError('이름 변경 실패', '이름을 변경할 수 없습니다.');
      return false;
    } finally {
      this.callbacks.setLoading(workflowId, false);
    }
  }
}

// 🔥 React Hook for Workflow Mutations
export const useWorkflowMutations = (
  userId: string | undefined,
  onSuccess: (title: string, description: string) => void,
  onError: (title: string, description: string) => void,
  onUpdate: (updater: (workflows: WorkflowItem[]) => WorkflowItem[]) => void,
  setLoading: (workflowId: number, loading: boolean) => void
) => {
  if (!userId) {
    throw new Error('userId is required for workflow mutations');
  }

  const mutations = new WorkflowMutations(userId, {
    onSuccess,
    onError,
    onUpdate,
    setLoading
  });

  return {
    deleteWorkflow: mutations.deleteWorkflow.bind(mutations),
    updateStatus: mutations.updateStatus.bind(mutations),
    toggleTemplate: mutations.toggleTemplate.bind(mutations),
    togglePublic: mutations.togglePublic.bind(mutations),
    updateName: mutations.updateName.bind(mutations),
  };
}; 
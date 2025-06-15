import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';

// 🔥 사용자의 워크플로우 목록 가져오기 (SSR용)
export const getUserWorkflows = async (
  client: SupabaseClient<Database>,
  params: {
    profile_id: string;
    status?: 'draft' | 'active' | 'archived' | 'shared';
    limit?: number;
    offset?: number;
  }
) => {
  const { profile_id, status, limit = 50, offset = 0 } = params;
  
  try {
    let query = client
      .from('workflows')
      .select(`
        *,
        profiles (
          profile_id,
          name,
          username,
          avatar
        )
      `)
      .eq('profile_id', profile_id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch user workflows:', error);
    throw error;
  }
};

// 🔥 워크플로우 상세 정보 (노드+엣지 포함) (SSR용)
export const getWorkflowWithDetails = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    profile_id: string;
  }
) => {
  const { workflow_id, profile_id } = params;
  
  try {
    // 1. 워크플로우 기본 정보
    const { data: workflow, error: workflowError } = await client
      .from('workflows')
      .select(`
        *,
        profiles (
          profile_id,
          name,
          username,
          avatar
        )
      `)
      .eq('id', workflow_id)
      .eq('profile_id', profile_id)
      .single();
      
    if (workflowError) throw workflowError;
    if (!workflow) return null;
    
    // 2. 관련 노드들 (서버 정보 포함)
    const { data: nodes, error: nodesError } = await client
      .from('workflow_nodes')
      .select(`
        *,
        mcp_servers:original_server_id (
          id,
          name,
          description,
          primary_url,
          github_info,
          metadata
        )
      `)
      .eq('workflow_id', workflow_id);
      
    if (nodesError) throw nodesError;
    
    // 3. 관련 엣지들
    const { data: edges, error: edgesError } = await client
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflow_id);
      
    if (edgesError) throw edgesError;
    
    return {
      ...workflow,
      nodes: nodes || [],
      edges: edges || []
    };
  } catch (error) {
    console.error('Failed to fetch workflow details:', error);
    throw error;
  }
};

// 🔥 워크플로우 생성 (SSR용)
export const createWorkflow = async (
  client: SupabaseClient<Database>,
  data: {
    profile_id: string;
    name: string;
    description?: string;
    flow_structure: any;
    status?: 'draft' | 'active' | 'archived' | 'shared';
    tags?: string[];
    is_public?: boolean;
    is_template?: boolean;
  }
) => {
  try {
    const { data: workflow, error } = await client
      .from('workflows')
      .insert({
        ...data,
        status: data.status || 'draft',
        is_public: data.is_public || false,
        is_template: data.is_template || false,
      })
      .select()
      .single();
      
    if (error) throw error;
    return workflow;
  } catch (error) {
    console.error('Failed to create workflow:', error);
    throw error;
  }
};

// 🔥 워크플로우 업데이트 (SSR용)
export const updateWorkflow = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    profile_id: string;
    data: Partial<{
      name: string;
      description: string;
      flow_structure: any;
      status: 'draft' | 'active' | 'archived' | 'shared';
      tags: string[];
      is_public: boolean;
      is_template: boolean;
    }>;
  }
) => {
  const { workflow_id, profile_id, data } = params;
  
  try {
    const { data: workflow, error } = await client
      .from('workflows')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow_id)
      .eq('profile_id', profile_id)
      .select()
      .single();
      
    if (error) throw error;
    return workflow;
  } catch (error) {
    console.error('Failed to update workflow:', error);
    throw error;
  }
};

// 🔥 워크플로우 노드 저장 (SSR용)
export const saveWorkflowNodes = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    nodes: Array<{
      node_id: string;
      node_type: string;
      position_x: number;
      position_y: number;
      node_config?: any;
      original_server_id?: number;
      user_mcp_usage_id?: number;
      client_id?: number;
    }>;
  }
) => {
  const { workflow_id, nodes } = params;
  
  try {
    // 1. 기존 노드들 삭제
    await client
      .from('workflow_nodes')
      .delete()
      .eq('workflow_id', workflow_id);
    
    // 2. 새 노드들 삽입
    if (nodes.length > 0) {
      const { data, error } = await client
        .from('workflow_nodes')
        .insert(
          nodes.map(node => ({
            workflow_id,
            ...node,
          }))
        )
        .select();
        
      if (error) throw error;
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to save workflow nodes:', error);
    throw error;
  }
};

// 🔥 워크플로우 엣지 저장 (SSR용)
export const saveWorkflowEdges = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    edges: Array<{
      edge_id: string;
      source_node_id: string;
      target_node_id: string;
      source_handle?: string;
      target_handle?: string;
      edge_config?: any;
    }>;
  }
) => {
  const { workflow_id, edges } = params;
  
  try {
    // 1. 기존 엣지들 삭제
    await client
      .from('workflow_edges')
      .delete()
      .eq('workflow_id', workflow_id);
    
    // 2. 새 엣지들 삽입
    if (edges.length > 0) {
      const { data, error } = await client
        .from('workflow_edges')
        .insert(
          edges.map(edge => ({
            workflow_id,
            ...edge,
          }))
        )
        .select();
        
      if (error) throw error;
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to save workflow edges:', error);
    throw error;
  }
};

// 🔥 워크플로우 삭제 (SSR용)
export const deleteWorkflow = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    profile_id: string;
  }
) => {
  const { workflow_id, profile_id } = params;
  
  try {
    // 1. 관련 데이터들 먼저 삭제 (순서 중요)
    await client.from('workflow_nodes').delete().eq('workflow_id', workflow_id);
    await client.from('workflow_edges').delete().eq('workflow_id', workflow_id);
    await client.from('workflow_executions').delete().eq('workflow_id', workflow_id);
    await client.from('workflow_shares').delete().eq('workflow_id', workflow_id);
    
    // 2. 워크플로우 삭제
    const { data, error } = await client
      .from('workflows')
      .delete()
      .eq('id', workflow_id)
      .eq('profile_id', profile_id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to delete workflow:', error);
    throw error;
  }
};

// 🔥 워크플로우 실행 기록 생성 (SSR용)


// 🔥 사용자 워크플로우 실행 기록 (SSR용)
export const getUserWorkflowExecutions = async (
  client: SupabaseClient<Database>,
  params: {
    profile_id: string;
    workflow_id?: number;
    limit?: number;
    offset?: number;
  }
) => {
  const { profile_id, workflow_id, limit = 50, offset = 0 } = params;
  
  try {
    let query = client
      .from('workflow_executions')
      .select(`
        *,
        workflows:workflow_id (
          id,
          name
        )
      `)
      .eq('profile_id', profile_id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (workflow_id) {
      query = query.eq('workflow_id', workflow_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch workflow executions:', error);
    throw error;
  }
};

// 🔥 공개 워크플로우/템플릿 조회 (SSR용)
export const getPublicWorkflows = async (
  client: SupabaseClient<Database>,
  params: {
    is_template?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const { is_template, limit = 20, offset = 0 } = params;
  
  try {
    let query = client
      .from('workflows')
      .select(`
        id,
        name,
        description,
        tags,
        is_template,
        execution_count,
        created_at
      `)
      .eq('is_public', true)
      .order('execution_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
      
    if (is_template !== undefined) {
      query = query.eq('is_template', is_template);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch public workflows:', error);
    throw error;
  }
};

// 🔥 공유 토큰으로 워크플로우 가져오기 (SSR용)
export const getWorkflowByShareToken = async (
  client: SupabaseClient<Database>,
  params: {
    share_token: string;
  }
) => {
  const { share_token } = params;
  
  try {
    // 1. 공유 정보 먼저 조회 (권한 확인)
    const { data: shareData, error: shareError } = await client
      .from('workflow_shares')
      .select(`
        *,
        workflows (
          id,
          name,
          description,
          flow_structure,
          created_at,
          updated_at,
          profiles (
            profile_id,
            name,
            username,
            avatar
          )
        )
      `)
      .eq('share_token', share_token)
      .eq('is_active', true)
      .single();
      
    if (shareError) throw shareError;
    if (!shareData) {
      throw new Error('워크플로우 공유를 찾을 수 없습니다.');
    }
    
    // 2. 만료 시간 확인
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      throw new Error('공유 링크가 만료되었습니다.');
    }
    
    // 3. 뷰 권한 확인
    if (!shareData.can_view) {
      throw new Error('이 워크플로우를 볼 권한이 없습니다.');
    }
    
    const workflow = shareData.workflows;
    if (!workflow) {
      throw new Error('워크플로우를 찾을 수 없습니다.');
    }
    
    // 4. 관련 노드들 (서버 정보 포함)
    const { data: nodes, error: nodesError } = await client
      .from('workflow_nodes')
      .select(`
        *,
        mcp_servers:original_server_id (
          id,
          name,
          description,
          primary_url,
          github_info,
          metadata
        )
      `)
      .eq('workflow_id', workflow.id);
      
    if (nodesError) throw nodesError;
    
    // 5. 관련 엣지들
    const { data: edges, error: edgesError } = await client
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflow.id);
      
    if (edgesError) throw edgesError;
    
    // 6. 다운로드 카운트 업데이트 (선택적)
    await client
      .from('workflow_shares')
      .update({ 
        download_count: (shareData.download_count || 0) + 1 
      })
      .eq('id', shareData.id);
    
    return {
      workflow: {
        ...workflow,
        nodes: nodes || [],
        edges: edges || []
      },
      shareInfo: {
        share_token: shareData.share_token,
        share_title: shareData.share_title,
        share_description: shareData.share_description,
        can_view: shareData.can_view,
        can_copy: shareData.can_copy,
        can_edit: shareData.can_edit,
        download_count: shareData.download_count,
        created_at: shareData.created_at,
        expires_at: shareData.expires_at,
      }
    };
  } catch (error) {
    console.error('Failed to fetch workflow by share token:', error);
    throw error;
  }
};

// 워크플로우 실행 기록 저장 (새로운 실행 시작 시)
export async function saveWorkflowExecution(
  client: SupabaseClient,
  payload: {
    workflow_id: number;
    user_id: string;
    execution_id: string;
    status?: 'running' | 'completed' | 'failed' | 'cancelled';
    result_data?: any;
    error_message?: string;
    nodes_executed?: number;
    nodes_failed?: number;
  }
) {
  console.log('🔥 [saveWorkflowExecution] 실행 기록 저장:', payload);
  
  const { data, error } = await client
    .from('workflow_executions')
    .insert({
      workflow_id: payload.workflow_id,
      user_id: payload.user_id,
      execution_id: payload.execution_id,
      status: payload.status || 'running',
      result_data: payload.result_data || null,
      error_message: payload.error_message || null,
      nodes_executed: payload.nodes_executed || 0,
      nodes_failed: payload.nodes_failed || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [saveWorkflowExecution] 저장 실패:', error);
    throw error;
  }

  console.log('✅ [saveWorkflowExecution] 저장 성공:', data);
  return data;
}

// 워크플로우 실행 기록 업데이트 (완료/실패 시)
export async function updateWorkflowExecution(
  client: SupabaseClient,
  executionId: string,
  updates: {
    status: 'completed' | 'failed' | 'cancelled';
    result_data?: any;
    error_message?: string;
    duration_ms?: number;
    nodes_executed?: number;
    nodes_failed?: number;
  }
) {
  console.log('🔄 [updateWorkflowExecution] 실행 기록 업데이트:', { executionId, updates });
  
  const { data, error } = await client
    .from('workflow_executions')
    .update({
      ...updates,
      completed_at: new Date().toISOString(),
    })
    .eq('execution_id', executionId)
    .select()
    .single();

  if (error) {
    console.error('❌ [updateWorkflowExecution] 업데이트 실패:', error);
    throw error;
  }

  console.log('✅ [updateWorkflowExecution] 업데이트 성공:', data);
  return data;
}

// 워크플로우 공유/템플릿 저장
export async function createWorkflowShare(
  client: SupabaseClient,
  payload: {
    workflow_id: number;
    shared_by_user_id: string;
    share_type?: 'template' | 'public' | 'link';
    share_title?: string;
    share_description?: string;
    share_token?: string;
    can_view?: boolean;
    can_copy?: boolean;
    can_edit?: boolean;
    expires_at?: string;
  }
) {
  console.log('📤 [createWorkflowShare] 공유/템플릿 생성:', payload);
  
  const { data, error } = await client
    .from('workflow_shares')
    .insert({
      workflow_id: payload.workflow_id,
      shared_by_user_id: payload.shared_by_user_id,
      share_type: payload.share_type || 'link',
      share_title: payload.share_title,
      share_description: payload.share_description,
      share_token: payload.share_token || `share_${Date.now()}`,
      can_view: payload.can_view ?? true,
      can_copy: payload.can_copy ?? true,
      can_edit: payload.can_edit ?? false,
      expires_at: payload.expires_at,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createWorkflowShare] 저장 실패:', error);
    throw error;
  }

  console.log('✅ [createWorkflowShare] 저장 성공:', data);
  return data;
} 
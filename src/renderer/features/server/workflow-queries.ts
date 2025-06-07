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
export const createWorkflowExecution = async (
  client: SupabaseClient<Database>,
  data: {
    workflow_id: number;
    profile_id: string;
    execution_id: string;
    status?: 'running' | 'completed' | 'failed' | 'cancelled';
    result_data?: any;
    error_message?: string;
  }
) => {
  try {
    const { data: execution, error } = await client
      .from('workflow_executions')
      .insert({
        ...data,
        status: data.status || 'running',
      })
      .select()
      .single();
      
    if (error) throw error;
    return execution;
  } catch (error) {
    console.error('Failed to create workflow execution:', error);
    throw error;
  }
};

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
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';

// 🔥 템플릿 마켓플레이스 - 인기 템플릿 목록
export const getPopularTemplates = async (
  client: SupabaseClient<Database>,
  params: {
    category?: string;
    limit?: number;
    offset?: number;
  } = {}
) => {
  const { category, limit = 20, offset = 0 } = params;
  
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
        ),
        workflow_shares!inner (
          id,
          share_type,
          download_count,
          share_title,
          share_description,
          created_at
        )
      `)
      .eq('is_template', true)
      .eq('is_public', true)
      .eq('workflow_shares.share_type', 'template')
      .eq('workflow_shares.is_active', true)
      .order('execution_count', { ascending: false }) // 실행 횟수로 정렬
      .range(offset, offset + limit - 1);
      
    if (category) {
      query = query.contains('tags', [category]);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    console.log('🔥 [getPopularTemplates] 인기 템플릿 조회 완료:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ [getPopularTemplates] 실패:', error);
    throw error;
  }
};

// 🔥 템플릿 상세 정보 (노드+엣지 포함)
export const getTemplateDetails = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
  }
) => {
  const { workflow_id } = params;
  
  try {
    // 1. 템플릿 기본 정보
    const { data: template, error: templateError } = await client
      .from('workflows')
      .select(`
        *,
        profiles (
          profile_id,
          name,
          username,
          avatar
        ),
        workflow_shares!inner (
          id,
          share_type,
          download_count,
          share_title,
          share_description,
          created_at
        )
      `)
      .eq('id', workflow_id)
      .eq('is_template', true)
      .eq('is_public', true)
      .eq('workflow_shares.share_type', 'template')
      .single();
      
    if (templateError) throw templateError;
    if (!template) return null;
    
    // 2. 관련 노드들
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
    
    console.log('🔥 [getTemplateDetails] 템플릿 상세 조회 완료:', template.name);
    return {
      ...template,
      nodes: nodes || [],
      edges: edges || []
    };
  } catch (error) {
    console.error('❌ [getTemplateDetails] 실패:', error);
    throw error;
  }
};

// 🔥 템플릿을 내 워크플로우로 복사
export const copyTemplateToMyWorkflow = async (
  client: SupabaseClient<Database>,
  params: {
    template_id: number;
    my_profile_id: string;
    new_name?: string;
  }
) => {
  const { template_id, my_profile_id, new_name } = params;
  
  try {
    // 1. 원본 템플릿 가져오기
    const templateWithDetails = await getTemplateDetails(client, { workflow_id: template_id });
    if (!templateWithDetails) {
      throw new Error('템플릿을 찾을 수 없습니다');
    }
    
    // 2. 내 워크플로우로 복사
    const { data: newWorkflow, error: workflowError } = await client
      .from('workflows')
      .insert({
        profile_id: my_profile_id, // 내 ID로 변경
        name: new_name || `${templateWithDetails.name} (복사본)`,
        description: `${templateWithDetails.description || ''}\n\n📋 템플릿에서 복사됨`,
        flow_structure: templateWithDetails.flow_structure,
        tags: templateWithDetails.tags,
        status: 'draft', // 초안으로 생성
        is_public: false, // 비공개로 생성
        is_template: false, // 일반 워크플로우로 생성
      })
      .select()
      .single();
      
    if (workflowError) throw workflowError;
    
    // 3. 노드들 복사
    if (templateWithDetails.nodes && templateWithDetails.nodes.length > 0) {
      const newNodes = templateWithDetails.nodes.map(node => ({
        workflow_id: newWorkflow.id,
        node_id: node.node_id,
        node_type: node.node_type,
        position_x: node.position_x,
        position_y: node.position_y,
        node_config: node.node_config,
        original_server_id: node.original_server_id,
        user_mcp_usage_id: node.user_mcp_usage_id,
        client_id: node.client_id,
      }));
      
      const { error: nodesError } = await client
        .from('workflow_nodes')
        .insert(newNodes);
        
      if (nodesError) throw nodesError;
    }
    
    // 4. 엣지들 복사
    if (templateWithDetails.edges && templateWithDetails.edges.length > 0) {
      const newEdges = templateWithDetails.edges.map(edge => ({
        workflow_id: newWorkflow.id,
        edge_id: edge.edge_id,
        source_node_id: edge.source_node_id,
        target_node_id: edge.target_node_id,
        source_handle: edge.source_handle,
        target_handle: edge.target_handle,
        edge_config: edge.edge_config,
      }));
      
      const { error: edgesError } = await client
        .from('workflow_edges')
        .insert(newEdges);
        
      if (edgesError) throw edgesError;
    }
    
    // 5. 템플릿 다운로드 수 증가
    await client
      .from('workflow_shares')
      .update({ 
        download_count: (templateWithDetails.workflow_shares[0]?.download_count || 0) + 1 
      })
      .eq('workflow_id', template_id)
      .eq('share_type', 'template');
    
    console.log('🎉 [copyTemplateToMyWorkflow] 템플릿 복사 완료:', newWorkflow.name);
    return newWorkflow;
    
  } catch (error) {
    console.error('❌ [copyTemplateToMyWorkflow] 실패:', error);
    throw error;
  }
};

// 🔥 내 워크플로우를 템플릿으로 공유 (관리자용)
export const publishAsTemplate = async (
  client: SupabaseClient<Database>,
  params: {
    workflow_id: number;
    profile_id: string;
    share_title: string;
    share_description: string;
    is_featured?: boolean;
  }
) => {
  const { workflow_id, profile_id, share_title, share_description, is_featured = false } = params;
  
  try {
    // 1. 워크플로우를 템플릿으로 설정
    const { data: updatedWorkflow, error: workflowError } = await client
      .from('workflows')
      .update({
        is_template: true,
        is_public: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workflow_id)
      .eq('profile_id', profile_id)
      .select()
      .single();
      
    if (workflowError) throw workflowError;
    
    // 2. 템플릿 공유 정보 생성
    const { data: templateShare, error: shareError } = await client
      .from('workflow_shares')
      .insert({
        workflow_id,
        shared_by_user_id: profile_id,
        share_type: 'template',
        share_title,
        share_description,
        share_token: `template_${workflow_id}_${Date.now()}`,
        can_view: true,
        can_copy: true,
        can_edit: false,
      })
      .select()
      .single();
      
    if (shareError) throw shareError;
    
    console.log('🎉 [publishAsTemplate] 템플릿 공개 완료:', share_title);
    return { workflow: updatedWorkflow, share: templateShare };
    
  } catch (error) {
    console.error('❌ [publishAsTemplate] 실패:', error);
    throw error;
  }
};

// 🔥 템플릿 카테고리별 조회
export const getTemplatesByCategory = async (
  client: SupabaseClient<Database>,
  params: {
    category: string;
    limit?: number;
  } = { category: 'AI' }
) => {
  return getPopularTemplates(client, params);
};

// 🔥 관리자용: 추천 템플릿 목록
export const getFeaturedTemplates = async (
  client: SupabaseClient<Database>,
  params: {
    limit?: number;
  } = {}
) => {
  const { limit = 10 } = params;
  
  try {
    // 실행 횟수가 많고 다운로드가 많은 템플릿들
    const { data, error } = await client
      .from('workflows')
      .select(`
        *,
        profiles (
          profile_id,
          name,
          username,
          avatar
        ),
        workflow_shares!inner (
          id,
          share_type,
          download_count,
          share_title,
          share_description,
          created_at
        )
      `)
      .eq('is_template', true)
      .eq('is_public', true)
      .eq('workflow_shares.share_type', 'template')
      .eq('workflow_shares.is_active', true)
      .gte('execution_count', 5) // 최소 5회 이상 실행된 것들
      .gte('workflow_shares.download_count', 3) // 최소 3회 이상 다운로드된 것들
      .order('workflow_shares.download_count', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    console.log('🌟 [getFeaturedTemplates] 추천 템플릿 조회 완료:', data?.length);
    return data || [];
  } catch (error) {
    console.error('❌ [getFeaturedTemplates] 실패:', error);
    throw error;
  }
}; 
import { DateTime } from 'luxon';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGE_SIZE } from './contants';
import type { Database } from '../../supa-client';

export const productListSelect = `*`;

export const getProductsBypopularity = async (
  client: SupabaseClient<Database>,
  {
    limit,
    page = 1,
  }: {
    limit: number;
    page?: number;
  },
) => {
  const { data, error } = await client
    .from('github_popularity_view')
    .select(productListSelect)
    .order('stars', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * limit - 1);
  if (error) throw error;
  return data;
};

export const getProductsByDateRange = async (
  client: SupabaseClient<Database>,
  {
    startDate,
    endDate,
    limit,
    page = 1,
  }: {
    startDate: DateTime;
    endDate: DateTime;
    limit: number;
    page?: number;
  },
) => {
  const { data, error } = await client
    .from('github_popularity_view')
    .select(productListSelect)
    .order('stars', { ascending: false })
    .gte('updated_at', startDate.toISO())
    .lte('updated_at', endDate.toISO())
    .range((page - 1) * PAGE_SIZE, page * limit - 1);
  if (error) throw error;
  return data;
};

export const getProductPagesByDateRange = async (
  client: SupabaseClient<Database>,
  {
    startDate,
    endDate,
  }: {
    startDate: DateTime;
    endDate: DateTime;
  },
) => {
  const { count, error } = await client
    .from('github_popularity_view')
    .select(`product_id`, { count: 'exact', head: true })
    .gte('created_at', startDate.toISO())
    .lte('created_at', endDate.toISO());
  if (error) throw error;
  if (!count) return 1;
  return Math.ceil(count / PAGE_SIZE);
};

// 모든 고유 카테고리 목록 가져오기
export const getCategories = async (client: SupabaseClient<Database>) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('categories')
    .not('categories', 'is', null);

  if (error) throw error;

  // 모든 카테고리 추출 및 중복 제거
  const categorySet = new Set<string>();
  data.forEach((item) => {
    if (item.categories) {
      item.categories.split(', ').forEach((cat) => {
        if (cat.trim()) categorySet.add(cat.trim());
      });
    }
  });

  // 카테고리 목록 형식화
  const categoryList = Array.from(categorySet).map((name, index) => ({
    id: index + 1,
    name,
    description: `${name} 관련 MCP 서버 모음`,
  }));

  return categoryList;
};

// 특정 ID의 카테고리 정보 가져오기
export const getCategory = async (
  client: SupabaseClient<Database>,
  { Id }: { Id: number },
) => {
  const categories = await getCategories(client);
  const category = categories.find((cat) => cat.id === Id);

  if (!category) {
    throw new Error(`카테고리 ID ${Id}를 찾을 수 없습니다`);
  }

  return category;
};

// export const getProductsByCategory = async (
//   client: SupabaseClient<Database>,
//   {
//     categoryId,
//     page,
//   }: {
//     categoryId: number;
//     page: number;
//   }
// ) => {
//   const { data, error } = await client
//     .from("product_list_view")
//     .select(productListSelect)
//     .eq("category_id", categoryId)
//     .order("promoted_from", { ascending: true })
//     .order("upvotes", { ascending: false })
//     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
//   if (error) throw error;
//   return data;
// };

// export const getCategoryPages = async (
//   client: SupabaseClient<Database>,
//   { categoryId }: { categoryId: number }
// ) => {
//   const { count, error } = await client
//     .from("products")
//     .select(`product_id`, { count: "exact", head: true })
//     .eq("category_id", categoryId);
//   if (error) throw error;
//   if (!count) return 1;
//   return Math.ceil(count / PAGE_SIZE);
// };

// export const getProductsBySearch = async (
//   client: SupabaseClient<Database>,
//   { query, page }: { query: string; page: number }
// ) => {
//   const { data, error } = await client
//     .from("product_list_view")
//     .select(productListSelect)
//     .or(`name.ilike.%${query}%, tagline.ilike.%${query}%`)
//     .order("promoted_from", { ascending: true })
//     .order("upvotes", { ascending: false })
//     .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
//   if (error) throw error;
//   return data;
// };

// export const getPagesBySearch = async (
//   client: SupabaseClient<Database>,
//   { query }: { query: string }
// ) => {
//   const { count, error } = await client
//     .from("products")
//     .select(`product_id`, { count: "exact", head: true })
//     .or(`name.ilike.%${query}%, tagline.ilike.%${query}%`);
//   if (error) throw error;
//   if (!count) return 1;
//   return Math.ceil(count / PAGE_SIZE);
// };

export const getProductById = async (
  client: SupabaseClient<Database>,
  { id }: { id: number }, // uniqueId 대신 id 사용
) => {
  const { data, error } = await client
    .from('mcp_servers_full_view')
    .select('*')
    .eq('id', id) // 데이터베이스 필드명은 그대로 유지 (테이블 컬럼명은 변경 불가)
    .single();
  if (error) {
    console.error('[getProductById] Error:', error);
    throw error;
  }
  console.log('[getProductById] Result:', data);
  return data;
};

// export const getReviews = async (
//   client: SupabaseClient<Database>,
//   { productId }: { productId: string }
// ) => {
//   const { data, error } = await client
//     .from("reviews")
//     .select(
//       `
//         review_id,
//         rating,
//         review,
//         created_at,
//         user:profiles!inner (
//           name,username,avatar
//         )
//       `
//     )
//     .eq("product_id", productId)
//     .order("created_at", { ascending: false });
//   if (error) throw error;
//   return data;
// };

export const getServersByCategory = async (
  client: SupabaseClient<Database>,
  { categoryName }: { categoryName: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .ilike('categories', `%${categoryName}%`);

  if (error) throw error;
  return data;
};

// 인기도 카테고리별 서버 목록 가져오기
export const getServersByPopularityCategory = async (
  client: SupabaseClient<Database>,
  { popularityCategory }: { popularityCategory: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .eq('popularity_category', popularityCategory);

  if (error) throw error;
  return data;
};

// 활동 상태별 서버 목록 가져오기
export const getServersByActivityStatus = async (
  client: SupabaseClient<Database>,
  { activityStatus }: { activityStatus: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .eq('activity_status', activityStatus);

  if (error) throw error;
  return data;
};

// 태그별 서버 목록 가져오기
export const getServersByTag = async (
  client: SupabaseClient<Database>,
  { tag }: { tag: string },
) => {
  const { data, error } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .ilike('tags', `%${tag}%`);

  if (error) throw error;
  return data;
};

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";

export const createProductReview = async (
  client: SupabaseClient<Database>,
  {
    productId,
    review,
    rating,
    userId,
  }: { productId: string; review: string; rating: number; userId: string }
) => {
  const { error } = await client.from("reviews").insert({
    product_id: +productId,
    review,
    rating,
    profile_id: userId,
  });
  if (error) {
    throw error;
  }
};

export const createProduct = async (
  client: SupabaseClient<Database>,
  {
    name,
    tagline,
    description,
    howItWorks,
    url,
    iconUrl,
    categoryId,
    userId,
  }: {
    name: string;
    tagline: string;
    description: string;
    howItWorks: string;
    url: string;
    iconUrl: string;
    categoryId: number;
    userId: string;
  }
) => {
  const { data, error } = await client
    .from("products")
    .insert({
      name,
      tagline,
      description,
      how_it_works: howItWorks,
      url,
      icon: iconUrl,
      category_id: categoryId,
      profile_id: userId,
    })
    .select("product_id")
    .single();
  if (error) throw error;
  return data.product_id;
};

export const toggleProductUpvote = async (
  client: SupabaseClient<Database>,
  { productId, userId }: { productId: string; userId: string }
) => {
  const { count } = await client
    .from("product_upvotes")
    .select("*", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("profile_id", userId);
  if (count === 0) {
    await client.from("product_upvotes").insert({
      product_id: Number(productId),
      profile_id: userId,
    });
  } else {
    await client
      .from("product_upvotes")
      .delete()
      .eq("product_id", Number(productId))
      .eq("profile_id", userId);
  }
};

export const recordPromotion = async (
  client: SupabaseClient<Database>,
  {
    productId,
    promotionFrom,
    promotionTo,
  }: { productId: string; promotionFrom: string; promotionTo: string }
) => {
  const { error } = await client
    .from("products")
    .update({
      promoted_from: promotionFrom,
      promoted_to: promotionTo,
    })
    .eq("product_id", productId);
  if (error) throw error;
};



// 환경 변수 타입 정의
// 환경 변수 타입 정의
export type EnvVariables = Record<string, string>;

// 서버 설치 함수
export const installServer = async (
  client: SupabaseClient<Database>,
  params: {
    serverId: string | number;
    command: string;
    envVars?: EnvVariables;
  }
) => {
  const { serverId, command, envVars = {} } = params;
  
  try {
    // window.api.installServer 함수 사용 (preload.js에 정의됨)
    const { api } = window as any;
    
    if (!api || typeof api.installServer !== 'function') {
      throw new Error('API installServer function not available');
    }
    
    // api.installServer 함수 호출 - 개별 매개변수로 전달
    // 함수 정의: installServer: async (name: string, command: string, envVars?: Record<string, string>)
    const result = await api.installServer(serverId.toString(), command, envVars);
    
    console.log(`'${serverId}' 서버 설치 요청 완료`, result);
    return result;
  } catch (error) {
    console.error('Installation error:', error);
    throw error;
  }
};
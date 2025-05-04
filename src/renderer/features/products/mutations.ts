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

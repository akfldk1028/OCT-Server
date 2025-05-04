import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";

export const claimIdea = async (
  client: SupabaseClient<Database>,
  { ideaId, userId }: { ideaId: string; userId: string }
) => {
  const { error } = await client
    .from("gpt_ideas")
    .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq("gpt_idea_id", ideaId);
  if (error) {
    throw error;
  }
};

export const insertIdeas = async (
  client: SupabaseClient<Database>,
  ideas: string[]
) => {
  const { error } = await client.from("gpt_ideas").insert(
    ideas.map((idea) => ({
      idea,
    }))
  );
  if (error) {
    throw error;
  }
};

export const toggleIdeaLike = async (
  client: SupabaseClient<Database>,
  { userId, ideaId }: { userId: string; ideaId: string }
) => {
  const { count, error } = await client
    .from("gpt_ideas_likes")
    .select("*", { count: "exact", head: true })
    .eq("gpt_idea_id", ideaId)
    .eq("profile_id", userId);
  if (error) {
    throw error;
  }
  if (count === 0) {
    await client.from("gpt_ideas_likes").insert({
      gpt_idea_id: Number(ideaId),
      profile_id: userId,
    });
  } else {
    await client.from("gpt_ideas_likes").delete().eq("gpt_idea_id", ideaId);
  }
};

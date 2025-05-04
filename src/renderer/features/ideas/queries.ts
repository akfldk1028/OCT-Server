import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';

export const getGptIdeas = async (
  client: SupabaseClient<Database>,
  { limit }: { limit: number },
) => {
  const { data, error } = await client
    .from('gpt_ideas_view')
    .select('*')
    .limit(limit);
  if (error) {
    throw error;
  }
  return data;
};

export const getGptIdea = async (
  client: SupabaseClient<Database>,
  { ideaId }: { ideaId: string },
) => {
  const { data, error } = await client
    .from('gpt_ideas_view')
    .select('*')
    .eq('gpt_idea_id', ideaId)
    .single();
  if (error) {
    throw error;
  }
  return data;
};

export const getClaimedIdeas = async (
  client: SupabaseClient<Database>,
  { userId }: { userId: string },
) => {
  const { data, error } = await client
    .from('gpt_ideas')
    .select('gpt_idea_id, claimed_at, idea')
    .eq('claimed_by', userId);
  if (error) {
    throw error;
  }
  return data;
};

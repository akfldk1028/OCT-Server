import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';


export const getClients = async (
  client: SupabaseClient<Database>,
  {
    limit,
    filter,
  }: {
    limit?: number;
    filter?: string;
  } = {},
) => {
  try {
    const baseQuery = client.from('clients').select('*');

    if (limit) {
      baseQuery.limit(limit);
    }

    if (filter && filter !== '') {
      baseQuery.ilike('name', `%${filter}%`);
    }

    const { data, error } = await baseQuery;
    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to execute clients query:', error);
    throw error;
  }
};

export const getClientById = async (
  client: SupabaseClient<Database>,
  { clientId }: { clientId: number },
) => {
  try {
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('client_id', clientId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Failed to fetch client with ID ${clientId}:`, error);
    throw error;
  }
};




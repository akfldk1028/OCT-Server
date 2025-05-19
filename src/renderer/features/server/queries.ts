import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../supa-client';

export const getJobs = async (
  client: SupabaseClient<Database>,
  {
    limit,
    location,
    type,
    salary,
  }: {
    limit: number;
    location?: string;
    type?: string;
    salary?: string;
  },
) => {
  const baseQuery = client
    .from('jobs')
    .select(
      `
    job_id,
    position,
    overview,
    company_name,
    company_logo,
    company_location,
    job_type,
    location,
    salary_range,
    created_at
    `,
    )
    .limit(limit);
  if (location && location !== '') {
    baseQuery.eq('location', location);
  }
  if (type && type !== '') {
    baseQuery.eq('job_type', type);
  }
  if (salary && salary !== '') {
    baseQuery.eq('salary_range', salary);
  }
  const { data, error } = await baseQuery;
  if (error) {
    throw error;
  }
  return data;
};

export const getJobById = async (
  client: SupabaseClient<Database>,
  { jobId }: { jobId: string },
) => {
  const { data, error } = await client
    .from('jobs')
    .select('*')
    .eq('job_id', jobId)
    .single();
  if (error) throw error;
  return data;
};

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

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "~/supa-client";

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
  }
) => {
  const baseQuery = client
    .from("jobs")
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
    `
    )
    .limit(limit);
  if (location && location !== "") {
    baseQuery.eq("location", location);
  }
  if (type && type !== "") {
    baseQuery.eq("job_type", type);
  }
  if (salary && salary !== "") {
    baseQuery.eq("salary_range", salary);
  }
  const { data, error } = await baseQuery;
  if (error) {
    throw error;
  }
  return data;
};

export const getJobById = async (
  client: SupabaseClient<Database>,
  { jobId }: { jobId: string }
) => {
  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("job_id", jobId)
    .single();
  if (error) throw error;
  return data;
};

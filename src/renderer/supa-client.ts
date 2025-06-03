// dotenv 추가

import {
  createBrowserClient,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from '@supabase/ssr';
import type { MergeDeep, SetNonNullable, SetFieldType } from 'type-fest';
import { createClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';
import type { Database as SupabaseDatabase } from './database.types';
import { IS_ELECTRON, IS_WEB } from './utils/environment';

export type Database = MergeDeep<
  SupabaseDatabase,
  {
    public: {
      Tables: {
        clients: {
          Row: SetNonNullable<
            SupabaseDatabase['public']['Tables']['clients']['Row']
          >;
        };
      };
      Views: {
        mcp_servers_full_view: {
          Row: SetNonNullable<
            SupabaseDatabase['public']['Views']['mcp_servers_full_view']['Row']
          >;
        };
        github_popularity_view: {
          Row: SetNonNullable<
            SupabaseDatabase['public']['Views']['github_popularity_view']['Row']
          >;
        };
        mcp_server_categories_view: {
          Row: SetNonNullable<
            SupabaseDatabase['public']['Views']['mcp_server_categories_view']['Row']
          >;
        };
      };
    };
  }
>;

// 자주 사용되는 클라이언트 타입을 별도로 export
export type ClientRow = Database['public']['Tables']['clients']['Row'];

export const supabase = createBrowserClient<Database>(
  'https://mcrzlwriffyulnswfckt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jcnpsd3JpZmZ5dWxuc3dmY2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMDkwMjIsImV4cCI6MjA2Mjg4NTAyMn0.zHbjwPZnJUBx-u6YWsBVKS36gtO2WnUQT3ieZRLzKRQ',
);

// 환경별 SSR 클라이언트
export const makeSSRClient = (request?: Request) => {
  const headers = new Headers();

  if (IS_ELECTRON) {
    // 일렉트론 환경: window.electronEnv 사용
    const { electronEnv } = window as any;

    if (!electronEnv?.supabaseUrl || !electronEnv?.supabaseAnonKey) {
      console.error(
        'Supabase environment variables not found in window.electronEnv. Check preload script.',
      );
      throw new Error(
        'Supabase environment variables are not configured correctly.',
      );
    }

    const client = createServerClient<Database>(
      electronEnv.supabaseUrl,
      electronEnv.supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return parseCookieHeader(request?.headers.get('Cookie') ?? '') as {
              name: string;
              value: string;
            }[];
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              headers.append(
                'Set-Cookie',
                serializeCookieHeader(name, value, options),
              );
            });
          },
        },
      },
    );

    console.log('Using client created by makeSSRClient (Electron)');
    return {
      client,
      headers,
    };
  }
  if (IS_WEB) {
    console.log('[makeSSRClient][WEB] request:', request);
    console.log('[makeSSRClient][WEB] request.headers:', request?.headers);
    console.log(
      '[makeSSRClient][WEB] request.headers.get("Cookie"):',
      request?.headers?.get('Cookie'),
    );
    console.log('[makeSSRClient][WEB] headers 객체:', headers);

    const client = createServerClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookies = parseCookieHeader(
              request?.headers.get('Cookie') ?? '',
            );
            const found = cookies.find((c) => c.name === name);
            return found?.value ?? null;
          },
          set(name, value, options) {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, value, options),
            );
          },
          remove(name, options) {
            headers.append(
              'Set-Cookie',
              serializeCookieHeader(name, '', { ...options, maxAge: 0 }),
            );
          },
        },
      },
    );

    console.log('Using client created by makeSSRClient (Web)');
    return {
      client,
      headers,
    };
  }
  throw new Error('Unknown environment');
};

// 환경별 Admin 클라이언트
export const makeAdminClient = () => {
  if (IS_ELECTRON) {
    // 일렉트론 환경: window.electronEnv 사용
    const { electronEnv } = window as any;
    if (!electronEnv?.supabaseUrl || !electronEnv?.supabaseServiceRoleKey) {
      console.warn(
        'Admin Client: Supabase URL or Service Role Key not found in electronEnv.',
        'Ensure SERVICE_ROLE_KEY is exposed in preload if needed (use with caution!)',
      );
      return createClient<Database>('http://localhost', 'dummy-key');
    }
    return createClient<Database>(
      electronEnv.supabaseUrl,
      electronEnv.supabaseServiceRoleKey,
    );
  }
  if (IS_WEB) {
    // 웹 환경: process.env 사용 (dotenv로 로드됨)
    return createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  console.warn('Unknown environment for Admin Client');
  return createClient<Database>('http://localhost', 'dummy-key');
};

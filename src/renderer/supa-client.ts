import {
  createBrowserClient,
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { MergeDeep, SetNonNullable, SetFieldType } from "type-fest";
import type { Database as SupabaseDatabase } from "./database.types";
import { createClient } from "@supabase/supabase-js";
import type { CookieOptions } from "@supabase/ssr";

export type Database = MergeDeep<
  SupabaseDatabase,
  {
    public: {
      Views: {
        mcp_servers_full_view: {
          Row: SetNonNullable<
            SupabaseDatabase["public"]["Views"]["mcp_servers_full_view"]["Row"]
          >;
        };
        github_popularity_view: {
          Row: SetNonNullable<
            SupabaseDatabase["public"]["Views"]["github_popularity_view"]["Row"]
          >;
        };
        mcp_server_categories_view: {
          Row: SetNonNullable<
            SupabaseDatabase["public"]["Views"]["mcp_server_categories_view"]["Row"]
          >;
        };
      };
    };
  }
>;

export const browserClient = createBrowserClient<Database>(
  "https://micuqwjpvmdexbwwpixv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pY3Vxd2pwdm1kZXhid3dwaXh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxNzI1ODUsImV4cCI6MjA1Mzc0ODU4NX0.rrQjkegUKt--UjOIHJ2qmmJGtf-8VgBz7yVtWN_xP0k"
);

export const makeSSRClient = ( request?: Request ) => {
  const electronEnv = (window as any).electronEnv;

  if (!electronEnv?.supabaseUrl || !electronEnv?.supabaseAnonKey) {
    console.error(
      "Supabase environment variables not found in window.electronEnv. Check preload script."
    );
    throw new Error("Supabase environment variables are not configured correctly.");
  }

  const headers = new Headers();

  const client = createServerClient<Database>(
    electronEnv.supabaseUrl,
    electronEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request?.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    }
  );

  return {
    client,
    headers,
  };
};

export const makeAdminClient = () => {
    const electronEnv = (window as any).electronEnv;
    if (!electronEnv?.supabaseUrl || !electronEnv?.supabaseServiceRoleKey) {
       console.warn(
         "Admin Client: Supabase URL or Service Role Key not found in electronEnv.",
         "Ensure SERVICE_ROLE_KEY is exposed in preload if needed (use with caution!)"
        );
       return createClient<Database>('http://localhost', 'dummy-key');
    }
    return createClient<Database>(
      electronEnv.supabaseUrl,
      electronEnv.supabaseServiceRoleKey
    );
}

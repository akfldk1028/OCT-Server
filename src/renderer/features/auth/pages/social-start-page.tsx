import { z } from "zod";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { redirect } from "react-router";
import { makeSSRClient, supabase } from "../../../supa-client";

const paramsSchema = z.object({
  provider: z.enum(["github", "kakao"]),
});

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { success, data } = paramsSchema.safeParse(params);
  console.log(success, data);
  if (!success) {
    return redirect("/auth/login");
  }
  const { provider } = data;


  console.log(provider);
  const redirectTo = `/auth/social/${provider}/complete`;

  const {
    data: { url },
    error,
  } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
    },
  });
  if (url) {
    return redirect(url);
  }
  if (error) {
    throw error;
  }
};

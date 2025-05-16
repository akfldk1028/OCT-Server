import { makeSSRClient, supabase } from "../../../supa-client";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await supabase.auth.signOut();
  return redirect("/");
};

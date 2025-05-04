import { makeAdminClient, makeSSRClient } from "~/supa-client";
import type { Route } from "./+types/product-visit-page";
import { redirect } from "react-router";

export const loader = async ({ params }: Route.LoaderArgs) => {
  const adminClient = makeAdminClient();
  const { error, data } = await adminClient
    .from("products")
    .select("url")
    .eq("product_id", params.productId)
    .single();
  if (data) {
    await adminClient.rpc("track_event", {
      event_type: "product_visit",
      event_data: {
        product_id: params.productId,
      },
    });
    return redirect(data.url);
  }
};

import { makeSSRClient } from "../../../supa-client";
import type { Route } from "./+types/product-upvote-page";
import { getLoggedInUserId } from "~/features/users/queries";
import { toggleProductUpvote } from "../mutations";

export async function action({ request, params }: Route.ActionArgs) {
  const { client } = makeSSRClient(request);
  const userId = await getLoggedInUserId(client);
  await toggleProductUpvote(client, {
    productId: params.productId,
    userId,
  });
  return {
    ok: true,
  };
}

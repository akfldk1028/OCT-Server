import { z } from "zod";
import type { Route } from "./+types/promote-success-page";
import { Hero } from "~/common/components/hero";
import { makeSSRClient } from "~/supa-client";
import { redirect } from "react-router";
import { DateTime } from "luxon";
import { recordPromotion } from "../mutations";

const paramsSchema = z.object({
  paymentType: z.string(),
  orderId: z.string().uuid(),
  paymentKey: z.string(),
  amount: z.coerce.number(),
});

const TOSS_SECRET_KEY = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const { success, data } = paramsSchema.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!success) {
    return new Response(null, { status: 400 });
  }
  const encryptedSecretKey = `Basic ${Buffer.from(
    TOSS_SECRET_KEY + ":"
  ).toString("base64")}`;
  const response = await fetch(
    "https://api.tosspayments.com/v1/payments/confirm",
    {
      method: "POST",
      headers: {
        Authorization: encryptedSecretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: data.orderId,
        paymentKey: data.paymentKey,
        amount: data.amount,
      }),
    }
  );
  const { metadata } = await response.json<{
    metadata: {
      productName: string;
      productId: string;
      promotionFrom: string;
      promotionTo: string;
    };
  }>();
  if (!metadata) {
    return redirect(`/products/promote`);
  }
  const { client } = makeSSRClient(request);
  await recordPromotion(client, {
    productId: metadata.productId,
    promotionFrom: metadata.promotionFrom,
    promotionTo: metadata.promotionTo,
  });
  return { ...metadata };
};

export default function PromoteSuccessPage({
  loaderData,
}: Route.ComponentProps) {
  return (
    <div>
      <Hero title="Payment Completed" subtitle="Thank you for your payment." />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-2 justify-center items-center">
          <p>
            Your product "{loaderData.productName}" will be promoted from{" "}
            {DateTime.fromISO(loaderData.promotionFrom).toFormat("yyyy-MM-dd")}{" "}
            to {DateTime.fromISO(loaderData.promotionTo).toFormat("yyyy-MM-dd")}
            .
          </p>
        </div>
      </div>
    </div>
  );
}

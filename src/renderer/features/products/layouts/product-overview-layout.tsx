import React, { useState } from 'react';
import { StarIcon, GitFork } from "lucide-react";
import { ChevronUpIcon } from "lucide-react";
import {
  Link,
  NavLink,
  Outlet,
  useFetcher,
  useLoaderData,
  useOutletContext,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { Button, buttonVariants } from "../../../common/components/ui/button";
import { cn } from "../../../lib/utils";
import { getProductById } from "../queries";
import { makeSSRClient } from "../../../supa-client";
import { Tables } from "../../../database.types";
import { InstallSidebar } from "../components/InstallSidebar";
import { InitialAvatar } from "../../../common/components/ui/initial-avatar";

// GitHubPopularityView 타입 정의
type mcp_servers_full_view = Tables<"mcp_servers_full_view">;

// 로더 데이터 타입 정의
type ProductOverviewLoaderData = {
  product: mcp_servers_full_view;
};

export function meta() {
  return [
    { title: "Product Overview " /* Replace with dynamic title if using alternative method */ },
    { name: "description", content: "View product details and information" /* Replace if needed */ },
  ];
}

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs & { params: { id?: number } }): Promise<ProductOverviewLoaderData> => {
  const id = params?.id;
  console.log('[ProductOverviewLayout loader] id:', id);

  if (!id) {
    throw new Response("Product ID not found in URL params", { status: 400 });
  }
  const { client, headers } = makeSSRClient(request);
  try {
    const product = await getProductById(client as any, {
       id: id, // id를 id로 전달 (일관성 유지)
    });
    console.log('[ProductOverviewLayout loader] product data:', product);
    if (!product) {
      throw new Response("Product not found", { status: 404 });
    }

    return { product: product as unknown as mcp_servers_full_view };
  } catch (error) {
    console.error('[ProductOverviewLayout loader] Error:', error);
    throw error;
  }
};

export default function ProductOverviewLayout() {
  const { product } = useLoaderData() as ProductOverviewLoaderData;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  console.log('[ProductOverviewLayout] Rendered with loaderData:',  product);
  console.log('[ProductOverviewLayout] id:',  product?.id);

  // const fetcher = useFetcher();
  // const { isLoggedIn } = useOutletContext<{ isLoggedIn: boolean }>();

  // if (!loaderData) {
  //   return <div>Loading product details...</div>;
  // }
  // install 빨간버튼 like 추가


  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-10 md:gap-0 justify-between">
        <div className="flex flex-col items-center md:items-start md:flex-row gap-10">
          <div className="size-40 rounded-xl overflow-hidden shadow-xl bg-primary/50 flex items-center justify-center">
            {product.local_image_path ? (
              <img
                src={product.local_image_path}
                alt={product.name || ''}
                className="size-full object-cover"
              />
            ) : (
              <InitialAvatar
                initials={product.fallback_avatar_initials || '??'}
                colorString={product.fallback_avatar_color || product.name || 'default'}
                size={100}
              />
            )}
          </div>
          <div>
            <h1 className="text-5xl text-center md:text-left font-bold">
              {product.name || 'Product Name'}
            </h1>
            <div className="mt-5 flex md:justify-start text-lg md:text-base justify-center items-center gap-5">
              <span className="text-muted-foreground flex items-center gap-2">
                <StarIcon className="size-4" /> {product.stars || 0} stars
              </span>
              <span className="text-muted-foreground flex items-center gap-2">
                <GitFork className="size-4" /> {product.forks || 0} forks
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Button
            variant={"secondary"}
            size="lg"
            asChild
            className="text-lg w-full h-14 px-10"
          >
            <Link to={product.github_url || '#'}>
              Visit Repository
            </Link>
          </Button>

          <Button
            size="lg"
            className="text-lg w-full h-14 px-10"
            onClick={() => setIsSidebarOpen(true)}
          >
                Install
          </Button>

          {/* <fetcher.Form
            method="post"
            action={`/products/${loaderData.product.product_id}/upvote`}
          >
            <Button
              size="lg"
              className={cn({
                "md:text-lg w-full md:w-auto h-10 md:h-14 px-10 flex items-center gap-2":
                  true,
                "border-white bg-white text-primary hover:bg-white/90":
                  loaderData.product.is_upvoted,
              })}
            >
              <ChevronUpIcon className="size-4" />
              Upvote ({loaderData.product.upvotes})
            </Button>
          </fetcher.Form> */}
        </div>
      </div>
      <div className="flex gap-2.5">
        <NavLink
          end
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: "outline" }),
              isActive && "bg-accent text-foreground "
            )
          }
          to={`/products/${product.id}/overview`}
        >
          Overview
        </NavLink>
        <NavLink
          className={({ isActive }) =>
            cn(
              buttonVariants({ variant: "outline" }),
              isActive && "bg-accent text-foreground "
            )
          }
          to={`/products/${product.id}/reviews`}
        >
          Details
        </NavLink>
      </div>
      <div>
        <Outlet
          context={{
            product_id: product.id,
            description: "Repository description will be displayed here.",
            how_it_works: "Repository details will be displayed here.",
            review_count: 0,
          }}
        />
      </div>
      {isSidebarOpen && (
          <InstallSidebar
              product={product}
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
          />
      )}
    </div>
  );
}

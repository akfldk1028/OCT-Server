import { StarIcon } from "lucide-react";
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

type Product = {
  product_id: string | number;
  name: string;
  icon: string;
  tagline: string;
  average_rating: number;
  reviews: number;
  is_upvoted: boolean;
  upvotes: number;
  description: string;
  how_it_works: string;
};

type ProductOverviewLoaderData = {
  product: Product;
};

export function meta(/* { data }: MetaFunction<unknown, { loaderData: ProductOverviewLoaderData }> */) {
  return [
    { title: "Product Overview | wemake" /* Replace with dynamic title if using alternative method */ },
    { name: "description", content: "View product details and information" /* Replace if needed */ },
  ];
}

export const loader = async ({
  request,
  params,
}: LoaderFunctionArgs & { params: { productId?: string } }): Promise<ProductOverviewLoaderData> => {
  const productId = params?.productId;
  if (!productId) {
    throw new Response("Product ID not found in URL params", { status: 400 });
  }
  const { client, headers } = makeSSRClient(request);
  const product = await getProductById(client as any, {
    productId: productId,
  });
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  return { product: product as unknown as Product };
};

export default function ProductOverviewLayout() {
  const { product: loaderData } = useLoaderData() as ProductOverviewLoaderData;

  const fetcher = useFetcher();
  const { isLoggedIn } = useOutletContext<{ isLoggedIn: boolean }>();

  if (!loaderData) {
    return <div>Loading product details...</div>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-10 md:gap-0 justify-between">
        <div className="flex flex-col items-center md:items-start md:flex-row gap-10">
          <div className="size-40 rounded-xl overflow-hidden shadow-xl bg-primary/50">
            <img
              src={loaderData.icon}
              alt={loaderData.name}
              className="size-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-5xl text-center md:text-left font-bold">
              {loaderData.name}
            </h1>
            <p className=" text-2xl font-light text-center md:text-left">
              {loaderData.tagline}
            </p>
            <div className="mt-5 flex md:justify-start text-lg md:text-base justify-center items-center gap-2">
              <div className="flex text-yellow-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className="size-4"
                    fill={
                      i < Math.floor(loaderData.average_rating)
                        ? "currentColor"
                        : "none"
                    }
                  />
                ))}
              </div>
              <span className="text-muted-foreground ">
                {loaderData.reviews} reviews
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:gap-5 gap-2.5">
          <Button
            variant={"secondary"}
            size="lg"
            asChild
            className="md:text-lg w-full md:w-auto h-10 md:h-14 px-10"
          >
            <Link to={`/products/${loaderData.product_id}/visit`}>
              Visit Website
            </Link>
          </Button>
          <fetcher.Form
            method="post"
            action={`/products/${loaderData.product_id}/upvote`}
          >
            <Button
              size="lg"
              className={cn({
                "md:text-lg w-full md:w-auto h-10 md:h-14 px-10 flex items-center gap-2":
                  true,
                "border-white bg-white text-primary hover:bg-white/90":
                  loaderData.is_upvoted,
              })}
            >
              <ChevronUpIcon className="size-4" />
              Upvote ({loaderData.upvotes})
            </Button>
          </fetcher.Form>
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
          to={`/products/${loaderData.product_id}/overview`}
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
          to={`/products/${loaderData.product_id}/reviews`}
        >
          Reviews
        </NavLink>
      </div>
      <div>
        <Outlet
          context={{
            product_id: loaderData.product_id,
            description: loaderData.description,
            how_it_works: loaderData.how_it_works,
            review_count: loaderData.reviews,
            isLoggedIn: isLoggedIn,
          }}
        />
      </div>
    </div>
  );
}

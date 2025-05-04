import { z } from "zod";
import type { Route } from "./+types/search-page";
import { Hero } from "~/common/components/hero";
import { ProductCard } from "../components/product-card";
import ProductPagination from "~/common/components/product-pagination";
import { Form, Link, useSearchParams } from "react-router";
import { Input } from "~/common/components/ui/input";
import { Button } from "~/common/components/ui/button";
import { getProductsBySearch, getPagesBySearch } from "../queries";
import { makeSSRClient } from "~/supa-client";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Search Products | wemake" },
    { name: "description", content: "Search for products" },
  ];
};

const searchParams = z.object({
  query: z.string().optional().default(""),
  page: z.coerce.number().optional().default(1),
});

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const { success, data: parsedData } = searchParams.safeParse(
    Object.fromEntries(url.searchParams)
  );
  if (!success) {
    throw new Error("Invalid params");
  }
  if (parsedData.query === "") {
    return { products: [], totalPages: 1 };
  }
  const { client, headers } = makeSSRClient(request);
  const products = await getProductsBySearch(client, {
    query: parsedData.query,
    page: parsedData.page,
  });
  const totalPages = await getPagesBySearch(client, {
    query: parsedData.query,
  });
  return { products, totalPages };
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") || "";
  return (
    <div className="space-y-10">
      <Hero
        title="Search"
        subtitle="Search for products by title or description"
      />
      <Form className="flex justify-center h-14 max-w-screen-sm items-center gap-2 mx-auto">
        <Input
          name="query"
          placeholder="Search for products"
          className="text-lg"
        />
        <Button type="submit">Search</Button>
      </Form>
      <div className="space-y-5 w-full max-w-screen-md mx-auto">
        {loaderData.products.map((product) => (
          <ProductCard
            key={product.product_id}
            id={product.product_id}
            name={product.name}
            description={product.tagline}
            reviewsCount={product.reviews}
            viewsCount={product.views}
            votesCount={product.upvotes}
            promotedFrom={product.promoted_from}
            isUpvoted={product.is_upvoted}
          />
        ))}
        {query && loaderData.products.length === 0 && (
          <div className="col-span-full">
            <p className=" text-center font-semibold text-muted-foreground">
              No products found for "{query}".
            </p>
          </div>
        )}
      </div>
      {loaderData.products.length > 0 && (
        <ProductPagination totalPages={loaderData.totalPages} />
      )}
    </div>
  );
}

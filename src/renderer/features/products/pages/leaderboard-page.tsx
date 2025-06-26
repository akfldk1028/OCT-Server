import { Hero } from "../../../common/components/hero";
import { Button } from "../../../common/components/ui/button";
import { ProductCard } from "../components/product-card";
import {Link, useLoaderData} from "react-router";
import { DateTime } from "luxon";
import { makeSSRClient } from "../../../supa-client";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { Tables } from "../../../database.types";
import { getProductsByDateRange } from "../queries";

// GitHubPopularityView 타입 정의
type GithubPopularityView = Tables<"github_popularity_view">;

// 로더 데이터 타입 정의
type LeaderboardLoaderData = {
  dailyProducts: GithubPopularityView[];
};

export const meta: MetaFunction = () => {
  return [
    { title: "Leaderboards | wemake" },
    { name: "description", content: "Top products leaderboard" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client, headers } = makeSSRClient(request);
  const [dailyProducts ] =
    await Promise.all([
      getProductsByDateRange(client as any, {
        startDate: DateTime.now().startOf("day"),
        endDate: DateTime.now().endOf("day"),
        limit: 50,
      }),
      // getProductsByDateRange(client, {
      //   startDate: DateTime.now().startOf("week"),
      //   endDate: DateTime.now().endOf("week"),
      //   limit: 7,
      // }),
      // getProductsByDateRange(client, {
      //   startDate: DateTime.now().startOf("month"),
      //   endDate: DateTime.now().endOf("month"),
      //   limit: 7,
      // }),
      // getProductsByDateRange(client, {
      //   startDate: DateTime.now().startOf("year"),
      //   endDate: DateTime.now().endOf("year"),
      //   limit: 7,
      // }),
    ]);
  return { dailyProducts };
};

export default function LeaderboardPage() {
  const { dailyProducts } = useLoaderData() as LeaderboardLoaderData;

  return (
    <div className="space-y-20">
      <Hero
        title="Leaderboards"
        subtitle="The most popular products on wemake"
      />
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Daily Leaderboard
          </h2>
          <p className="text-xl font-light text-foreground">
            The most popular products on wemake by day.
          </p>
        </div>
        {dailyProducts.map((product: GithubPopularityView, index: number) => (
              <ProductCard
                key={product.unique_id ?? index}
                id={product.id}
                uniqueId={product.unique_id}
                name={product.name}
                reviewsCount={0}
                viewsCount={0}
                isUpvoted={false}
                promotedFrom={null}
                stars={product.stars}
                forks={product.forks}
                githubUrl={product.github_url}
                owner={product.owner}
                repoName={product.repo_name}
                localImagePath={(product as any).local_image_path || null}
              />
        ))}
        <Button variant="link" asChild className="text-lg self-center">
          <Link to="/products/leaderboards/daily">
            Explore all products &rarr;
          </Link>
        </Button>
      </div>
    </div>
  );
}

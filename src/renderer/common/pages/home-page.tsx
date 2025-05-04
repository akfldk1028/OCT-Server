import {Link, type MetaFunction, useLoaderData} from "react-router";
import { ProductCard } from "../../features/products/components/product-card";
// import { PostCard } from "~/features/community/components/post-card";
// import { IdeaCard } from "~/features/ideas/components/idea-card";
// import { JobCard } from "~/features/jobs/components/job-card";
// import { TeamCard } from "~/features/teams/components/team-card";
import { getProductsBypopularity } from "../../features/products/queries";
// import { DateTime, Settings } from "luxon";
// import { getPosts } from "~/features/community/queries";
// import { getGptIdeas } from "~/features/ideas/queries";
// import { getJobs } from "~/features/jobs/queries";
// import { getTeams } from "~/features/teams/queries";
// import { makeSSRClient } from "~/supa-client";
import FlickeringGrid from "../components/ui/flickering-grid";
import { BlurFade } from "../components/ui/blur-fade";
import { VelocityScroll } from "../components/ui/scroll-based-velocity";
import { Marquee } from "../components/ui/marquee";
import { RetroGrid } from "../components/ui/retro-grid";
import { MagicCard } from "../components/ui/magic-card";
import { Ripple } from "../components/ui/ripple";
import { makeSSRClient } from "../../supa-client";
import { Button } from "../components/ui/button";
import type { Database } from "../../supa-client";
import { InitialAvatar } from "../components/ui/initial-avatar";
import { browserClient } from "../../supa-client";

// export type HomePageLoaderData = {
//   products: Product[];
//   posts: Post[];
//   ideas: Idea[];
//   jobs: Job[];
//   teams: Team[];
// };


export type HomePageLoaderData = {
  products: any;

};

// props 타입 수동 정의
type ComponentProps = {
  loaderData: HomePageLoaderData;
};

// Define the product type based on the view
type Product = Database["public"]["Views"]["github_popularity_view"]["Row"];

export const meta: MetaFunction = () => {
  return [
    { title: "Home | wemake" },
    { name: "description", content: "Welcome to wemake" },
  ];
};
export const loader = async (/* { request } : any */) => {
  try {

    const { client /*, headers */ } = makeSSRClient(); // headers might be unused now
    console.log("Using client created by makeSSRClient (Electron adapted)");
    const [products] = await Promise.all([
      getProductsBypopularity(client as any, { // 'as any' cast might still be needed depending on exact types
        limit: 8,
      }),
    ]);
    return {
      products,
    };
  } catch (error) {
    console.error("Home page loader error:", error);
    if (error instanceof Error) {
       console.error("Error details:", error.message, error.stack);
    }
    return {
      products: [],
    };
  }
};


export default  function HomePage() {
  const { products } = useLoaderData() as { products: Product[] };

  // Log the fetched products data to the console
  console.log("Fetched Products:", products);

  return (
    <>
      <div className="space-y-32 pb-20 w-full">
        <div className="relative h-[500px] w-full flex justify-center items-center bg-background overflow-hidden ">
          <FlickeringGrid
            className="z-0 absolute inset-0 size-full"
            squareSize={4}
            gridGap={5}
            color="#e11d48"
            maxOpacity={0.5}
            flickerChance={0.2}
          />
          <div className="flex flex-col text-center md:space-y-5 items-center">
            <BlurFade delay={0.25} duration={1} inView>
              <h2 className="font-bold text-5xl md:text-8xl">
                welcome to Context
              </h2>
            </BlurFade>
            <BlurFade delay={1} duration={1} inView>
              <span className="text-2xl md:text-5xl">
                the home of Context
              </span>
            </BlurFade>
          </div>
        </div>
        <div className="relative">
          <VelocityScroll
            defaultVelocity={4}
            className="font-display text-center text-5xl font-bold tracking-[-0.02em] md:leading-[5rem]"
            numRows={1}
          >
            <div className="flex items-center justify-center gap-4 p-4 flex-nowrap relative z-10">

              {products && products.length > 0 ? (
                 products.map((product, index) => (
                    <InitialAvatar
                      key={product.unique_id ?? index}
                      initials={product.fallback_avatar_initials}
                      colorString={product.fallback_avatar_color}
                      size={60}
                    />
                  ))
              ) : (
                <span>Loading Avatars...</span>
              )}
            </div>
          </VelocityScroll>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-background"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-background"></div>
        </div>
        <BlurFade delay={0.25} duration={1} inView>
          <div className="grid grid-cols-1 w-full md:grid-cols-3 gap-4">
            <div className="space-y-2.5 text-center md:text-left md:space-y-0">
              <h2 className="text-3xl md:text-5xl font-bold leading-10 md:leading-tight tracking-tight">
                Today's Products
              </h2>
              <p className="text-lg md:text-xl font-light text-foreground">
                The best products made by our community today.
              </p>
              <Button variant="link" asChild className="text-lg p-0">
                <Link to="/products/leaderboards">
                  Explore all products &rarr;
                </Link>
              </Button>
            </div>
            {products.map((product: Product, index: number) => (
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
              />
            ))}
          </div>
        </BlurFade>
        <BlurFade delay={0.25} duration={1} inView>
          <div className="space-y-10 relative md:h-[50vh] flex flex-col justify-center items-center overflow-hidden ">
            <div className="relative flex  flex-col justify-center items-center  md:p-64 z-50 md:bg-[radial-gradient(circle,hsl(var(--background))_40%,transparent_100%)] text-center md:text-left">
              <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                IdeasGPT
              </h2>

              <p className="max-w-2xl md:text-xl font-light text-foreground">
                AI generated startup ideas you can build.
              </p>

              <Button variant="link" asChild className="text-lg pl-0">
                <Link to="/ideas">View all ideas &rarr;</Link>
              </Button>
            </div>
            <div className="md:absolute w-full flex justify-between md:h-full h-[75vh]  top-0 left-0">


              <div className="hidden md:block pointer-events-none absolute right-0 h-10 w-full top-0 z-10 bg-gradient-to-b from-white dark:from-background"></div>
              <div className="hidden md:block pointer-events-none absolute left-0 h-10 w-full bottom-10 z-10 bg-gradient-to-t from-white dark:from-background"></div>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} duration={1} inView>
          <div className="space-y-10 grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-10">
            <div className="self-center text-center md:text-left">
              <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                Latest
              </h2>
              <p className="max-w-2xl md:text-xl font-light text-foreground">
                The latest discussions from our community.
              </p>
              <Button variant="link" asChild className="text-lg pl-0">
                <Link to="/community" className="pl-0">
                  Read all discussions &rarr;
                </Link>
              </Button>
            </div>
            <div className="relative col-span-2 flex flex-col md:[perspective:500px] md:pb-40  overflow-hidden md:*:[transform:translateZ(-0px)_rotateY(-20deg)_rotateZ(10deg)]">



            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} duration={1} inView>
          <div className="rounded-lg border overflow-hidden -mt-20 shadow-xl group">
            <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
              <div className="flex relative z-10 bg-background w-full justify-center items-center flex-col -mt-24">
                <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                  Find
                </h2>
                <p className="max-w-2xl md:text-xl font-light text-foreground">
                  Join a team looking for .
                </p>
                <Button variant="link" asChild className="text-lg pl-0">
                  <Link to="/cofounders" className="pl-0">
                    Find your new team &rarr;
                  </Link>
                </Button>
              </div>
              <RetroGrid />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:p-10 p-5 -mt-32 md:-mt-14  dark:bg-background bg-white">

            </div>
          </div>
        </BlurFade>
        <BlurFade delay={0.25} duration={1} inView>
          <div className="md:-mt-44 overflow-hidden ">
            <div className="flex h-[75vh] relative flex-col justify-center items-center text-center md:text-left">
              <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                Latest jobs
              </h2>
              <p className="max-w-2xl md:text-xl font-light text-foreground">
                Find your dream job.
              </p>
              <Button variant="link" asChild className="text-lg z-10 md:pl-0">
                <Link to="/jobs">View all jobs &rarr;</Link>
              </Button>
              <Ripple className="bg-transparent rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 -mt-32 md:-mt-60 z-10 gap-4">

            </div>
          </div>
        </BlurFade>
      </div>
    </>
  );
}

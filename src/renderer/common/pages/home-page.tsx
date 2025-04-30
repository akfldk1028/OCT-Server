import { Link, type MetaFunction } from "react-router";
import { ProductCard } from "~/features/products/components/product-card";
import { Button } from "../components/ui/button";
import { PostCard } from "~/features/community/components/post-card";
import { IdeaCard } from "~/features/ideas/components/idea-card";
import { JobCard } from "~/features/jobs/components/job-card";
import { TeamCard } from "~/features/teams/components/team-card";
import { getProductsByDateRange } from "~/features/products/queries";
import { DateTime, Settings } from "luxon";
import type { Route } from "./+types/home-page";
import { getPosts } from "~/features/community/queries";
import { getGptIdeas } from "~/features/ideas/queries";
import { getJobs } from "~/features/jobs/queries";
import { getTeams } from "~/features/teams/queries";
import { makeSSRClient } from "~/supa-client";
import FlickeringGrid from "../components/ui/flickering-grid";
import { BlurFade } from "../components/ui/blur-fade";
import { VelocityScroll } from "../components/ui/scroll-based-velocity";
import { Marquee } from "../components/ui/marquee";
import { RetroGrid } from "../components/ui/retro-grid";
import { MagicCard } from "../components/ui/magic-card";
import { Ripple } from "../components/ui/ripple";

export const meta: MetaFunction = () => {
  return [
    { title: "Home | wemake" },
    { name: "description", content: "Welcome to wemake" },
  ];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { client, headers } = makeSSRClient(request);
  const products = await getProductsByDateRange(client, {
    startDate: DateTime.now().startOf("day"),
    endDate: DateTime.now().endOf("day"),
    limit: 8,
  });
  const posts = await getPosts(client, {
    limit: 8,
    sorting: "newest",
  });
  const ideas = await getGptIdeas(client, { limit: 8 });
  const jobs = await getJobs(client, { limit: 12 });
  const teams = await getTeams(client, { limit: 9 });
  return { products, posts, ideas, jobs, teams };
};

export default function HomePage({ loaderData }: Route.ComponentProps) {
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
                welcome to wemake
              </h2>
            </BlurFade>
            <BlurFade delay={1} duration={1} inView>
              <span className="text-2xl md:text-5xl">
                the home of indie makers
              </span>
            </BlurFade>
          </div>
        </div>
        <div className="relative">
          <VelocityScroll
            defaultVelocity={5}
            className="font-display text-center text-5xl font-bold tracking-[-0.02em] md:leading-[5rem]"
          >
            code hard 💻 travel far 🌍
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
            {loaderData.products.map((product, index) => (
              <ProductCard
                key={product.product_id}
                id={product.product_id}
                name={product.name}
                description={product.tagline}
                reviewsCount={product.reviews}
                viewsCount={product.views}
                votesCount={product.upvotes}
                isUpvoted={product.is_upvoted}
                promotedFrom={product.promoted_from}
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
              <Marquee
                pauseOnHover
                vertical
                className="[--duration:40s] flex z-50  gap-5"
              >
                {loaderData.ideas.map((idea) => (
                  <div className="md:w-96" key={idea.gpt_idea_id}>
                    <IdeaCard
                      key={idea.gpt_idea_id}
                      id={idea.gpt_idea_id}
                      title={idea.idea}
                      viewsCount={idea.views}
                      postedAt={idea.created_at}
                      likesCount={idea.likes}
                      claimed={idea.is_claimed}
                    />
                  </div>
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                reverse
                vertical
                className="[--duration:40s] hidden md:flex  md:gap-5"
              >
                {loaderData.ideas.map((idea) => (
                  <div className="w-96" key={idea.gpt_idea_id}>
                    <IdeaCard
                      key={idea.gpt_idea_id}
                      id={idea.gpt_idea_id}
                      title={idea.idea}
                      viewsCount={idea.views}
                      postedAt={idea.created_at}
                      likesCount={idea.likes}
                      claimed={idea.is_claimed}
                    />
                  </div>
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                vertical
                className="[--duration:40s] hidden md:flex  gap-5"
              >
                {loaderData.ideas.map((idea) => (
                  <div className="w-96" key={idea.gpt_idea_id}>
                    <IdeaCard
                      key={idea.gpt_idea_id}
                      id={idea.gpt_idea_id}
                      title={idea.idea}
                      viewsCount={idea.views}
                      postedAt={idea.created_at}
                      likesCount={idea.likes}
                      claimed={idea.is_claimed}
                    />
                  </div>
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                reverse
                vertical
                className="[--duration:40s] hidden md:flex  gap-5"
              >
                {loaderData.ideas.map((idea) => (
                  <div className="w-96" key={idea.gpt_idea_id}>
                    <IdeaCard
                      key={idea.gpt_idea_id}
                      id={idea.gpt_idea_id}
                      title={idea.idea}
                      viewsCount={idea.views}
                      postedAt={idea.created_at}
                      likesCount={idea.likes}
                      claimed={idea.is_claimed}
                    />
                  </div>
                ))}
              </Marquee>
              <div className="hidden md:block pointer-events-none absolute right-0 h-10 w-full top-0 z-10 bg-gradient-to-b from-white dark:from-background"></div>
              <div className="hidden md:block pointer-events-none absolute left-0 h-10 w-full bottom-10 z-10 bg-gradient-to-t from-white dark:from-background"></div>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} duration={1} inView>
          <div className="space-y-10 grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-10">
            <div className="self-center text-center md:text-left">
              <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                Latest discussions
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
              <Marquee
                pauseOnHover
                className="[--duration:40s] hidden md:flex items-stretch "
              >
                {loaderData.posts.map((post) => (
                  <div key={post.post_id} className="w-full max-w-sm">
                    <PostCard
                      key={post.post_id}
                      id={post.post_id}
                      title={post.title}
                      author={post.author}
                      authorAvatarUrl={post.author_avatar}
                      category={post.topic}
                      postedAt={post.created_at}
                      votesCount={post.upvotes}
                    />
                  </div>
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                reverse
                className="[--duration:40s] flex items-stretch"
              >
                {loaderData.posts.map((post) => (
                  <div key={post.post_id} className="w-full max-w-sm">
                    <PostCard
                      key={post.post_id}
                      id={post.post_id}
                      title={post.title}
                      author={post.author}
                      authorAvatarUrl={post.author_avatar}
                      category={post.topic}
                      postedAt={post.created_at}
                      votesCount={post.upvotes}
                    />
                  </div>
                ))}
              </Marquee>
              <Marquee
                pauseOnHover
                className="[--duration:40s] flex items-stretch"
              >
                {loaderData.posts.map((post) => (
                  <div
                    key={post.post_id}
                    className="w-full max-w-sm [transform_rotateY(-20deg)]"
                  >
                    <PostCard
                      key={post.post_id}
                      id={post.post_id}
                      title={post.title}
                      author={post.author}
                      authorAvatarUrl={post.author_avatar}
                      category={post.topic}
                      postedAt={post.created_at}
                      votesCount={post.upvotes}
                    />
                  </div>
                ))}
              </Marquee>
            </div>
          </div>
        </BlurFade>

        <BlurFade delay={0.25} duration={1} inView>
          <div className="rounded-lg border overflow-hidden -mt-20 shadow-xl group">
            <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden">
              <div className="flex relative z-10 bg-background w-full justify-center items-center flex-col -mt-24">
                <h2 className="md:text-5xl text-3xl font-bold leading-tight tracking-tight ">
                  Find a co-founder
                </h2>
                <p className="max-w-2xl md:text-xl font-light text-foreground">
                  Join a team looking for a co-founder.
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
              {loaderData.teams.map((team, index) => (
                <BlurFade
                  delay={0.1 * index}
                  duration={0.25}
                  inView
                  key={index}
                >
                  <div className="group-hover:blur-sm h-full group-hover:hover:blur-0 group-hover:hover:grayscale-0 group-hover:grayscale group-hover:hover:scale-105 duration-300">
                    <TeamCard
                      key={team.team_id}
                      id={team.team_id}
                      leaderUsername={team.team_leader.username}
                      leaderAvatarUrl={team.team_leader.avatar}
                      positions={team.roles.split(",")}
                      projectDescription={team.product_description}
                    />
                  </div>
                </BlurFade>
              ))}
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
              {loaderData.jobs.map((job, index) => (
                <BlurFade
                  delay={0.1 * index}
                  duration={0.25}
                  inView
                  key={index}
                  className="w-full"
                >
                  <MagicCard className="p-0 h-auto w-full">
                    <JobCard
                      key={job.job_id}
                      id={job.job_id}
                      company={job.company_name}
                      companyLogoUrl={job.company_logo}
                      companyHq={job.company_location}
                      title={job.position}
                      postedAt={job.created_at}
                      type={job.job_type}
                      positionLocation={job.location}
                      salary={job.salary_range}
                    />
                  </MagicCard>
                </BlurFade>
              ))}
            </div>
          </div>
        </BlurFade>
      </div>
    </>
  );
}

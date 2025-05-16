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
import { makeSSRClient, supabase } from "../../supa-client";
import { Button } from "../components/ui/button";
import type { Database } from "../../supa-client";
import { InitialAvatar } from "../components/ui/initial-avatar";
import { type LoaderFunctionArgs } from "react-router";
import {  IS_ELECTRON, IS_WEB } from '../../utils/environment';
import { Server } from "lucide-react";
import { useState, useEffect } from "react";
import { ensureClaudeApi } from "../../lib/utils";
import { MoreVertical, Trash2, Archive } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
export const loader = async ({  request } : LoaderFunctionArgs) => {
  try {

    // const { client, headers } = makeSSRClient(request); // headers might be unused now
    console.log("Using client created by makeSSRClient (Electron adapted)");
    const [products] = await Promise.all([
      getProductsBypopularity(supabase as any, { // 'as any' cast might still be needed depending on exact types
        limit: 100,
        // limit: 8,

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

type ServerTabGridProps = { claudeServers: string[], setClaudeServers: (servers: string[]) => void };
function ServerTabGrid({ claudeServers = [], setClaudeServers }: ServerTabGridProps) {
  const serverTabs = [
    {
      label: 'Local',
      key: 'my',
      servers: [
        { name: 'DESKTOP-XXXXXXX', owner: 'user#1234' },
        { name: 'MSI', owner: 'you' },
        { name: 'DESKTOP-CK5JOK6', owner: 'Bandi97#16922696' },
        { name: 'DESKTOP-2K5U0TU', owner: 'kanjooyoung#16647253' },
        { name: 'DESKTOP-Q5ELDCL', owner: 'pjh7083#16175568' },
        { name: 'DESKTOP-CK5JOK6', owner: 'Bandi97#16922696' },
        { name: 'DESKTOP-2K5U0TU', owner: 'kanjooyoung#16647253' },
        { name: 'DESKTOP-Q5ELDCL', owner: 'pjh7083#16175568' },
      ],
    },
    {
      label: 'Claude',
      key: 'claude',
      servers: claudeServers.map(name => ({ name, owner: 'Claude Desktop' })),
    },
    {
      label: 'Cursor',
      key: 'company',
      servers: [
        { name: 'GA504_PC4', owner: 'pjh7083#16175568' },
        { name: 'DESKTOP-ABCD123', owner: 'guest' },
        { name: 'DESKTOP-TEST', owner: 'testuser' },
      ],
    },
  ];
  const [activeTab, setActiveTab] = useState('my');
  const currentServers = serverTabs.find(tab => tab.key === activeTab)?.servers ?? [];
  return (
    <div className="relative min-h-[500px] w-full flex bg-background overflow-hidden p-8 items-start">
      <div className="w-full">
        <h1 className="text-3xl md:text-5xl font-bold mb-2">My Model Context</h1>
        <p className="mb-4 text-gray-400">Connect to your computer or a friend's computer in low latency desktop mode.</p>
        {/* 탭 메뉴 */}
        <div className="flex gap-2 mb-6 border-b border-zinc-700">
          {serverTabs.map(tab => (
            <button
              key={tab.key}
              className={
                `px-5 py-2 font-semibold rounded-t-lg border-b-2 transition-colors duration-200
                ${activeTab === tab.key
                  ? 'bg-background border-primary text-primary shadow-sm'
                  : 'bg-transparent border-transparent text-gray-400 hover:bg-zinc-800 hover:text-primary'}
                `
              }
              style={{ outline: 'none' }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search Hosts and Computers"
          className="w-full max-w-md p-2 rounded bg-zinc-800 text-white border border-zinc-700 mb-6"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 w-full">
          {currentServers.map((comp, idx) => (
            <div key={idx} className="relative rounded-lg p-6 flex flex-col items-center shadow-lg border border-zinc-200 dark:border-zinc-700 min-h-[100px] w-full bg-white dark:bg-zinc-900">
              {/* 메뉴 버튼: 카드 우측 상단 */}
              {activeTab === 'claude' && (
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800">
                        <MoreVertical className="w-5 h-5 text-zinc-400 hover:text-primary" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-20 min-w-[120px]">
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-red-500"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await (window as any).claudeAPI.removeServer(comp.name);
                          const updated = await (window as any).claudeAPI.getAllServers();
                          setClaudeServers(updated);
                        }}
                      >
                        <Trash2 className="w-4 h-4" /> 삭제
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="flex items-center gap-2 text-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert('보관 기능은 추후 구현!');
                        }}
                      >
                        <Archive className="w-4 h-4" /> 보관
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              {/* 카드 내용 */}
              <div className="mb-4">
                <Server className="w-10 h-10 text-primary" />
              </div>
              <div className="font-semibold text-lg mb-1 break-words text-center w-full truncate text-zinc-900 dark:text-white">{comp.name}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-2 break-words text-center w-full truncate">Owner: {comp.owner}</div>
              <button className="mt-auto px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition">Connect</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default  function HomePage() {
  const { products } = useLoaderData() as { products: Product[] };
  const [claudeServers, setClaudeServers] = useState<string[]>([]);

  useEffect(() => {
    if ((window as any).claudeAPI) {
      (window as any).claudeAPI.getAllServers().then(setClaudeServers);
    }
  }, []);

  // Log the fetched products data to the console
  console.log("Fetched Products:", products);

  return (
    <>
      <div className="space-y-32 pb-20 w-full">
        {IS_WEB ? (
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
                  the home of MCP
                </span>
              </BlurFade>
            </div>
          </div>
        ) : (
          <ServerTabGrid claudeServers={claudeServers} setClaudeServers={setClaudeServers} />
        )}

               {/* 다운로드 네비게이션: 웹에서만 노출 */}
               {IS_WEB && (
                  <section className="w-full flex justify-center mt-[-80px] mb-12 z-10 relative">
                    <div className="flex flex-row gap-10 items-center">
                      {/* Mac 버튼 */}
                      <div className="relative">
                        {/* 버튼에 딱 맞는 Glow */}
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-2xl blur-md opacity-80
                                     bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-[#a21caf]
                                     animate-pulse pointer-events-none z-[-1]"
                        />
                        <Button
                          asChild
                          className="gap-2 px-12 py-8 text-base font-semibold bg-primary text-white hover:bg-primary/90 shadow-none transition-shadow relative"
                        >
                          <a
                            href="https://github.com/ibttf/interview-coder/releases/download/v1.0.25/Interview.Coder-Mac-1.0.25.dmg"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg className="inline-block" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20"><path d="M11.6734 7.22198C10.7974 7.22198 9.44138 6.22598 8.01338 6.26198C6.12938 6.28598 4.40138 7.35397 3.42938 9.04597C1.47338 12.442 2.92538 17.458 4.83338 20.218C5.76938 21.562 6.87338 23.074 8.33738 23.026C9.74138 22.966 10.2694 22.114 11.9734 22.114C13.6654 22.114 14.1454 23.026 15.6334 22.99C17.1454 22.966 18.1054 21.622 19.0294 20.266C20.0974 18.706 20.5414 17.194 20.5654 17.11C20.5294 17.098 17.6254 15.982 17.5894 12.622C17.5654 9.81397 19.8814 8.46998 19.9894 8.40998C18.6694 6.47798 16.6414 6.26198 15.9334 6.21398C14.0854 6.06998 12.5374 7.22198 11.6734 7.22198ZM14.7934 4.38998C15.5734 3.45398 16.0894 2.14598 15.9454 0.849976C14.8294 0.897976 13.4854 1.59398 12.6814 2.52998C11.9614 3.35798 11.3374 4.68998 11.5054 5.96198C12.7414 6.05798 14.0134 5.32598 14.7934 4.38998Z"></path></svg>
                            Mac용 다운로드
                          </a>
                        </Button>
                      </div>
                      {/* Windows 버튼 */}
                      <div className="relative">
                        {/* 버튼에 딱 맞는 Glow */}
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-2xl blur-md opacity-80
                                     bg-gradient-to-r from-[#e11d48] via-[#f43f5e] to-[#a21caf]
                                     animate-pulse pointer-events-none z-[-1]"
                        />
                        <Button
                          asChild
                          variant="outline"
                          className="gap-2 px-12 py-8 text-base font-semibold border-primary text-primary hover:bg-primary/10 shadow-none transition-shadow relative bg-white/80 dark:bg-zinc-900/80"
                        >
                          <a
                            href="https://github.com/ibttf/interview-coder/releases/download/v1.0.25/Interview.Coder-Windows-1.0.25.exe"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <svg className="inline-block" stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="20" width="20"><path d="M11.501 3V11.5H3.00098V3H11.501ZM11.501 21H3.00098V12.5H11.501V21ZM12.501 3H21.001V11.5H12.501V3ZM21.001 12.5V21H12.501V12.5H21.001Z"></path></svg>
                            Windows용 다운로드
                          </a>
                        </Button>
                      </div>
                    </div>
                  </section>
                )}
        {IS_WEB && (
          <div className="relative">
            <VelocityScroll
              defaultVelocity={1}
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
        )}


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

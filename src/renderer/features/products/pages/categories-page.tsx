import { Hero } from "../../../common/components/hero";
import { ProductCard } from "../components/product-card";
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, useSearchParams, Link } from "react-router";
import { getCategories } from "../queries";
import { makeSSRClient } from "../../../supa-client";
import { Button } from "../../../common/components/ui/button";
import { X, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../common/components/ui/badge";

// 타입 정의
type MCPServer = {
  id: number;
  name: string;
  description: string;
  categories: string;
  tags: string;
  activity_status: string;
  popularity_category: string;
  stars: number;
  forks: number;
  repository_url: string;
  unique_id: string;
  local_image_path: string | null;
};

// 로더 데이터 타입 정의
type CategoriesPageLoaderData = {
  serversByCategory: Record<string, MCPServer[]>;
  uniqueTags: string[];
  uniqueStatuses: string[];
  uniquePopularities: string[];
  uniqueCategoryTypes: string[];
};

export const meta: MetaFunction = () => [
  { title: "Categories | MCP Server Directory" },
  { name: "description", content: "Find MCP servers by category" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient(request);

  // 모든 MCP 서버 데이터 가져오기
  const { data: allServers } = await client
    .from('mcp_server_categories_view')
    .select('*')
    .not('categories', 'is', null);

  // 카테고리별로 서버 그룹화
  const serversByCategory: Record<string, MCPServer[]> = {};
  
  (allServers || []).forEach((server: any) => {
    if (server.categories) {
      const categories = server.categories.split(',').map((cat: string) => cat.trim());
      categories.forEach((category: string) => {
        if (!serversByCategory[category]) {
          serversByCategory[category] = [];
        }
        // 중복 방지
        if (!serversByCategory[category].find(s => s.id === server.id)) {
          serversByCategory[category].push({
            id: server.id,
            name: server.name,
            description: server.description,
            categories: server.categories,
            tags: server.tags || '',
            activity_status: server.activity_status || '',
            popularity_category: server.popularity_category || '',
            stars: server.stars || 0,
            forks: server.forks || 0,
            repository_url: server.github_url || '',
            unique_id: server.unique_id || server.id.toString(),
            local_image_path: server.local_image_path || null,
          });
        }
      });
    }
  });

  // 고유 태그 추출
  const uniqueTags = Array.from(new Set(
    (allServers || [])
      .filter(item => item.tags)
      .flatMap(item => item.tags.split(',').map(tag => tag.trim()))
      .filter(tag => tag)
  ));

  // 고유 상태 추출
  const uniqueStatuses = Array.from(new Set(
    (allServers || [])
      .filter(item => item.activity_status)
      .map(item => item.activity_status)
  ));

  // 고유 인기도 카테고리 추출
  const uniquePopularities = Array.from(new Set(
    (allServers || [])
      .filter(item => item.popularity_category)
      .map(item => item.popularity_category)
  ));

  // 고유 카테고리 타입 추출
  const uniqueCategoryTypes = Array.from(new Set(
    (allServers || [])
      .filter(item => item.categories)
      .flatMap(item => item.categories.split(',').map(cat => cat.trim()))
      .filter(Boolean)
  ));

  return {
    serversByCategory,
    uniqueTags,
    uniqueStatuses,
    uniquePopularities,
    uniqueCategoryTypes
  };
};

export default function CategoriesPage() {
  const {
    serversByCategory,
    uniqueTags,
    uniqueStatuses,
    uniquePopularities,
    uniqueCategoryTypes
  } = useLoaderData() as CategoriesPageLoaderData;

  const [searchParams, setSearchParams] = useSearchParams();

  const onFilterClick = (key: string, value: string) => {
    searchParams.set(key, value);
    setSearchParams(searchParams);
  };

  const clearFilter = (key: string) => {
    searchParams.delete(key);
    setSearchParams(searchParams);
  };

  const tag = searchParams.get("tag") || "";
  const status = searchParams.get("status") || "";
  const popularity = searchParams.get("popularity") || "";
  const categoryType = searchParams.get("category") || "";

  // 🔥 필터링된 카테고리 계산
  const filteredCategories = Object.entries(serversByCategory).filter(([categoryName, servers]) => {
    // 카테고리 타입 필터링
    if (categoryType) {
      const matchesCategory = 
        categoryName.toLowerCase().includes(categoryType.toLowerCase()) ||
        categoryType.toLowerCase().includes(categoryName.toLowerCase());
      
      if (!matchesCategory) return false;
    }
    
    // 태그, 상태, 인기도로 서버 필터링
    const hasMatchingServers = servers.some(server => {
      if (tag && (!server.tags || !server.tags.toLowerCase().includes(tag.toLowerCase()))) {
        return false;
      }
      if (status && server.activity_status !== status) {
        return false;
      }
      if (popularity && server.popularity_category !== popularity) {
        return false;
      }
      return true;
    });
    
    return hasMatchingServers;
  });

  return (
    <div className="space-y-8">
      <Hero title="Categories" subtitle="Find MCP servers by category" />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* 🔥 카테고리별 MCP 서버 목록 */}
        <div className="xl:col-span-3 space-y-12">
          {filteredCategories.map(([categoryName, servers]) => {
            // 필터링된 서버들만 표시
            const filteredServers = servers.filter(server => {
              if (tag && (!server.tags || !server.tags.toLowerCase().includes(tag.toLowerCase()))) {
                return false;
              }
              if (status && server.activity_status !== status) {
                return false;
              }
              if (popularity && server.popularity_category !== popularity) {
                return false;
              }
              return true;
            });

            if (filteredServers.length === 0) return null;

            return (
              <div key={categoryName} className="space-y-4">
                {/* 카테고리 헤더 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold capitalize">{categoryName}</h2>
                    <Badge variant="secondary">{filteredServers.length} servers</Badge>
                  </div>
                  <Button variant="ghost" asChild>
                    <Link 
                      to={`/products/categories/${encodeURIComponent(categoryName)}`}
                      className="flex items-center gap-1 text-sm"
                    >
                      View All <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>

                {/* MCP 서버 카드들 - 최대 6개만 표시 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredServers.slice(0, 6).map((server) => (
                    <ProductCard
                      key={server.id}
                      id={server.id}
                      uniqueId={server.unique_id}
                      name={server.name}
                      description={server.description}
                      stars={server.stars}
                      forks={server.forks}
                      githubUrl={server.repository_url}
                      reviewsCount={null}
                      viewsCount={null}
                      votesCount={null}
                      isUpvoted={null}
                      promotedFrom={null}
                      localImagePath={server.local_image_path || null}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-lg font-semibold text-muted-foreground">
                No MCP servers found. Please modify the filters or{" "}
                <Button variant="link" asChild className="p-0 text-lg">
                  <Link to="/products/categories">Reset</Link>
                                  </Button>
                  .
              </p>
            </div>
          )}
        </div>

        {/* 🔥 필터 사이드바 */}
        <div className="xl:col-span-1 space-y-6">
          {/* 카테고리 타입 필터 */}
          {uniqueCategoryTypes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Category Type</h4>
                {categoryType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter("category")}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueCategoryTypes.map((typeOption) => (
                  <Button
                    key={typeOption}
                    variant={typeOption === categoryType ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterClick("category", typeOption)}
                  >
                    {typeOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 태그 필터 */}
          {uniqueTags.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Tags</h4>
                {tag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter("tag")}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueTags.slice(0, 8).map((tagOption) => (
                  <Button
                    key={tagOption}
                    variant={tagOption === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterClick("tag", tagOption)}
                  >
                    {tagOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 상태 필터 */}
          {uniqueStatuses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Status</h4>
                {status && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter("status")}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueStatuses.map((statusOption) => (
                  <Button
                    key={statusOption}
                    variant={statusOption === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterClick("status", statusOption)}
                  >
                    {statusOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 인기도 필터 */}
          {uniquePopularities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Popularity</h4>
                {popularity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter("popularity")}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {uniquePopularities.map((popularityOption) => (
                  <Button
                    key={popularityOption}
                    variant={popularityOption === popularity ? "default" : "outline"}
                    size="sm"
                    onClick={() => onFilterClick("popularity", popularityOption)}
                  >
                    {popularityOption}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

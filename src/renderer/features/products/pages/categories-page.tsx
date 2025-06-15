import { Hero } from "../../../common/components/hero";
import { CategoryCard } from "../components/category-card";
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, useSearchParams, Link } from "react-router";
import { getCategories } from "../queries";
import { makeSSRClient } from "../../../supa-client";
import { Button } from "../../../common/components/ui/button";
import { X } from "lucide-react";
import { cn } from "../../../lib/utils";

// 타입 정의
type Category = {
  id: number;
  name: string;
  description: string;
};

// 로더 데이터 타입 정의
type CategoriesPageLoaderData = {
  categories: Category[];
  uniqueTags: string[];
  uniqueStatuses: string[];
  uniquePopularities: string[];
  uniqueCategoryTypes: string[];
};

export const meta: MetaFunction = () => [
  { title: "Categories | MCP 서버 목록" },
  { name: "description", content: "카테고리별 MCP 서버 찾아보기" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient(request);

  // 카테고리 데이터 가져오기
  const categories = await getCategories(client);

  // 서버에서 고유한 태그, 상태, 인기도 정보를 가져옴
  const { data: serverData } = await client
    .from('mcp_server_categories_view')
    .select('tags, activity_status, popularity_category, categories');

  // 고유 태그 추출
  const uniqueTags = Array.from(new Set(
    (serverData || [])
      .filter(item => item.tags)
      .flatMap(item => item.tags.split(',').map(tag => tag.trim()))
      .filter(tag => tag)
  ));

  // 고유 상태 추출
  const uniqueStatuses = Array.from(new Set(
    (serverData || [])
      .filter(item => item.activity_status)
      .map(item => item.activity_status)
  ));

  // 고유 인기도 카테고리 추출
  const uniquePopularities = Array.from(new Set(
    (serverData || [])
      .filter(item => item.popularity_category)
      .map(item => item.popularity_category)
  ));

  // 고유 카테고리 타입 추출
  const uniqueCategoryTypes = Array.from(new Set(
    (serverData || [])
      .filter(item => item.categories)
      .flatMap(item => item.categories.split(',').map(cat => cat.trim()))
      .filter(Boolean)
  ));

  return {
    categories,
    uniqueTags,
    uniqueStatuses,
    uniquePopularities,
    uniqueCategoryTypes
  };
};

export default function CategoriesPage() {
  const {
    categories,
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

  return (
    <div className="space-y-8">
      <Hero title="카테고리" subtitle="카테고리별 MCP 서버 찾아보기" />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* 🔥 카테고리 그리드 */}
        <div className="xl:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                id={category.id}
                name={category.name}
                description={category.description}
              />
            ))}
            {categories.length === 0 && (
              <div className="col-span-full text-center py-8">
                <p className="text-lg font-semibold text-muted-foreground">
                  조건에 맞는 카테고리가 없습니다. 필터를 수정하거나{" "}
                  <Button variant="link" asChild className="p-0 text-lg">
                    <Link to="/products/categories">초기화</Link>
                  </Button>{" "}
                  하세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 🔥 필터 사이드바 */}
        <div className="xl:col-span-1 space-y-6">
          {/* 카테고리 타입 필터 */}
          {uniqueCategoryTypes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">카테고리 타입</h4>
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
                <h4 className="font-medium">태그</h4>
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
                <h4 className="font-medium">상태</h4>
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
                <h4 className="font-medium">인기도</h4>
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

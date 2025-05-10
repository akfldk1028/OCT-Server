// import { Hero } from "../../../common/components/hero";
// import { CategoryCard } from "../components/category-card";
// import {type LoaderFunctionArgs, type MetaFunction, useLoaderData} from "react-router";
// import { getCategories } from "../queries";
// import { makeSSRClient } from "../../../supa-client";
// import { Tables } from "../../../database.types";
//
// // GitHubPopularityView 타입 정의
// type mcp_server_categories_view = Tables<"mcp_server_categories_view">;
//
// // 로더 데이터 타입 정의
// type CategoriesPageLoaderData = {
//   categories: mcp_server_categories_view[];
// };
//
// export const meta: MetaFunction = () => [
//   { title: "Categories | ProductHunt Clone" },
//   { name: "description", content: "Browse products by category" },
// ];
//
// export const loader = async ({ request }: LoaderFunctionArgs) => {
//   const { client, headers } = makeSSRClient(request);
//   const categories = await getCategories(client as any);
//   return { categories };
// };
//
// export default function CategoriesPage() {
//   const { categories } = useLoaderData() as CategoriesPageLoaderData;
//
//   return (
//     <div className="space-y-10">
//       <Hero title="Categories" subtitle="Browse products by category" />
//       <div className="grid md:grid-cols-4 gap-4 md:gap-10">
//         {categories.map((category : mcp_server_categories_view, index: number) => (
//           <div key={category.id} className="h-full flex">
//             <CategoryCard
//               id={category.id}
//               name={category.name ?? ""}
//               description={category.description ?? ""}
//             />
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

import { Hero } from "../../../common/components/hero";
import { CategoryCard } from "../components/category-card";
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, useSearchParams, Link } from "react-router";
import { getCategories } from "../queries";
import { makeSSRClient } from "../../../supa-client";
import { Button } from "../../../common/components/ui/button";
import { CircleXIcon } from "lucide-react";
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
  uniqueCategoryTypes: string[]; // 카테고리 타입 추가
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
    .select('tags, activity_status, popularity_category, categories'); // category_type 대신 categories 사용

  // 고유 태그 추출
  const uniqueTags = Array.from(new Set(
    serverData
      .filter(item => item.tags)
      .flatMap(item => item.tags.split(',').map(tag => tag.trim()))
      .filter(tag => tag)
  ));

  // 고유 상태 추출
  const uniqueStatuses = Array.from(new Set(
    serverData
      .filter(item => item.activity_status)
      .map(item => item.activity_status)
  ));

  // 고유 인기도 카테고리 추출
  const uniquePopularities = Array.from(new Set(
    serverData
      .filter(item => item.popularity_category)
      .map(item => item.popularity_category)
  ));

  // 고유 카테고리 타입 추출
  const uniqueCategoryTypes = Array.from(new Set(
    serverData
      .filter(item => item.categories)
      .flatMap(item => item.categories.split(',').map(cat => cat.trim()))
      .filter(Boolean)
  ));
  console.log(uniqueCategoryTypes)
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
  const categoryType = searchParams.get("category") || ""; // 카테고리 타입 파라미터 추가

  return (
    <div className="space-y-20">
      <Hero title="카테고리" subtitle="카테고리별 MCP 서버 찾아보기" />
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-20 items-start">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:col-span-4 gap-5">
          {categories.map((category) => (
            <div key={category.id} className="aspect-square">
              <CategoryCard
                id={category.id}
                name={category.name}
                description={category.description}
              />
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-full">
              <p className="text-lg font-semibold text-muted-foreground">
                조건에 맞는 카테고리가 없습니다. 필터를 수정하거나{" "}
                <Button variant={"link"} asChild className="p-0 text-lg">
                  <Link to="/categories">초기화</Link>
                </Button>{" "}
                하세요.
              </p>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 sticky top-20 flex flex-col gap-10">
          {/* 카테고리 타입 필터 - 새로 추가 */}
          {uniqueCategoryTypes.length > 0 && (
            <div className="flex flex-col items-start gap-2.5">
              <h4 className="text-sm text-muted-foreground font-bold">카테고리 타입</h4>
              <div className="flex flex-wrap gap-2">
                {categoryType && (
                  <Button
                    variant={"outline"}
                    className="text-red-500"
                    onClick={() => clearFilter("category")}
                  >
                    <CircleXIcon className="w-4 h-4" />
                  </Button>
                )}
                {uniqueCategoryTypes.map((typeOption) => (
                  <Button
                    key={typeOption}
                    variant={"outline"}
                    onClick={() => onFilterClick("category", typeOption)}
                    className={cn(
                      typeOption === categoryType ? "bg-accent" : ""
                    )}
                  >
                    {typeOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 태그 필터 */}
          {uniqueTags.length > 0 && (
            <div className="flex flex-col items-start gap-2.5">
              <h4 className="text-sm text-muted-foreground font-bold">태그</h4>
              <div className="flex flex-wrap gap-2">
                {tag && (
                  <Button
                    variant={"outline"}
                    className="text-red-500"
                    onClick={() => clearFilter("tag")}
                  >
                    <CircleXIcon className="w-4 h-4" />
                  </Button>
                )}
                {uniqueTags.map((tagOption) => (
                  <Button
                    key={tagOption}
                    variant={"outline"}
                    onClick={() => onFilterClick("tag", tagOption)}
                    className={cn(
                      tagOption === tag ? "bg-accent" : ""
                    )}
                  >
                    {tagOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 상태 필터 */}
          {uniqueStatuses.length > 0 && (
            <div className="flex flex-col items-start gap-2.5">
              <h4 className="text-sm text-muted-foreground font-bold">상태</h4>
              <div className="flex flex-wrap gap-2">
                {status && (
                  <Button
                    variant={"outline"}
                    className="text-red-500"
                    onClick={() => clearFilter("status")}
                  >
                    <CircleXIcon className="w-4 h-4" />
                  </Button>
                )}
                {uniqueStatuses.map((statusOption) => (
                  <Button
                    key={statusOption}
                    variant={"outline"}
                    onClick={() => onFilterClick("status", statusOption)}
                    className={cn(
                      statusOption === status ? "bg-accent" : ""
                    )}
                  >
                    {statusOption}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 인기도 필터 */}
          {uniquePopularities.length > 0 && (
            <div className="flex flex-col items-start gap-2.5">
              <h4 className="text-sm text-muted-foreground font-bold">인기도</h4>
              <div className="flex flex-wrap gap-2">
                {popularity && (
                  <Button
                    variant={"outline"}
                    className="text-red-500"
                    onClick={() => clearFilter("popularity")}
                  >
                    <CircleXIcon className="w-4 h-4" />
                  </Button>
                )}
                {uniquePopularities.map((popularityOption) => (
                  <Button
                    key={popularityOption}
                    variant={"outline"}
                    onClick={() => onFilterClick("popularity", popularityOption)}
                    className={cn(
                      popularityOption === popularity ? "bg-accent" : ""
                    )}
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

import { Hero } from "../../../common/components/hero";
import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, useSearchParams, Link } from "react-router";
import { getServersByCategory } from "../queries";
import { makeSSRClient } from "../../../supa-client";
import { Button } from "../../../common/components/ui/button";
import { ArrowLeft, Server, ExternalLink, Star, Activity, Tag } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../common/components/ui/card";
import { Badge } from "../../../common/components/ui/badge";

// 타입 정의
type CategoryServer = {
  id: number;
  name: string;
  description: string;
  categories: string;
  tags: string;
  activity_status: string;
  popularity_category: string;
  stars: number;
  updated_at: string;
  homepage_url: string;
  repository_url: string;
};

// 로더 데이터 타입 정의
type CategoryServersPageLoaderData = {
  categoryName: string;
  servers: CategoryServer[];
};

export const meta: MetaFunction = ({ params }) => [
  { title: `${params.categoryName} MCP Servers | MCP Servers List` },
  { name: "description", content: `${params.categoryName} category MCP servers` },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { client } = makeSSRClient(request);
  const categoryName = params.categoryName as string;

  if (!categoryName) {
    throw new Response("Category name is required", { status: 400 });
  }

  // 카테고리별 서버 데이터 가져오기
  const servers = await getServersByCategory(client, { categoryName: decodeURIComponent(categoryName) });

  return {
    categoryName: decodeURIComponent(categoryName),
    servers: servers || [],
  };
};

export default function CategoryServersPage() {
  const { categoryName, servers } = useLoaderData() as CategoryServersPageLoaderData;

  return (
    <div className="space-y-8">
      {/* 🔥 헤더 */}
      <div className="space-y-4">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/products/categories" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Category List
          </Link>
        </Button>
        
        <Hero 
          title={`${categoryName} MCP Servers`} 
          subtitle={`Find ${servers.length} MCP servers in the ${categoryName} category`} 
        />
      </div>

      {/* 🔥 서버 목록 - 모던하고 넓은 레이아웃 */}
      <div className="space-y-8">
        {servers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mb-6">
              <Server className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              No servers found
            </h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto mb-6">
              No MCP servers found in the {categoryName} category. Try exploring other categories.
            </p>
            <Button asChild size="lg" className="px-8">
              <Link to="/products/categories">View Other Categories</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map((server) => (
              <Card 
                key={server.id} 
                className="group h-full flex flex-col bg-card/50 backdrop-blur border-border/50 hover:border-border hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <CardTitle className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-200 line-clamp-2">
                        {server.name}
                      </CardTitle>
                      <CardDescription className="text-base text-muted-foreground line-clamp-3 leading-relaxed">
                        {server.description || 'No description available for this MCP server.'}
                      </CardDescription>
                    </div>
                    {server.stars && (
                      <Badge className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 px-3 py-1">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {server.stars}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col justify-between pt-0">
                  {/* 태그 및 상태 */}
                  <div className="space-y-4">
                    {server.tags && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="w-4 h-4" />
                          <span className="font-medium">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {server.tags.split(',').slice(0, 4).map((tag, idx) => (
                            <Badge 
                              key={idx} 
                              variant="outline" 
                              className="text-xs px-2 py-1 bg-background/80 hover:bg-accent transition-colors"
                            >
                              {tag.trim()}
                            </Badge>
                          ))}
                          {server.tags.split(',').length > 4 && (
                            <Badge variant="outline" className="text-xs px-2 py-1 bg-muted">
                              +{server.tags.split(',').length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {server.activity_status && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <Badge 
                          className={cn(
                            "px-3 py-1 font-medium",
                            server.activity_status === 'active' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' 
                              : 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400'
                          )}
                        >
                          {server.activity_status}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* 액션 버튼 */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <Button 
                      asChild 
                      size="sm"
                      variant="ghost"
                      className="font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 px-0 h-8 transition-all duration-200"
                    >
                      <Link to={`/products/${server.id}`} className="flex items-center gap-1">
                        View Details
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {server.repository_url && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          asChild 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <a 
                            href={server.repository_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="View on GitHub"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                      {server.homepage_url && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          asChild 
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                          <a 
                            href={server.homepage_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Visit Homepage"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
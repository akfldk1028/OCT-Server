// import React, { useState } from 'react';
// import { StarIcon, GitFork } from "lucide-react";
// import { ChevronUpIcon } from "lucide-react";
// import {
//   Link,
//   NavLink,
//   Outlet,
//   useFetcher,
//   useOutletContext,
//   type MetaFunction,
// } from "react-router";
// import { Button, buttonVariants } from "../../../common/components/ui/button";
// import { cn } from "../../../lib/utils";
// import { InstallSidebar } from "../components/InstallSidebar";
// import { InitialAvatar } from "../../../common/components/ui/initial-avatar";
// import { MCPServerDetailView } from "../types/MCPServerDetailTypes";

// export function meta() {
//   return [
//     { title: "Product Overview" },
//     { name: "description", content: "View product details and information" },
//   ];
// }



// // name에서 이니셜 추출 함수
// const generateInitials = (name: string | null): string => {
//   if (!name) return '??';
  
//   const trimmedName = name.trim();
  
//   // 영어/공백으로 구분된 단어들의 경우
//   if (trimmedName.includes(' ')) {
//     const words = trimmedName.split(' ').filter(word => word.length > 0);
//     if (words.length >= 2) {
//       return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
//     } else if (words.length === 1) {
//       return words[0].substring(0, 2).toUpperCase();
//     }
//   }
  
//   // 하이픈이나 언더스코어로 구분된 경우 (예: mcp-server, some_tool)
//   if (trimmedName.includes('-') || trimmedName.includes('_')) {
//     const separator = trimmedName.includes('-') ? '-' : '_';
//     const parts = trimmedName.split(separator).filter(part => part.length > 0);
//     if (parts.length >= 2) {
//       return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
//     }
//   }
  
//   // 단일 단어이거나 한국어 등의 경우 첫 2글자
//   return trimmedName.substring(0, 2).toUpperCase();
// };

// // 랜덤 색깔 생성 함수 (name을 기반으로 일관된 색깔 생성)
// const generateColor = (name: string | null): string => {
//   if (!name) return '#6B7280'; // 기본 회색
  
//   // 미리 정의된 예쁜 색깔 팔레트
//   const colors = [
//     '#EF4444', // red-500
//     '#F97316', // orange-500
//     '#F59E0B', // amber-500
//     '#EAB308', // yellow-500
//     '#84CC16', // lime-500
//     '#22C55E', // green-500
//     '#10B981', // emerald-500
//     '#14B8A6', // teal-500
//     '#06B6D4', // cyan-500
//     '#0EA5E9', // sky-500
//     '#3B82F6', // blue-500
//     '#6366F1', // indigo-500
//     '#8B5CF6', // violet-500
//     '#A855F7', // purple-500
//     '#D946EF', // fuchsia-500
//     '#EC4899', // pink-500
//     '#F43F5E', // rose-500
//   ];
  
//   // name을 기반으로 해시값 생성 (일관된 색깔을 위해)
//   let hash = 0;
//   for (let i = 0; i < name.length; i++) {
//     const char = name.charCodeAt(i);
//     hash = ((hash << 5) - hash) + char;
//     hash = hash & hash; // 32bit integer로 변환
//   }
  
//   // 양수로 만들고 색깔 배열 인덱스로 사용
//   const colorIndex = Math.abs(hash) % colors.length;
//   return colors[colorIndex];
// };

// export default function ProductOverviewLayout() {
//   const { product, isLoggedIn } = useOutletContext<{
//     product: MCPServerDetailView;
//     isLoggedIn: boolean;
//   }>();
  
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);

//   console.log('[ProductOverviewLayout] Rendered with context product:', product);
//   console.log('[ProductOverviewLayout] local_image_path:', product?.local_image_path);
  

//   // 이니셜과 색깔 생성
//   const initials = product.fallback_avatar_initials || generateInitials(product.name);
//   const avatarColor = product.fallback_avatar_color || generateColor(product.name);
  
//   console.log('[ProductOverviewLayout] Avatar - initials:', initials, 'color:', avatarColor);

//   return (
//     <div className="space-y-10">
//       <div className="flex flex-col md:flex-row gap-10 md:gap-0 justify-between">
//         <div className="flex flex-col items-center md:items-start md:flex-row gap-10">
//           <div className="size-40 rounded-xl overflow-hidden shadow-xl  flex items-center justify-center">
//           <InitialAvatar
//                 initials={initials}
//                 colorString={avatarColor}
//                 size={100}
//               />
//           </div>
//           <div>
//             <h1 className="text-5xl text-center md:text-left font-bold">
//               {product.name || 'Product Name'}
//             </h1>
//             <div className="mt-5 flex md:justify-start text-lg md:text-base justify-center items-center gap-5">
//               <span className="text-muted-foreground flex items-center gap-2">
//                 <StarIcon className="size-4" /> {product.stars || 0} stars
//               </span>
//               <span className="text-muted-foreground flex items-center gap-2">
//                 <GitFork className="size-4" /> {product.forks || 0} forks
//               </span>
//             </div>
//           </div>
//         </div>
//         <div className="flex flex-col gap-2.5">
//           <Button
//             variant={"secondary"}
//             size="lg"
//             asChild
//             className="text-lg w-full h-14 px-10"
//           >
//             <Link to={product.github_url || '#'}>
//               Visit Repository
//             </Link>
//           </Button>

//           <Button
//             size="lg"
//             className="text-lg w-full h-14 px-10"
//             onClick={() => setIsSidebarOpen(true)}
//           >
//             Install
//           </Button>
//         </div>
//       </div>
//       <div className="flex gap-2.5">
//         <NavLink
//           end
//           className={({ isActive }) =>
//             cn(
//               buttonVariants({ variant: "outline" }),
//               isActive && "bg-accent text-foreground "
//             )
//           }
//           to={`/products/${product.unique_id}/overview`}
//         >
//           Overview
//         </NavLink>
//         <NavLink
//           className={({ isActive }) =>
//             cn(
//               buttonVariants({ variant: "outline" }),
//               isActive && "bg-accent text-foreground "
//             )
//           }
//           to={`/products/${product.unique_id}/reviews`}
//         >
//           Details
//         </NavLink>
//       </div>
//       <div>
//         <Outlet
//           context={{
//             product_id: product.unique_id,
//             description: product.description || "No description available.",
//             how_it_works: product.analyzed_description || "Details about how it works are not available.",
//             review_count: 0,
//           }}
//         />
//       </div>
//       {isSidebarOpen && (
//           <InstallSidebar
//               product={product as any} // 임시 타입 단언 - InstallSidebar가 MCPServerDetailView를 지원하도록 추후 수정 필요
//               isOpen={isSidebarOpen}
//               onClose={() => setIsSidebarOpen(false)}
//           />
//       )}
//     </div>
//   );
// }

import { type LoaderFunctionArgs, Outlet, useLoaderData, useOutletContext } from "react-router";
import { makeSSRClient } from "../../../supa-client";
import { getProductDetailById } from "../queries";
import { MCPServerDetailView, ProductDetailLoaderData } from "../types/MCPServerDetailTypes";

// 로더
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const id = params?.id;
  if (!id) {
    throw new Response("Product ID not found in URL params", { status: 400 });
  }

  const { client } = makeSSRClient(request);
  // getProductDetailById가 반환하는 타입을 MCPServerDetailView로 단언
  const product = await getProductDetailById(client, { id: Number(id) }) as MCPServerDetailView | null;
  console.log('[ProductDetailLayout loader] product data:', product);
  // console.log('[ProductDetailLayout loader] product data id:', product?.id); // unique_id를 사용하거나, MCPServerDetailView에 id가 있는지 확인
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }

  return { product };
};

// Layout 컴포넌트
export default function ProductDetailLayout() {
  const { product } = useLoaderData() as ProductDetailLoaderData;
  const rootContext = useOutletContext<{
    isLoggedIn: boolean;
    name: string;
    userId: string;
    username: string;
    avatar: string | null;
    email: string;
  }>();

  return (
    <Outlet 
      context={{ 
        product, 
        ...rootContext // 🔥 Root context의 모든 정보를 전달 (userId 포함)
      }} 
    />
  );
}
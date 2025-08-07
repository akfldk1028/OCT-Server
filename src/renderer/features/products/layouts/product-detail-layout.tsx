import { type LoaderFunctionArgs, Outlet, useLoaderData, useOutletContext } from "react-router";
import { makeSSRClient } from "../../../supa-client";
import { getProductDetailById } from "../queries";
import { MCPServerDetailView, ProductDetailLoaderData } from "../types/MCPServerDetailTypes";

// 로더
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  console.log('🔥 [ProductDetailLayoutLoader] 시작 - params:', params);
  
  const id = params?.id;
  if (!id) {
    console.error('🔥 [ProductDetailLayoutLoader] ID가 없습니다!');
    throw new Response("Product ID not found in URL params", { status: 400 });
  }

  console.log('🔥 [ProductDetailLayoutLoader] ID:', id);

  try {
    const { client } = makeSSRClient(request);
    console.log('🔥 [ProductDetailLayoutLoader] Supabase 클라이언트 생성 완료');
    
    // getProductDetailById가 반환하는 타입을 MCPServerDetailView로 단언
    const product = await getProductDetailById(client, { id: Number(id) }) as MCPServerDetailView | null;
    console.log('🔥 [ProductDetailLayoutLoader] product data:', product);
    
    if (!product) {
      console.error('🔥 [ProductDetailLayoutLoader] Product not found for ID:', id);
      throw new Response("Product not found", { status: 404 });
    }

    console.log('🔥 [ProductDetailLayoutLoader] 성공적으로 로드됨!');
    return { product };
  } catch (error) {
    console.error('🔥 [ProductDetailLayoutLoader] 에러 발생:', error);
    throw error;
  }
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
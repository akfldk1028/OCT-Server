import { Outlet, data, useOutletContext, type LoaderFunctionArgs } from "react-router";
import { makeAdminClient } from "../../../supa-client";

// export const loader = async ({ params }: LoaderFunctionArgs) => {
//   const adminClient = makeAdminClient();
//   await adminClient.rpc("track_event", {
//     event_type: "github_popularity_view",
//     event_data: {
//       uniqueId: params.uniqueId,
//     },
//   });
//   return null;
// };

export default function ProductOverviewPage() {
  const { description, how_it_works } = useOutletContext<{
    description: string;
    how_it_works: string;
  }>();
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h3 className="text-lg font-bold">What is this product?</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold">How does it work?</h3>
        <p className="text-muted-foreground">{how_it_works}</p>
      </div>
    </div>
  );
}

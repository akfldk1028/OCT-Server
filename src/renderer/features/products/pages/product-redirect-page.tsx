import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

export const loader = ({ params }: LoaderFunctionArgs) => {
  return redirect(`/products/${params.id}/overview`);
};

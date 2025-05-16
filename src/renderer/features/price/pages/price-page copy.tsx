
import { z } from "zod";
import {Link, type MetaFunction, useLoaderData ,type LoaderFunctionArgs,} from "react-router";
import { supabase } from "../../../supa-client";
import {  IS_ELECTRON, IS_WEB } from '../../../utils/environment';

export const meta : MetaFunction = () => {
  return [
    { title: `Developer Tools | ProductHunt Clone` },
    { name: "description", content: `Browse Developer Tools products` },
  ];
};

const paramsSchema = z.object({
  category: z.coerce.number(),
});

export const loader = async () => {
 
  return { };
};

export default function P() {
  return (
    <div className="space-y-10">
  

    </div>
  );
}

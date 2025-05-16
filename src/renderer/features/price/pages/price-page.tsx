import { z } from "zod";
import {Link, type MetaFunction, useLoaderData ,type LoaderFunctionArgs,} from "react-router";
import { supabase } from "../../../supa-client";
import {  IS_ELECTRON, IS_WEB } from '../../../utils/environment';
import { Button } from "@/components/ui/button";

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

export default function PricePage() {
  return (
    <div className="max-w-[76rem] mx-auto px-4 space-y-10">
      <header className="text-center mb-8 select-none">
        <h2 id="pricing-heading" className="text-4xl sm:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent py-2">Pricing</span>
        </h2>
        <p className="text-md sm:text-lg text-[#999999] max-w-2xl mx-auto">
          Simple and transparent pricing for everyone.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 w-full text-white select-none gap-0 md:gap-0" role="list" aria-label="Pricing plans">
        {/* Free Plan */}
        <div className="flex flex-col p-8 pr-12 border border-white/10 my-10 rounded-2xl md:rounded-l-2xl bg-zinc-900/30 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset] m-4 md:-mr-4" role="listitem">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <strong className="text-lg font-bold text-white">Interview Coder <span className="text-sm text-yellow-200">Free</span></strong>
              <span className="text-lg text-zinc-400">Try it and see</span>
            </div>
          </div>
          <div className="flex items-center text-zinc-500 mt-10">
            <span className="text-6xl font-semibold text-white">$0</span>
            <span className="ml-2 font-mono text-sm">/ month</span>
          </div>
          <div className="mt-4 mb-5 flex items-center justify-center h-6 after:content-[''] after:block after:h-px after:w-full after:bg-[#1b1c1e]"></div>
          <ul className="flex flex-col gap-2" role="list" aria-label="Free plan features">
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Evaluate features
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Normal agent models
            </li>
          </ul>
          <div className="flex flex-col gap-6 mt-auto">
            <Button className="w-full mt-6" variant="secondary">Get Started</Button>
          </div>
        </div>
        {/* Pro Plan (Annual) */}
        <div className="flex flex-col p-10 border border-white/10 rounded-2xl bg-gradient-to-br from-[#11100B] to-[#101007] shadow-[0_1px_1px_0_rgba(255,255,255,0.1)_inset,0_2px_40px_10px_rgba(255,255,0,0.05),0_0_16px_-7px_rgba(255,255,0,0.05)] my-4 z-10 relative" role="listitem" aria-label="Pro plan - Most popular">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <strong className="text-lg font-bold text-white">Interview Coder <span className="text-xl text-primary">Pro</span></strong>
              <span className="text-lg text-zinc-400">Most popular</span>
            </div>
            {/* 아이콘 */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 54 54" className="w-[58px] h-[58px] -m-[9px]" aria-hidden="true"><g filter="url(#check)"><path fill="#FFFF00" fillRule="evenodd" d="m33.121 12.082-1.648-1.764a6.125 6.125 0 0 0-8.95 0l-1.648 1.764a.13.13 0 0 1-.095.04l-2.413-.082a6.125 6.125 0 0 0-6.328 6.328l.082 2.412a.13.13 0 0 1-.04.096l-1.763 1.648a6.125 6.125 0 0 0 0 8.95l1.763 1.648c.026.025.04.06.04.095l-.082 2.413a6.125 6.125 0 0 0 6.328 6.328l2.413-.081a.13.13 0 0 1 .095.04l1.648 1.762a6.125 6.125 0 0 0 8.95 0l1.648-1.763a.13.13 0 0 1 .096-.04l2.412.082a6.125 6.125 0 0 0 6.328-6.328l-.081-2.413a.13.13 0 0 1 .04-.095l1.763-1.648a6.125 6.125 0 0 0 0-8.95l-1.764-1.648a.13.13 0 0 1-.04-.096l.082-2.412a6.125 6.125 0 0 0-6.328-6.328l-2.412.081a.13.13 0 0 1-.096-.04m-8.406.285a3.125 3.125 0 0 1 4.566 0l1.648 1.763a3.13 3.13 0 0 0 2.389.99l2.412-.082a3.125 3.125 0 0 1 3.23 3.229l-.083 2.412c-.03.902.33 1.773.99 2.389l1.763 1.648a3.125 3.125 0 0 1 0 4.566l-1.763 1.648a3.13 3.13 0 0 0-.99 2.389l.082 2.412a3.125 3.125 0 0 1-3.229 3.229l-2.412-.082a3.13 3.13 0 0 0-2.389.99l-1.648 1.763a3.125 3.125 0 0 1-4.566 0l-1.648-1.763a3.13 3.13 0 0 0-2.389-.99l-2.412.082a3.125 3.125 0 0 1-3.229-3.229l.082-2.412a3.13 3.13 0 0 0-.99-2.389l-1.763-1.648a3.125 3.125 0 0 1 0-4.566l1.763-1.648a3.13 3.13 0 0 0 .99-2.389l-.082-2.412a3.125 3.125 0 0 1 3.229-3.229l2.412.082c.902.03 1.773-.33 2.389-.99zm5.558 9.24a1.5 1.5 0 0 1 2.204 2.036h-.002l-.007.01-.035.037-.14.158c-.124.14-.306.348-.53.615a40 40 0 0 0-1.723 2.205c-1.339 1.845-2.788 4.188-3.484 6.406a1.5 1.5 0 0 1-2.492.611l-3.75-3.75a1.5 1.5 0 1 1 2.121-2.12l2.135 2.134c.88-1.884 2.033-3.652 3.043-5.043a43 43 0 0 1 2.433-3.046l.163-.183.045-.05.013-.014z" clipRule="evenodd"></path></g></svg>
          </div>
          <div className="flex items-center text-stone-500 mt-10">
            <span className="text-6xl font-semibold text-white">$21</span>
            <span className="ml-2 font-mono text-sm">/ month</span>
          </div>
          <div className="mt-8 mb-6 flex items-center justify-center h-6 after:content-[''] after:block after:h-px after:w-[57px] after:bg-stone-800/80 before:content-[''] before:block before:h-px before:w-[57px] before:bg-stone-800/80"><span className="px-2 text-stone-400/70 font-mono whitespace-nowrap text-sm">$300 billed annually</span></div>
          <ul className="flex flex-col gap-2 mb-8" role="list" aria-label="Pro plan features">
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Unlimited yearly usage
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Solving and debugging
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Most powerful agent models
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              24/7 customer support
            </li>
          </ul>
          <div className="flex flex-col gap-6 mt-10">
            <Button className="w-full" variant="default">Subscribe</Button>
          </div>
        </div>
        {/* Pro Plan (Monthly) */}
        <div className="flex flex-col p-8 pl-12 border border-white/10 my-10 rounded-2xl md:rounded-r-2xl bg-zinc-900/30 shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset] m-4 md:-ml-4 relative" role="listitem">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <strong className="text-lg font-bold text-white">Interview Coder <span className="text-xl text-primary">Pro</span></strong>
              <span className="text-lg text-zinc-400">Monthly subscription</span>
            </div>
            {/* 아이콘 */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 40 40" className="w-[60px] h-[60px] -m-[9px] -mt-10" aria-hidden="true"><g filter="url(#check)"><path fill="#FFFF00" fillRule="evenodd" d="M 30.273001 21.606003 C 30.835226 20.997383 31.784382 20.959774 32.393002 21.521999 C 33.001617 22.084227 33.039227 23.033382 32.477001 23.642 L 32.474998 23.642 L 32.467999 23.652 L 32.432999 23.688999 L 32.292999 23.847 C 32.168999 23.987 31.987 24.195 31.763 24.462 C 31.163124 25.17668 30.58844 25.912128 30.040001 26.667 C 28.701 28.511999 27.252001 30.855 26.556 33.073002 C 26.398827 33.573494 25.991606 33.955513 25.482103 34.080437 C 24.972601 34.205357 24.434856 34.055031 24.063999 33.683998 L 20.313999 29.934 C 19.917534 29.558817 19.75617 28.997879 19.892675 28.469376 C 20.029182 27.940874 20.442009 27.528242 20.970575 27.391985 C 21.499142 27.255728 22.060003 27.417356 22.434999 27.813999 L 24.57 29.948 C 25.450001 28.063999 26.603001 26.296 27.613001 24.905001 C 28.377533 23.853407 29.189367 22.837029 30.046 21.859001 L 30.209 21.676003 L 30.254 21.625999 L 30.267 21.612 Z" clipRule="evenodd"></path></g></svg>
          </div>
          <div className="flex items-center text-zinc-500 mt-10">
            <span className="text-6xl font-semibold text-white">$60</span>
            <span className="ml-2 font-mono">/ month</span>
          </div>
          <div className="mt-4 mb-5 flex items-center justify-center h-6 after:content-[''] after:block after:h-px after:w-full after:bg-[#1b1c1e]"></div>
          <ul className="flex flex-col gap-2" role="list" aria-label="Monthly Pro plan features">
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Unlimited monthly usage
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Solving and debugging
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              Most powerful agent models
            </li>
            <li className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.25 5.75s-2.385 2.54-3 4.5l-1.5-1.5m8.5-.75a6.25 6.25 0 1 1-12.5 0 6.25 6.25 0 0 1 12.5 0Z"></path></svg>
              24/7 customer support
            </li>
          </ul>
          <div className="flex flex-col gap-6 mt-10">
            <Button className="w-full" variant="default">Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

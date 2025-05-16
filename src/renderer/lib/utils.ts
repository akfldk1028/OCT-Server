import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const ensureClaudeApi = () => {
  if (!window.claudeAPI) {
    console.warn('Claude API not available.');
    return null;
  }
  return window.claudeAPI;
};
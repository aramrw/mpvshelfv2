import type { ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...classLists: ClassValue[]) => twMerge(clsx(classLists));

export function escapeCSSUrl(url: string) {
  return url.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

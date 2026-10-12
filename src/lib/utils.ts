import { NAV_SECTIONS } from "./constants";

/**
 * Resolves the current route to its sidebar label, so the Topbar title
 * always matches what's highlighted in the Sidebar — no per-page prop needed.
 * Falls back to a title-cased version of the last path segment for routes
 * not present in NAV_SECTIONS (e.g. a dynamic detail page).
 */
export function getPageTitle(pathname: string): string {
  const flatItems = NAV_SECTIONS.flatMap((section) => section.items);

  const exact = flatItems.find((item) => item.href === pathname);
  if (exact) return exact.label;

  const nested = flatItems.find((item) => pathname.startsWith(`${item.href}/`));
  if (nested) return nested.label;

  const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "Dashboard";
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
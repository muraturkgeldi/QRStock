'use client';

import Link, { type LinkProps } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = LinkProps & {
  children: React.ReactNode;
  className?: string;
};

export default function LinkWithFrom({ href, children, ...rest }: Props) {
  const pathname = usePathname();
  const sp = useSearchParams();

  // Determine the 'from' value. Prioritize the 'from' in the current URL.
  // If it doesn't exist, use the current pathname as the fallback.
  const fromValue = sp.get("from") || pathname;

  const hrefStr = typeof href === "string" ? href : href.pathname?.toString() ?? "";
  
  // Check if the target href ALREADY has its own 'from' parameter.
  // This prevents overwriting an explicitly set 'from' on a link.
  const targetUrl = new URL(hrefStr, "http://localhost"); // Base URL is dummy
  if (targetUrl.searchParams.has("from")) {
    // If it already has one, don't add another.
     return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  const hasQuery = hrefStr.includes("?");
  const nextHref = `${hrefStr}${hasQuery ? "&" : "?"}from=${encodeURIComponent(fromValue)}`;

  return (
    <Link href={nextHref as any} {...rest}>
      {children}
    </Link>
  );
}

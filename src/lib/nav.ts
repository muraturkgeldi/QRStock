export function safeFrom(from: string | null | undefined, fallback: string) {
  if (!from) return fallback;
  if (!from.startsWith("/")) return fallback;
  return from;
}

export function withFrom(href: string, from: string) {
  const u = new URL(href, "http://local");
  u.searchParams.set("from", from);
  return u.pathname + (u.search ? u.search : "");
}


export function getFrom(searchParams: URLSearchParams, fallback: string) {
  const from = searchParams.get("from");
  return from && from.startsWith("/") ? from : fallback;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function redirectSystemPath({ path }: { path: string }): string {
  try {
    const url = new URL(path, "https://reptikeep.com");
    const isLabelPath =
      url.pathname === "/a/" ||
      url.pathname === "/a" ||
      (url.hostname === "a" && (url.pathname === "/" || url.pathname === ""));
    if (!isLabelPath) return path;

    const rawId = url.searchParams.get("id");
    const id = rawId && UUID_RE.test(rawId) ? rawId : "invalid";
    const log = url.searchParams.get("log") === "1";

    return `/animal/${id}${log ? "?log=1" : ""}`;
  } catch {
    return path;
  }
}

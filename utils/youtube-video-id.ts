/** Extract YouTube video ID from common URL shapes (watch, shorts, youtu.be, embed). */
export function parseYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const fromQuery = u.searchParams.get("v");
    if (fromQuery) return fromQuery;

    const shorts = u.pathname.match(/\/shorts\/([^/?#]+)/);
    if (shorts?.[1]) return shorts[1];

    if (u.hostname === "youtu.be" || u.hostname.endsWith(".youtu.be")) {
      const short = u.pathname.match(/^\/([^/?#]+)/);
      if (short?.[1]) return short[1];
    }

    const embed = u.pathname.match(/\/embed\/([^/?#]+)/);
    if (embed?.[1]) return embed[1];

    return null;
  } catch {
    return null;
  }
}

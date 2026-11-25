export function weeksFromContributions(days, weeks = 52) {
  const slice = days.slice(-weeks * 7);
  const bars = [];
  for (let end = slice.length; end > 0; end -= 7) {
    const chunk = slice.slice(Math.max(0, end - 7), end);
    bars.unshift(chunk.reduce((sum, day) => sum + day.count, 0));
  }

  let longest = 0;
  let run = 0;
  for (const day of slice) {
    run = day.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  let current = 0;
  for (let i = slice.length - 1; i >= 0 && slice[i].count > 0; i -= 1) current += 1;

  return {
    bars,
    total: bars.reduce((sum, count) => sum + count, 0),
    longest,
    current,
  };
}

export function selectTracks(repos, { user, limit = 8 }) {
  return [...repos]
    .filter((repo) => !repo.fork && repo.name !== user)
    .sort(
      (a, b) =>
        b.stargazers_count - a.stargazers_count ||
        String(b.pushed_at ?? "").localeCompare(String(a.pushed_at ?? "")),
    )
    .slice(0, limit)
    .map((repo) => ({
      name: repo.name,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language ?? "—",
    }));
}

export function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

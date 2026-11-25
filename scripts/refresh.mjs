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

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

export function renderEqualizerSvg({ bars, total }, { width = 880, height = 140 } = {}) {
  const max = Math.max(1, ...bars);
  const barWidth = 10;
  const gap = 6;
  const baseline = 120;
  const maxHeight = 84;

  const rects = bars
    .map((count, i) => {
      const h = 4 + Math.round((count / max) * maxHeight);
      const opacity = (0.45 + 0.55 * (count / max)).toFixed(2);
      const x = 16 + i * (barWidth + gap);
      return `<rect x="${x}" y="${baseline - h}" width="${barWidth}" height="${h}" rx="2" fill="#ff7a45" opacity="${opacity}"/>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<title>${escapeXml(`${bars.length} weeks of contributions · ${total} plays`)}</title>
<text x="${width - 16}" y="20" text-anchor="end" font-family="${MONO}" font-size="12" fill="#6e7681">${escapeXml(`52 weeks · ${total} plays`)}</text>
${rects}
<line x1="16" y1="${baseline + 1}" x2="${width - 16}" y2="${baseline + 1}" stroke="#30363d" stroke-width="1"/>
</svg>`;
}

export function renderTapeSvg(
  { name, side, year, nowPlaying, stars },
  { width = 880, height = 320 } = {},
) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<title>${escapeXml(`${name} — mixtape, side A ${side}`)}</title>
<rect x="8" y="8" width="864" height="304" rx="18" fill="#161b22" stroke="#30363d"/>
<rect x="40" y="56" width="800" height="208" rx="12" fill="#f4e8d0"/>
<circle cx="24" cy="24" r="3" fill="#30363d"/>
<circle cx="856" cy="24" r="3" fill="#30363d"/>
<circle cx="24" cy="296" r="3" fill="#30363d"/>
<circle cx="856" cy="296" r="3" fill="#30363d"/>
<text x="64" y="92" font-family="${MONO}" font-size="12" letter-spacing="2" fill="#1b1b1b" opacity="0.65">${escapeXml(`SIDE A · ${side}`)}</text>
<text x="816" y="92" text-anchor="end" font-family="${MONO}" font-size="12" fill="#1b1b1b" opacity="0.65">${escapeXml(year)}</text>
<text x="64" y="140" font-family="${MONO}" font-size="30" font-weight="700" fill="#1b1b1b">${escapeXml(name)}</text>
<text x="64" y="166" font-family="${MONO}" font-size="13" fill="#1b1b1b" opacity="0.65">greatest hits</text>
<rect x="668" y="130" width="92" height="4" fill="#1b1b1b"/>
<circle cx="668" cy="132" r="34" fill="#0d1117" stroke="#1b1b1b" stroke-width="2"/>
<circle cx="668" cy="132" r="10" fill="#f4e8d0"/>
<circle cx="760" cy="132" r="34" fill="#0d1117" stroke="#1b1b1b" stroke-width="2"/>
<circle cx="760" cy="132" r="10" fill="#f4e8d0"/>
<rect x="64" y="196" width="752" height="44" rx="8" fill="#1b1b1b"/>
<text x="84" y="224" font-family="${MONO}" font-size="13" fill="#f4e8d0">${escapeXml(`▶ NOW PLAYING · ${nowPlaying} · ★ ${stars}`)}</text>
</svg>`;
}

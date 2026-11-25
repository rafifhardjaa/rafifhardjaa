import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

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
      const ratio = Math.sqrt(count / max);
      const h = 4 + Math.round(ratio * maxHeight);
      const opacity = (0.45 + 0.55 * ratio).toFixed(2);
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

const TRACKLIST_START = "<!-- TRACKLIST:START -->";
const TRACKLIST_END = "<!-- TRACKLIST:END -->";

export function renderTracklist(tracks) {
  return tracks
    .map(
      (track, i) =>
        `${String(i + 1).padStart(2, "0")}. **[${track.name}](${track.url})** — ★ ${track.stars} · ${track.language}`,
    )
    .join("\n");
}

export function replaceBlock(source, body) {
  const start = source.indexOf(TRACKLIST_START);
  const end = source.indexOf(TRACKLIST_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("README is missing TRACKLIST markers");
  }
  return `${source.slice(0, start + TRACKLIST_START.length)}\n${body}\n${source.slice(end)}`;
}

async function writeFileIfChanged(path, content) {
  const previous = await readFile(path, "utf8").catch(() => null);
  if (previous === content) return false;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return true;
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "rafifhardjaa-readme-refresh",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} · ${url}`);
  return response.json();
}

function topLanguage(tracks) {
  const counts = new Map();
  for (const track of tracks) {
    if (track.language === "—") continue;
    counts.set(track.language, (counts.get(track.language) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "code";
}

export async function main() {
  const user = process.env.GH_USER ?? "rafifhardjaa";
  const token = process.env.GITHUB_TOKEN;
  const root = fileURLToPath(new URL("../", import.meta.url));

  const [profile, repos] = await Promise.all([
    fetchJson(`https://api.github.com/users/${user}`, token),
    fetchJson(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`, token),
  ]);

  const tracks = selectTracks(repos, { user, limit: 8 });
  const top = tracks[0];

  const tape = renderTapeSvg({
    name: profile.name || user,
    side: topLanguage(tracks),
    year: new Date().getFullYear(),
    nowPlaying: top?.name ?? "nothing yet",
    stars: top?.stars ?? 0,
  });

  const readmePath = join(root, "README.md");
  const readme = await readFile(readmePath, "utf8");
  const nextReadme = replaceBlock(readme, renderTracklist(tracks));

  const changed = [];
  if (await writeFileIfChanged(join(root, "assets/tape.svg"), tape)) changed.push("assets/tape.svg");

  let equalizer = null;
  try {
    const calendar = await fetchJson(
      `https://github-contributions-api.jogruber.de/v4/${user}?y=last`,
    );
    equalizer = renderEqualizerSvg(weeksFromContributions(calendar.contributions));
  } catch (error) {
    console.warn(`contributions unavailable, keeping existing equalizer: ${error.message}`);
  }
  if (
    equalizer &&
    (await writeFileIfChanged(join(root, "assets/equalizer.svg"), equalizer))
  ) {
    changed.push("assets/equalizer.svg");
  }

  if (await writeFileIfChanged(readmePath, nextReadme)) changed.push("README.md");

  console.log(changed.length ? `updated ${changed.join(", ")}` : "no changes");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

const J_CARD_BARCODE = [
  3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 2,
];

function statText(value, suffix = "") {
  return Number.isFinite(value) ? `${value}${suffix}` : "—";
}

export function renderJCardSvg(
  { repos, stars, contributions, longest, followers, year },
  { width = 880, height = 200 } = {},
) {
  const stats = [
    [statText(repos), "REPOS"],
    [statText(stars), "STARS"],
    [statText(contributions), "CONTRIBUTIONS"],
    [statText(longest, "d"), "STREAK"],
    [statText(followers), "FOLLOWERS"],
  ];

  const values = stats
    .map(([value, label], i) => {
      const x = 40 + i * 132;
      return `<text x="${x}" y="112" font-family="${MONO}" font-size="28" font-weight="700" fill="#f4e8d0">${escapeXml(value)}</text>
<text x="${x}" y="136" font-family="${MONO}" font-size="10" letter-spacing="1" fill="#8b949e">${escapeXml(label)}</text>`;
    })
    .join("\n");

  let barX = 745;
  const barcode = J_CARD_BARCODE.map((barWidth) => {
    const bar = `<rect x="${barX}" y="70" width="${barWidth}" height="80" fill="#f4e8d0" opacity="0.85"/>`;
    barX += barWidth + 2;
    return bar;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">
<title>${escapeXml(`${statText(repos)} repositories, ${statText(stars)} stars, ${statText(contributions)} contributions, longest streak ${statText(longest, " days")}, ${statText(followers)} followers`)}</title>
<rect x="8" y="8" width="864" height="184" rx="14" fill="#161b22" stroke="#30363d"/>
<text x="40" y="44" font-family="${MONO}" font-size="10" letter-spacing="2" fill="#8b949e">PRESSING DETAILS</text>
${values}
<line x1="716" y1="70" x2="716" y2="150" stroke="#30363d"/>
${barcode}
<text x="40" y="176" font-family="${MONO}" font-size="10" fill="#8b949e">${escapeXml(`mastered in semarang · ${statText(year)}`)}</text>
</svg>`;
}

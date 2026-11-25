import test from "node:test";
import assert from "node:assert/strict";
import {
  weeksFromContributions,
  selectTracks,
  escapeXml,
  renderEqualizerSvg,
  renderTapeSvg,
  renderTracklist,
  replaceBlock,
} from "./refresh.mjs";

test("weeksFromContributions buckets 364 days into 52 bars ending today", () => {
  const days = Array.from({ length: 364 }, (_, i) => ({ date: `d${i}`, count: i % 2 }));
  const r = weeksFromContributions(days);
  assert.equal(r.bars.length, 52);
  assert.equal(r.total, 182);
  assert.equal(r.bars.at(-1), 4);
});

test("weeksFromContributions ignores a partial leading week", () => {
  const days = Array.from({ length: 368 }, () => ({ date: "x", count: 1 }));
  const r = weeksFromContributions(days);
  assert.equal(r.bars.length, 52);
  assert.equal(r.total, 364);
});

test("selectTracks drops forks and the profile repo, sorts by stars, limits", () => {
  const repos = [
    { name: "rafifhardjaa", fork: false, stargazers_count: 99 },
    { name: "forked", fork: true, stargazers_count: 99 },
    { name: "a", fork: false, stargazers_count: 2, html_url: "u/a", language: "TypeScript" },
    { name: "b", fork: false, stargazers_count: 5, html_url: "u/b", language: null },
  ];
  const t = selectTracks(repos, { user: "rafifhardjaa", limit: 1 });
  assert.deepEqual(t, [{ name: "b", url: "u/b", stars: 5, language: "—" }]);
});

test("escapeXml escapes markup characters", () => {
  assert.equal(escapeXml(`a & b <c> "d"`), "a &amp; b &lt;c&gt; &quot;d&quot;");
});

test("equalizer renders one bar per week plus the total", () => {
  const svg = renderEqualizerSvg({ bars: Array(52).fill(3), total: 156 });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.equal((svg.match(/<rect /g) || []).length, 52);
  assert.match(svg, /156 plays/);
});

test("tape renders side, name and now playing", () => {
  const svg = renderTapeSvg({
    name: "Abdurrahman Rafif",
    side: "TypeScript",
    year: 2026,
    nowPlaying: "LMS",
    stars: 2,
  });
  assert.match(svg, /SIDE A/);
  assert.match(svg, /Abdurrahman Rafif/);
  assert.match(svg, /LMS/);
  assert.doesNotMatch(svg, /undefined/);
});

test("renderTracklist numbers tracks and shows stars and language", () => {
  const md = renderTracklist([
    { name: "LMS", url: "u/lms", stars: 2, language: "TypeScript" },
    { name: "Al-amin", url: "u/al", stars: 2, language: "SCSS" },
  ]);
  assert.match(md, /^01\. \*\*\[LMS\]\(u\/lms\)\*\* — ★ 2 · TypeScript$/m);
  assert.match(md, /^02\. /m);
});

test("replaceBlock keeps surrounding text and is idempotent", () => {
  const src = "a\n<!-- TRACKLIST:START -->\nold\n<!-- TRACKLIST:END -->\nz";
  const once = replaceBlock(src, "new");
  assert.equal(once, "a\n<!-- TRACKLIST:START -->\nnew\n<!-- TRACKLIST:END -->\nz");
  assert.equal(replaceBlock(once, "new"), once);
});

test("replaceBlock throws when markers are missing", () => {
  assert.throws(() => replaceBlock("no markers", "x"), /TRACKLIST markers/);
});

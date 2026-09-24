// Builds the profile's SVG assets (neofetch header, activity) in light + dark.
// Fonts are subset from Google Fonts per SVG and inlined, so the images render
// identically everywhere without external requests. Runs daily via GitHub Actions.
//
//   GITHUB_TOKEN=... node scripts/build.mjs

import { mkdir, readFile, writeFile } from "node:fs/promises";

const USER = "RuslanAMandell";
const OUT = new URL("../assets/", import.meta.url);
const TOKEN = process.env.GITHUB_TOKEN;

const THEMES = {
  dark: {
    bg: "#0c0c0b", surface: "#131312", line: "#272725", ink: "#ecebe6",
    muted: "#8b8a84", faint: "#3a3a37", accent: "#c8a868",
  },
  light: {
    bg: "#faf9f6", surface: "#ffffff", line: "#e3e1da", ink: "#161615",
    muted: "#6d6c66", faint: "#d6d4cc", accent: "#94733a",
  },
};


// ---------- helpers ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function gh(query, variables = {}) {
  if (!TOKEN) return null;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

// families: [["Instrument Serif", "ital@0;1"], ...]; returns an inline <style> block.
async function fontCSS(families, text) {
  const chars = [...new Set(text + " 0123456789")].join("");
  const fam = families.map(([name, axis]) => `family=${name.replace(/ /g, "+")}${axis ? `:${axis}` : ""}`).join("&");
  const css = await (await fetch(`https://fonts.googleapis.com/css2?${fam}&text=${encodeURIComponent(chars)}`, { headers: { "User-Agent": UA } })).text();
  const cache = new Map();
  let out = "";
  for (const block of css.match(/@font-face\s*{[^}]+}/g) ?? []) {
    const url = block.match(/url\(([^)]+)\)/)[1];
    if (!cache.has(url)) {
      const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
      cache.set(url, buf.toString("base64"));
    }
    out += block
      .replace(/url\([^)]+\)/, `url(data:font/woff2;base64,${cache.get(url)})`)
      .replace(/\s*unicode-range:[^;]+;/, "")
      .replace(/\s+/g, " ") + "\n";
  }
  return out;
}

const FONTS = [["Instrument Serif", "ital@0;1"], ["Geist", "wght@400;500"], ["Geist Mono", "wght@400;500"]];

// ---------- header ----------
// Neofetch-style hero: ASCII R logo (data/ascii-r.txt, generated once from the
// avatar) beside an info panel. Everything is visible by default and animates
// *from* hidden, so renderers that skip CSS animation still show the final frame.

const ASCII = (await readFile(new URL("../data/ascii-r.txt", import.meta.url), "utf8")).replace(/\s+$/, "").split("\n");
const JOINED = new Date("2021-02-02T00:00:00Z");

function uptime() {
  const now = new Date();
  const months = (now.getUTCFullYear() - JOINED.getUTCFullYear()) * 12 + now.getUTCMonth() - JOINED.getUTCMonth();
  const y = Math.floor(months / 12), m = months % 12;
  return `${y} years, ${m} month${m === 1 ? "" : "s"}`;
}

function header(t, fonts, contributions) {
  const W = 1200, top = 118, lh = 15.6;
  const H = Math.round(top + ASCII.length * lh + 44);
  const art = ASCII.map((row, i) => {
    // Dense glyphs in full ink, light ones muted, so the outline reads cleanly.
    const spans = row.replace(/([#%@*]+)|([^#%@*]+)/g, (m, dense) => dense ? `<tspan fill="${t.ink}">${esc(m)}</tspan>` : esc(m));
    return `<text class="a row" style="animation-delay:${(0.25 + i * 0.045).toFixed(3)}s" x="52" y="${(top + i * lh).toFixed(1)}" xml:space="preserve">${spans}</text>`;
  }).join("\n");

  const info = [
    ["Name", "Ruslan Mandell"],
    ["Role", "Software Engineer"],
    ["Location", "Toronto"],
    ["School", "TMU, Computer Science ’27"],
    ["Languages", "TypeScript · Python · Swift · Luau"],
    ["Editor", "Claude Code"],
    ["Off hours", "game dev · BJJ · walking"],
    ["Uptime", uptime()],
    ["Contribs", contributions != null ? `${contributions.toLocaleString("en-US")} in the last year` : "—"],
  ];
  const px = 540, py = top + 10, plh = 34;
  const start = 0.25 + ASCII.length * 0.045;
  const line = (i, body) => `<g class="ln" style="animation-delay:${(start + i * 0.09).toFixed(2)}s">${body}</g>`;
  const panel = [
    line(0, `<text class="p" x="${px}" y="${py}"><tspan fill="${t.accent}">ruslan</tspan>@<tspan fill="${t.accent}">github</tspan></text>`),
    line(1, `<text class="p" x="${px}" y="${py + plh}" fill="${t.muted}">${"-".repeat(13)}</text>`),
    ...info.map(([k, v], i) => line(i + 2, `<text class="p" x="${px}" y="${py + (i + 2) * plh}"><tspan fill="${t.accent}">${esc(k)}</tspan><tspan fill="${t.muted}">:</tspan> ${esc(v)}</text>`)),
    line(info.length + 2, [t.faint, t.muted, t.ink, t.accent, t.line, t.surface].map((c, i) =>
      `<rect x="${px + i * 34}" y="${py + (info.length + 2) * plh - 12}" width="28" height="16" rx="2" fill="${c}" stroke="${t.line}"/>`).join("")),
  ].join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="ruslan@github neofetch: Ruslan Mandell, software engineer in Toronto">
<style>${fonts}
.pr{font-family:'Geist Mono',ui-monospace,monospace;font-size:16px;fill:${t.muted}}
.a{font-family:'Geist Mono',ui-monospace,monospace;font-size:14.3px;fill:${t.muted}}
.p{font-family:'Geist Mono',ui-monospace,monospace;font-size:18px;fill:${t.ink}}
.row{animation:wipe .55s steps(24,end) backwards}
@keyframes wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.ln{animation:in .45s cubic-bezier(.2,.7,.2,1) backwards}
@keyframes in{from{opacity:0;transform:translateX(-6px)}}
.caret{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.row,.ln,.caret{animation:none}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.line}"/>
<circle cx="34" cy="30" r="5.5" fill="${t.faint}"/><circle cx="54" cy="30" r="5.5" fill="${t.faint}"/><circle cx="74" cy="30" r="5.5" fill="${t.faint}"/>
<line x1="0" y1="56.5" x2="${W}" y2="56.5" stroke="${t.line}"/>
<text class="pr" x="52" y="90"><tspan fill="${t.accent}">ruslan@github</tspan> ~ $ <tspan fill="${t.ink}">neofetch</tspan><tspan class="caret" fill="${t.accent}"> ▍</tspan></text>
${art}
${panel}
</svg>`;
}

const PRINTABLE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("") + "·’—▍";

// ---------- activity ----------

function activity(t, fonts, cal) {
  const W = 1200, H = 290;
  const weeks = cal.weeks.map((w) => w.contributionDays.reduce((s, d) => s + d.contributionCount, 0));
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const active = days.filter((d) => d.contributionCount > 0).length;
  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; best = Math.max(best, run); }
  let cur = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].contributionCount > 0) cur++;
    else if (i === days.length - 1) continue; // today may not have activity yet
    else break;
  }
  const max = Math.max(...weeks, 1);
  const x0 = 480, x1 = 1150, base = 214, top = 56;
  const step = (x1 - x0) / weeks.length;
  const bw = Math.max(step - 4, 3);
  const bars = weeks.map((v, i) => {
    const h = Math.max((v / max) * (base - top), v ? 2 : 1);
    const last = i === weeks.length - 1;
    return `<rect x="${(x0 + i * step).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1.5" fill="${last ? t.accent : v ? t.ink : t.faint}" opacity="${last ? 1 : v ? 0.85 : 1}"/>`;
  }).join("");
  // Month labels at the first week that starts in a new month.
  let months = "", prev = "";
  cal.weeks.forEach((w, i) => {
    const m = new Date(w.contributionDays[0].date + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    if (m !== prev && i > 0 && i < weeks.length - 2) months += `<text class="m" x="${(x0 + i * step).toFixed(1)}" y="${base + 26}">${m.toUpperCase()}</text>`;
    prev = m;
  });
  const n = (v) => v.toLocaleString("en-US");
  const stat = (x, v, label) => `<text class="sv" x="${x}" y="232">${v}</text><text class="m" x="${x}" y="256">${label}</text>`;
  const updated = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${n(cal.totalContributions)} contributions in the last year">
<style>${fonts}
.k{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.14em;fill:${t.muted}}
.big{font-family:'Instrument Serif',Georgia,serif;font-size:84px;fill:${t.ink}}
.sub{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:24px;fill:${t.muted}}
.sv{font-family:'Instrument Serif',Georgia,serif;font-size:30px;fill:${t.ink}}
.m{font-family:'Geist Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;fill:${t.muted}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.line}"/>
<text class="k" x="50" y="58">THE LAST 12 MONTHS</text>
<text class="big" x="46" y="138">${n(cal.totalContributions)}</text>
<text class="sub" x="50" y="170">contributions, mostly private work</text>
${stat(50, n(active), "ACTIVE DAYS")}${stat(190, n(best), "LONGEST STREAK")}${stat(350, n(cur), "CURRENT")}
<line x1="${x0}" y1="${base + 0.5}" x2="${x1}" y2="${base + 0.5}" stroke="${t.line}"/>
${bars}
${months}
<text class="m" x="${x1}" y="258" text-anchor="end">UPDATED ${updated.toUpperCase()}</text>
</svg>`;
}

// ---------- main ----------

await mkdir(OUT, { recursive: true });
const put = (name, svg) => writeFile(new URL(name, OUT), svg);

const data = await gh(`query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date}}}}}}`, { login: USER });
const headerFonts = await fontCSS(FONTS, PRINTABLE);
const total = data?.user.contributionsCollection.contributionCalendar.totalContributions;
for (const [name, t] of Object.entries(THEMES)) await put(`header-${name}.svg`, header(t, headerFonts, total));

if (data) {
  const cal = data.user.contributionsCollection.contributionCalendar;
  const fonts = await fontCSS(FONTS, "THE LAST 12 MONTHScontributions, mostly private work,ACTIVE DAYSLONGEST STREAKCURRENTUPDATED JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC");
  for (const [name, t] of Object.entries(THEMES)) await put(`activity-${name}.svg`, activity(t, fonts, cal));
} else {
  console.warn("GITHUB_TOKEN not set — skipped activity graph.");
}

// "Latest" line in the README: newest public release and most recently pushed public repo.
const repos = await gh(`{user(login:"${USER}"){repositories(first:10,privacy:PUBLIC,orderBy:{field:PUSHED_AT,direction:DESC}){nodes{name pushedAt latestRelease{tagName publishedAt url}}}}}`);
if (repos) {
  const nodes = repos.user.repositories.nodes.filter((r) => r.name !== USER);
  const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const rel = nodes.filter((r) => r.latestRelease).sort((a, b) => b.latestRelease.publishedAt.localeCompare(a.latestRelease.publishedAt))[0];
  const parts = [];
  if (rel) parts.push(`released <a href="${rel.latestRelease.url}">${rel.name} ${rel.latestRelease.tagName}</a> ${day(rel.latestRelease.publishedAt)}`);
  if (nodes[0] && nodes[0].name !== rel?.name) parts.push(`last pushed to <a href="https://github.com/${USER}/${nodes[0].name}">${nodes[0].name}</a> ${day(nodes[0].pushedAt)}`);
  const readmeURL = new URL("../README.md", import.meta.url);
  const readme = await readFile(readmeURL, "utf8");
  const line = parts.length ? `<sub><samp>LATEST</samp> &nbsp; ${parts.join(" &nbsp;·&nbsp; ")}</sub>` : "";
  await writeFile(readmeURL, readme.replace(/(<!-- latest starts -->)[\s\S]*?(<!-- latest ends -->)/, `$1\n${line}\n$2`));
}

console.log("built");

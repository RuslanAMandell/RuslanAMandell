// Builds the profile's SVG assets (header, project cards, activity) in light + dark.
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

const PROJECTS = [
  {
    repo: "UnslopMyCode",
    kicker: "Claude Code plugin",
    title: "Unslop My Code",
    lines: ["Finds the production failures AI coding tools leave behind —", "secrets, RLS, IDOR, runaway cost, hallucinated deps — then", "fixes the safe ones."],
    meta: ["Python", "64 checks", "Security"],
  },
  {
    repo: "glasslist-app",
    kicker: "macOS 26 app",
    title: "GlassList",
    lines: ["An always-on-top to-do panel that floats over every window", "and Space, with on-device agents, a project board, calendar", "agenda and timers."],
    meta: ["Swift", "Apple silicon", "@release"],
  },
  {
    repo: "CMLib",
    kicker: "C library",
    title: "CMLib",
    lines: ["A lightweight machine learning library in C for education", "and embedded systems. Linear and logistic regression,", "no dependencies."],
    meta: ["C", "Embedded", "ML"],
  },
  {
    repo: "tinyargs",
    kicker: "Python package",
    title: "tinyargs",
    lines: ["An ultra-light argument parser for quick scripts. Grab", "flags and values in a few lines, with no boilerplate", "and no dependencies."],
    meta: ["Python", "CLI", "Zero deps"],
  },
];

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

function header(t, fonts) {
  const W = 1200, H = 340;
  // Faint dot field on the right, fading toward the text.
  let dots = "";
  for (let x = 640; x <= 1160; x += 18) {
    for (let y = 40; y <= 300; y += 18) {
      const d = Math.hypot(x - 1040, y - 170);
      if (d > 190) continue;
      const o = (1 - d / 190) * 0.9;
      dots += `<circle cx="${x}" cy="${y}" r="1.3" fill="${t.muted}" opacity="${o.toFixed(2)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ruslan Mandell — software engineer and founder building AI tools, apps and commerce">
<style>${fonts}
.mono{font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;letter-spacing:.14em;fill:${t.muted}}
.name{font-family:'Instrument Serif',Georgia,serif;font-size:92px;fill:${t.ink};letter-spacing:-.01em}
.tag{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:30px;fill:${t.muted}}
.caret{animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
.pulse{animation:pulse 3.2s ease-in-out infinite;transform-origin:1040px 170px}
@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.caret,.pulse{animation:none;opacity:1}}
</style>
<rect width="${W}" height="${H}" rx="14" fill="${t.bg}"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${t.line}"/>
<g>${dots}</g>
<circle class="pulse" cx="1040" cy="170" r="3.5" fill="${t.accent}"/>
<text class="mono" x="64" y="76">SOFTWARE ENGINEER · TORONTO</text>
<text class="name" x="60" y="170">Ruslan Mandell</text>
<text class="tag" x="64" y="218">Products built end to end — AI tools, apps &amp; commerce.</text>
<line x1="64" y1="258" x2="560" y2="258" stroke="${t.line}"/>
<text class="mono" x="64" y="290">ENGINEER  /  FOUNDER  /  SHIPPING SINCE 2021<tspan class="caret" fill="${t.accent}"> ▍</tspan></text>
</svg>`;
}

const HEADER_TEXT = "SOFTWARE ENGINEER · TORONTORuslan MandellProducts built end to end — AI tools, apps & commerce.ENGINEER / FOUNDER SHIPPING SINCE 2021▍";

// ---------- project cards ----------

function card(t, p, fonts, release) {
  const W = 580, H = 252;
  const meta = p.meta.map((m) => (m === "@release" ? release ?? "Latest" : m));
  let x = 32;
  const chips = meta.map((m, i) => {
    const w = m.length * 7.9 + 22;
    const el = `<rect x="${x}" y="196" width="${w}" height="26" rx="13" fill="none" stroke="${t.line}"/><text class="chip" x="${x + w / 2}" y="213.5" text-anchor="middle">${esc(m)}</text>`;
    x += w + 8;
    return el;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.title)} — ${esc(p.lines.join(" "))}">
<style>${fonts}
.k{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;letter-spacing:.14em;fill:${t.muted}}
.t{font-family:'Instrument Serif',Georgia,serif;font-size:36px;fill:${t.ink}}
.b{font-family:Geist,system-ui,sans-serif;font-size:16px;fill:${t.muted}}
.chip{font-family:'Geist Mono',ui-monospace,monospace;font-size:12px;fill:${t.ink}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.surface}" stroke="${t.line}"/>
<circle cx="37" cy="41" r="3.5" fill="${t.accent}"/>
<text class="k" x="50" y="45">${esc(p.kicker.toUpperCase())}</text>
<text class="k" x="${W - 32}" y="45" text-anchor="end">↗</text>
<text class="t" x="30" y="94">${esc(p.title)}</text>
${p.lines.map((l, i) => `<text class="b" x="32" y="${126 + i * 22}">${esc(l)}</text>`).join("\n")}
${chips}
</svg>`;
}

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

const release = await (async () => {
  try {
    const d = await gh(`{repository(owner:"${USER}",name:"glasslist-app"){latestRelease{tagName}}}`);
    return d?.repository?.latestRelease?.tagName ?? null;
  } catch { return null; }
})();

const headerFonts = await fontCSS(FONTS, HEADER_TEXT);
for (const [name, t] of Object.entries(THEMES)) await put(`header-${name}.svg`, header(t, headerFonts));

for (const p of PROJECTS) {
  const meta = p.meta.map((m) => (m === "@release" ? release ?? "Latest" : m));
  const fonts = await fontCSS(FONTS, p.kicker.toUpperCase() + p.title + p.lines.join("") + meta.join("") + "↗");
  for (const [name, t] of Object.entries(THEMES)) await put(`card-${p.repo.toLowerCase()}-${name}.svg`, card(t, p, fonts, release));
}

const data = await gh(`query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount date}}}}}}`, { login: USER });
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

console.log("built", release ? `(glasslist ${release})` : "");

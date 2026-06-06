import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const publicDir = join(root, "public");
const diagramsDir = join(publicDir, "assets", "diagrams");
const cli = join(root, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");

const htmlEntities = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'"
};

const decodeEntities = value => value
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return htmlEntities[entity.toLowerCase()] || match;
  });

const escapeAttr = value => value
  .replace(/&/g, "&amp;")
  .replace(/"/g, "&quot;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const readSvgMeta = file => {
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/);
  if (!viewBox) return { aspect: 1 };
  const parts = viewBox[1].split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some(value => !Number.isFinite(value)) || !parts[3]) return { aspect: 1 };
  return { aspect: parts[2] / parts[3] };
};

const polishSvg = file => {
  const pad = 32;
  let svg = readFileSync(file, "utf8");
  svg = svg.replace(/viewBox="([^"]+)"/, (match, value) => {
    const parts = value.split(/\s+/).map(Number);
    if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) return match;
    const next = [parts[0] - pad, parts[1] - pad, parts[2] + pad * 2, parts[3] + pad * 2];
    return `viewBox="${next.join(" ")}"`;
  });
  svg = svg.replace(/max-width:\s*([0-9.]+)px/, (match, value) => {
    const width = Number.parseFloat(value);
    return Number.isFinite(width) ? `max-width: ${width + pad * 2}px` : match;
  });
  svg = svg.replace("</style>", [
    "#my-svg foreignObject{overflow:visible;}",
    "#my-svg .label,#my-svg .nodeLabel,#my-svg .edgeLabel{overflow:visible;}",
    "#my-svg .nodeLabel,#my-svg .edgeLabel{line-height:1.28;}",
    "</style>"
  ].join(""));
  writeFileSync(file, svg);
  return readSvgMeta(file);
};

const classForAspect = aspect => {
  if (aspect < 0.78) return "diagram-portrait";
  if (aspect > 4.2) return "diagram-wide";
  return "diagram-standard";
};

const wrapLabelText = text => {
  if (text.length <= 18 && !text.includes(" / ")) return text;
  const parts = text.split(/\s*\/\s*/).filter(Boolean);
  if (parts.length > 1) {
    const lines = [];
    let current = "";
    for (const part of parts) {
      const next = current ? `${current} / ${part}` : part;
      if (next.length > 16 && current) {
        lines.push(current);
        current = part;
      } else {
        current = next;
      }
    }
    if (current) lines.push(current);
    return lines.join("<br/>");
  }
  return text.replace(/(.{1,16})(\s+|$)/g, "$1<br/>").replace(/<br\/>$/, "");
};

const normalizeDiagramSource = source => source
  .replace(/\|"([^"]{18,})"\|/g, (match, label) => `|"${wrapLabelText(label)}"|`)
  .replace(/<br\s*\/?>/gi, "<br/>");

const themePresets = {
  light: {
    primaryColor: "#fff9ee",
    primaryTextColor: "#17313d",
    primaryBorderColor: "#80685d",
    lineColor: "#8a7b6b",
    secondaryColor: "#fbf3e5",
    tertiaryColor: "#f6ecd9",
    edgeLabelBackground: "#fff9ee",
    clusterBkg: "#fbf3e5",
    clusterBorder: "#b9a587"
  },
  dark: {
    primaryColor: "#17272d",
    primaryTextColor: "#eaf4f3",
    primaryBorderColor: "#82d3d7",
    lineColor: "#8fa7a5",
    secondaryColor: "#1d333a",
    tertiaryColor: "#14262c",
    edgeLabelBackground: "#17272d",
    clusterBkg: "#14262c",
    clusterBorder: "#5b9095"
  }
};

const listHtml = dir => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listHtml(path);
    return entry.isFile() && /\.html$/i.test(entry.name) ? [path] : [];
  });
};

const render = (source, mode) => {
  const theme = themePresets[mode];
  const hash = createHash("sha1").update(`${mode}:${source}`).digest("hex").slice(0, 12);
  const fileName = `${hash}-${mode}.svg`;
  const output = join(diagramsDir, fileName);
  if (existsSync(output)) {
    const meta = readSvgMeta(output);
    return { url: `/assets/diagrams/${fileName}`, ...meta };
  }

  const temp = mkdtempSync(join(tmpdir(), "yoru-mermaid-"));
  const input = join(temp, "diagram.mmd");
  const config = join(temp, "config.json");
  const puppeteer = join(temp, "puppeteer.json");

  writeFileSync(input, source);
  writeFileSync(config, JSON.stringify({
    theme: "base",
    securityLevel: "loose",
    flowchart: {
      htmlLabels: true,
      curve: "basis",
      nodeSpacing: 58,
      rankSpacing: 64,
      padding: 18
    },
    sequence: {
      mirrorActors: false
    },
    themeVariables: {
      background: "transparent",
      primaryColor: theme.primaryColor,
      primaryTextColor: theme.primaryTextColor,
      primaryBorderColor: theme.primaryBorderColor,
      lineColor: theme.lineColor,
      secondaryColor: theme.secondaryColor,
      tertiaryColor: theme.tertiaryColor,
      edgeLabelBackground: theme.edgeLabelBackground,
      clusterBkg: theme.clusterBkg,
      clusterBorder: theme.clusterBorder,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px"
    }
  }));
  writeFileSync(puppeteer, JSON.stringify({
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }));

  try {
    execFileSync(process.execPath, [
      cli,
      "-i", input,
      "-o", output,
      "-c", config,
      "-p", puppeteer,
      "-b", "transparent",
      "-w", "2400",
      "-H", "1800"
    ], {
      cwd: root,
      stdio: "pipe"
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  const meta = polishSvg(output);
  return { url: `/assets/diagrams/${fileName}`, ...meta };
};

mkdirSync(diagramsDir, { recursive: true });

let rendered = 0;
const renderFigure = source => {
  const normalized = normalizeDiagramSource(source);
  const light = render(normalized, "light");
  const dark = render(normalized, "dark");
  rendered += 1;
  const aspectClass = classForAspect(light.aspect);
  return [
    `<figure class="diagram-card mermaid-static ${aspectClass}" data-diagram-light="${escapeAttr(light.url)}" data-diagram-dark="${escapeAttr(dark.url)}">`,
    `  <img class="diagram-image diagram-image-light" src="${escapeAttr(light.url)}" alt="Mermaid 结构图" loading="lazy">`,
    `  <img class="diagram-image diagram-image-dark" src="${escapeAttr(dark.url)}" alt="Mermaid 结构图" loading="lazy">`,
    `</figure>`
  ].join("\n");
};

const wrappedPattern = /<figure class="diagram-card is-fit"[^>]*>\s*<div class="diagram-viewport">\s*<pre class="mermaid">([\s\S]*?)<\/pre>\s*<\/div>\s*<\/figure>/g;
const pattern = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;

for (const file of listHtml(publicDir)) {
  const html = readFileSync(file, "utf8");
  let changed = false;
  const withoutWrappers = html.replace(wrappedPattern, (match, raw) => {
    const source = decodeEntities(raw).replace(/\u00a0/g, " ").trim();
    if (!source) return match;
    changed = true;
    return renderFigure(source);
  });
  const next = withoutWrappers.replace(pattern, (match, raw) => {
    const source = decodeEntities(raw).replace(/\u00a0/g, " ").trim();
    if (!source) return match;
    changed = true;
    return renderFigure(source);
  });
  if (changed) writeFileSync(file, next);
}

console.log(`render-diagrams: rendered ${rendered} diagram reference(s) in ${relative(root, diagramsDir)}`);

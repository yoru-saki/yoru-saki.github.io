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

const listHtml = dir => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listHtml(path);
    return entry.isFile() && /\.html$/i.test(entry.name) ? [path] : [];
  });
};

const render = source => {
  const hash = createHash("sha1").update(source).digest("hex").slice(0, 12);
  const fileName = `${hash}.svg`;
  const output = join(diagramsDir, fileName);
  if (existsSync(output)) return `/assets/diagrams/${fileName}`;

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
      curve: "basis"
    },
    sequence: {
      mirrorActors: false
    },
    themeVariables: {
      background: "transparent",
      primaryColor: "#fffaf2",
      primaryTextColor: "#0f2732",
      primaryBorderColor: "#0a7080",
      lineColor: "#8a7b6b",
      secondaryColor: "#eef7f5",
      tertiaryColor: "#f8f0df",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px"
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
      "-w", "1600"
    ], {
      cwd: root,
      stdio: "pipe"
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  return `/assets/diagrams/${fileName}`;
};

mkdirSync(diagramsDir, { recursive: true });

let rendered = 0;
const pattern = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;

for (const file of listHtml(publicDir)) {
  const html = readFileSync(file, "utf8");
  let changed = false;
  const next = html.replace(pattern, (match, raw) => {
    const source = decodeEntities(raw).replace(/\u00a0/g, " ").trim();
    if (!source) return match;
    const url = render(source);
    rendered += 1;
    changed = true;
    return [
      `<figure class="diagram-card mermaid-static" data-diagram-src="${escapeAttr(url)}">`,
      `  <img src="${escapeAttr(url)}" alt="Mermaid 结构图" loading="lazy">`,
      `</figure>`
    ].join("\n");
  });
  if (changed) writeFileSync(file, next);
}

console.log(`render-diagrams: rendered ${rendered} diagram reference(s) in ${relative(root, diagramsDir)}`);

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const sourceRoot = join(process.cwd(), "..", "site");
const output = join(process.cwd(), "source", "_posts");
const posts = [
  "2026/06/05/agent-platform-frontend-showcase/index.html",
  "2026/06/05/ai-agent-getting-started/index.html"
];

const between = (text, start, end) => {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return "";
  const bodyStart = startIndex + start.length;
  const endIndex = text.indexOf(end, bodyStart);
  return endIndex === -1 ? "" : text.slice(bodyStart, endIndex);
};

const matchAll = (text, pattern) => Array.from(text.matchAll(pattern)).map((item) => item[1]);

const yamlValue = (value) => JSON.stringify((value || "").replace(/\s+/g, " ").trim());

const extractArticleContent = (html) => {
  const marker = '<div class="e-content article-entry" itemprop="articleBody">';
  const start = html.indexOf(marker);
  if (start === -1) return "";
  let cursor = start + marker.length;
  let depth = 1;
  const tokenPattern = /<\/?div\b[^>]*>/gi;
  tokenPattern.lastIndex = cursor;
  let match;

  while ((match = tokenPattern.exec(html))) {
    const token = match[0];
    if (token.startsWith("</")) depth -= 1;
    else depth += 1;
    if (depth === 0) {
      return html.slice(cursor, match.index);
    }
  }

  return "";
};

mkdirSync(output, { recursive: true });

for (const relativePath of posts) {
  const html = readFileSync(join(sourceRoot, relativePath), "utf8");
  const title = between(html, '<meta property="og:title" content="', '">');
  const description = between(html, '<meta name="description" content="', '">');
  const published = between(html, '<meta property="article:published_time" content="', '">');
  const category = between(html, '<a class="article-category-link" href="', "</a>").split(">").pop();
  const tags = matchAll(html, /<meta property="article:tag" content="([^"]+)">/g);
  const content = extractArticleContent(html);
  const slug = relativePath.split("/").at(-2);
  const frontMatter = [
    "---",
    `title: ${yamlValue(title)}`,
    `date: ${published ? published.replace(".000Z", "+00:00") : "2026-06-05T00:00:00+00:00"}`,
    `description: ${yamlValue(description)}`,
    category ? `categories:\n  - ${yamlValue(category)}` : "",
    tags.length ? `tags:\n${tags.map((tag) => `  - ${yamlValue(tag)}`).join("\n")}` : "",
    "---",
    ""
  ].filter(Boolean).join("\n");

  writeFileSync(join(output, `${basename(slug)}.md`), `${frontMatter}${content.trim()}\n`, "utf8");
}

console.log(`migrated ${posts.length} posts`);

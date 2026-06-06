import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const postsDir = join(root, "source", "_posts");
const zone = "Asia/Shanghai";
const autoDatePattern = /^date:\s*(auto|upload|file)?\s*$/im;
const hasDatePattern = /^date:\s*(.+)\s*$/im;

const pad = value => String(value).padStart(2, "0");

const formatInZone = value => {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(value).reduce((memo, part) => {
    memo[part.type] = part.value;
    return memo;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

const listMarkdown = dir => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listMarkdown(path);
    return entry.isFile() && /\.md$/i.test(entry.name) ? [path] : [];
  });
};

const gitTimestamp = path => {
  const rel = relative(root, path).replace(/\\/g, "/");
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", "--", rel], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
    if (output) return new Date(output);
  } catch {}
  const stat = statSync(path);
  return stat.birthtimeMs ? stat.birthtime : stat.mtime;
};

let changed = 0;

for (const path of listMarkdown(postsDir)) {
  const input = readFileSync(path, "utf8");
  const match = input.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) continue;

  const frontMatter = match[1];
  const hasDate = hasDatePattern.test(frontMatter);
  const shouldAutoDate = !hasDate || autoDatePattern.test(frontMatter);
  if (!shouldAutoDate) continue;

  const date = formatInZone(gitTimestamp(path));
  let nextFrontMatter;
  if (hasDate) {
    nextFrontMatter = frontMatter.replace(autoDatePattern, `date: ${date}`);
  } else {
    const titleMatch = frontMatter.match(/^title:\s*.+$/im);
    if (titleMatch) {
      nextFrontMatter = frontMatter.replace(titleMatch[0], `${titleMatch[0]}\ndate: ${date}`);
    } else {
      nextFrontMatter = `date: ${date}\n${frontMatter}`;
    }
  }

  const output = input.replace(match[0], `---\n${nextFrontMatter}\n---`);
  if (output !== input) {
    writeFileSync(path, output);
    changed += 1;
  }
}

if (changed) {
  console.log(`prepare-post-dates: updated ${changed} post date(s)`);
} else {
  console.log("prepare-post-dates: no automatic dates to update");
}

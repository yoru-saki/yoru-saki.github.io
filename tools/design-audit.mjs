import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const css = readFileSync(join(root, "themes", "yoru-quiet", "source", "css", "style.css"), "utf8");
const layout = readFileSync(join(root, "themes", "yoru-quiet", "layout", "layout.ejs"), "utf8");

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const count = (pattern) => (css.match(pattern) || []).length;

assert(count(/:root\s*{/g) === 1, "CSS 应只有一套根级设计变量，避免末端反复覆盖。");
assert(
  count(/html\[data-theme="dark"\]\s*{/g) === 1,
  "暗色主题变量应集中声明一次，避免分散补丁式覆盖。"
);
assert(css.includes("--font-sans") && css.includes("--font-serif"), "需要声明清晰的高级字体系统变量。");
assert(css.includes("ui-serif") && css.includes("Noto Serif SC"), "标题字体栈应包含高质量中文衬线回退。");
assert(css.includes("@media (max-width: 760px)"), "需要有移动端断点。");
assert(css.includes("@media (prefers-reduced-motion: reduce)"), "需要尊重减少动态效果偏好。");
assert(css.includes(":focus-visible"), "需要明确键盘焦点样式。");
assert(css.includes("min-height: 44px"), "可点击控件需要满足移动端触控尺寸。");
assert(css.includes("color-scheme: light") && css.includes("color-scheme: dark"), "深浅主题需要分开声明 color-scheme。");
assert(css.includes("--paper-cut") && css.includes("clip-path"), "主题需要包含基于海马图气质的日系拼接纸片语言。");
assert(!css.includes("radial-gradient(circle at 8% 10%"), "旧的装饰性渐变层应被移除。");
assert(!css.includes("var(--paper)") && !css.includes("var(--washi-paper)"), "旧变量系统不应残留。");
assert(layout.includes("is-home") && layout.includes("__BLOG_POSTS__"), "主页结构和搜索数据应由 Hexo 主题生成。");

console.log("design-audit: ok");

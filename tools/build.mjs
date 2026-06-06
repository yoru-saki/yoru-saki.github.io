import Hexo from "hexo";
import { createRequire } from "node:module";

const hexo = new Hexo(process.cwd(), {});
hexo.env.init = true;
const require = createRequire(import.meta.url);
const plugins = [
  "hexo-renderer-ejs",
  "hexo-renderer-marked",
  "hexo-generator-index",
  "hexo-generator-archive",
  "hexo-generator-category",
  "hexo-generator-tag"
];

try {
  await hexo.init();
  for (const plugin of plugins) {
    await hexo.loadPlugin(require.resolve(plugin));
  }
  await hexo.call("clean");
  await hexo.call("generate", {});
  await hexo.exit();
} catch (error) {
  await hexo.exit(error);
  process.exitCode = 1;
}

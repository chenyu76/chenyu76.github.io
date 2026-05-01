import path from "path";

import {
  convertMarkdown,
  generateHtmlFile,
  readTemplateHTML,
} from "./convert2HTML.js";
import { __dirname, __filename } from "./toc.js";

const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
// 获取项目根目录，即脚本目录的上一级目录
const rootPath = path.dirname(__dirname);
// 生成测试页
generateHtmlFile(
  path.join(rootPath, "index.html"),
  templateHTML,
  "chenyu76的主页",
  "",
  `<h1>主页</h1>`,
  `${convertMarkdown(path.join(rootPath, "README.md")).html}<br> 
${convertMarkdown(path.join(rootPath, "test-pages", "equationtest.md")).html}
<br><hr><h2>小工具</h2>
${convertMarkdown(path.join(rootPath, "program", "readme.md")).html}
${convertMarkdown(path.join(rootPath, "excerpts", "nightfall.md")).html}
`,
  "",
  "",
);

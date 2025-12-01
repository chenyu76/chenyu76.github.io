import path from "path";

import {
  allMarkdown2Html,
  convertMarkdown,
  generateHtmlFile,
  readTemplateHTML,
} from "./convert2HTML.js";
import {syncRepositories} from "./syncRepositories.js";
import {__dirname, __filename, generateRecommend, tocGen} from "./toc.js";
import {gitRepositories} from "./webConfig.js";

const foldingFuncForTOC = `
<script>
function toggleNextNextVis(self) {
  var content = self.nextElementSibling.nextElementSibling;

  if (!content.classList.contains("show")) {
    // 开始显示内容，添加类名 'show' 以触发动画
    content.style.display = "inline-block";
    setTimeout(function () {
      content.classList.add("show");
    }, 10);
    self.textContent = "显示更少";
  } else {
    // 删除类名 'show' 并设置过渡动画
    content.classList.remove("show");
    setTimeout(function () {
      content.style.display = "none"; // 在动画结束后设置 display: none
    }, 310);
    self.textContent = "显示全部";
  }
}
</script>
`;

const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
// 获取项目根目录，即脚本目录的上一级目录
const rootPath = path.dirname(__dirname);
// 生成主页
generateHtmlFile(
    path.join(rootPath, "index.html"),
    templateHTML,
    "chenyu76的主页",
    "",
    `<h1>主页</h1>`,
    `${convertMarkdown(path.join(rootPath, "README.md")).html}<br> 
<br><hr><h2>小工具</h2>
${convertMarkdown(path.join(rootPath, "program", "readme.md")).html}
${convertMarkdown(path.join(rootPath, "excerpts", "nightfall.md")).html}
`,
    "",
    "",
);
// 生成404页面
generateHtmlFile(
    path.join(rootPath, "404.html"),
    templateHTML,
    "404 not found",
    "",
    "<h1>404 Not Found</h1>",
    "<p>你访问的页面不存在，可能是因为链接错误或者页面已被移动或删除。</p><br><img src=\"/img/404.svg\" />",
    "",
    "",
);

import path from "path";
import { generateRecommend, tocGen, __dirname, __filename } from "./toc.js";
import {
	readTemplateHTML,
	allMarkdown2Html,
	generateHtmlFile,
	convertMarkdown,
} from "./convert2HTML.js";

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

// 遍历文件夹，处理其中的 .md 文件,生成html文件
const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
const rootPath = path.dirname(__dirname);
// 生成makdown文件对应的html文件
const articles = allMarkdown2Html(rootPath, templateHTML);
// 文件生成完成后生成目录
generateHtmlFile(
	path.join(rootPath, "toc.html"),
	templateHTML,
	"文档索引",
	"",
	`<h1>文档索引</h1>`,
	tocGen(rootPath, articles),
	"",
	foldingFuncForTOC,
);
// 生成主页
generateHtmlFile(
	path.join(rootPath, "index.html"),
	templateHTML,
	"欢迎来到我的主页",
	"",
	`<h1>主页</h1>`,
	`${convertMarkdown(path.join(rootPath, "README.md")).html}<br> 
  ${generateRecommend(1, articles)}`,
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

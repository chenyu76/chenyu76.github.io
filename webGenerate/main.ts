import fs from "fs";
import path from "path";

import {
  allMarkdown2Html,
  convertMarkdown,
  generateHtmlFile,
  readTemplateHTML,
} from "./convert2HTML.js";
import { syncRepositories } from "./syncRepositories.js";
import { __dirname, __filename, tocGen } from "./toc.js";
import { generateRecommend } from "./generateRecommend.js";
import { gitRepositories } from "./webConfig.js";

const html = String.raw;

const tocStyle = html`
  <style>
    .hiddenContent {
      transition:
        opacity 0.3s ease,
        transform 0.3s ease;
      opacity: 0;
      display: none;
    }
    .hiddenContent.show {
      opacity: 1;
      display: inline-block;
    }
  </style>
`;
const foldingFuncForTOC = html`
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
const cardStyle = html`
  <style>
    /* 卡片整体容器 */
    .card {
      box-shadow: 0 0 1px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column; /* 让子元素上下排列 */
      font-family: sans-serif;
      width: auto;
      flex-grow: 1;
      /* 占据剩余空间 */
      max-width: var(--main-width);
      margin: 40px auto;
    }

    /* 上半部分：白色内容区 */
    .card-top {
      flex: 1; /* 占据剩余的所有垂直空间 */
      background-color: #ffffff; /* 白色背景 */
      padding: 40px;
      color: #333333;
    }

    /* 下半部分：灰色日期区 */
    .card-bottom {
      height: 50px; /* 固定底部高度 */
      background-color: #f7f7f9; /* 浅灰色背景 */
      border-top: 1px solid #eaeaea; /* 可选：加一条淡淡的分割线 */
      padding: 0 40px;
      display: flex;
      align-items: center; /* 垂直居中日期 */
      justify-content: flex-start;
      color: #888888; /* 日期文字使用较淡的颜色 */
      font-size: 14px;
    }
  </style>
`;

// 遍历文件夹，处理其中的 .md 文件,生成html文件
const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
// 获取项目根目录，即脚本目录的上一级目录
const rootPath = path.dirname(__dirname);
// 同步git仓库
await syncRepositories(rootPath, gitRepositories);
// 生成makdown文件对应的html文件
const articles = allMarkdown2Html(rootPath, templateHTML);
// 文件生成完成后生成目录
generateHtmlFile(
  path.join(rootPath, "toc.html"),
  templateHTML,
  "文档索引",
  tocStyle,
  html`<h1>文档索引</h1>`,
  tocGen(rootPath, articles),
  "",
  foldingFuncForTOC,
);
// 生成主页
generateHtmlFile(
  path.join(rootPath, "index.html"),
  templateHTML,
  "chenyu的主页",
  cardStyle,
  html`<h1>首页</h1>`,
  `${convertMarkdown(path.join(rootPath, "README.md")).html}<br> 
${generateRecommend(1, articles)}<h2>小工具</h2>
${convertMarkdown(path.join(rootPath, "program", "readme.md")).html}`,
  "",
  "",
);

// 生成 RSS 文件
fs.writeFileSync(
  path.join(rootPath, "rss.xml"),
  generateRecommend(2, articles),
);

// 生成404页面
generateHtmlFile(
  path.join(rootPath, "404.html"),
  templateHTML,
  "404 not found",
  "",
  html`<h1>404 Not Found</h1>`,
  html`<p>你访问的页面不存在，可能是因为链接错误或者页面已被移动或删除。</p>
    <br /><img src="/img/404.svg" />`,
  "",
  "",
);

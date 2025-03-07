import path from "path";
import fs from "fs";
import readline from "readline";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import markedKatex from "marked-katex-extension";
import recommend from "./recommend.js";
import { fileURLToPath } from "url";

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件所在的目录
const __dirname = path.dirname(__filename);

// 这些文件会在目录里显示
const clickableExtension = [".html"];
// 这些后缀的文件会在按钮链接中加上 #
const hashExtension = [".js"];
// 始终不显示的文件夹
const folderBlackList = ["node_modules", "webGenerate"];
// 文件路径含有这些的js文件将不会被显示
const jsFolderBlackList = ["webGenerate", "program", "img", "libs"];

// 创建文件目录树
function folderTree(currentPath, depth = 0, startPath = null, lineD = 0) {
  const table = [];
  const items = fs
    .readdirSync(currentPath)
    .filter((item) => {
      const fullPath = path.join(currentPath, item);
      const isDir = fs.statSync(fullPath).isDirectory();
      return (
        (isDir && !item.startsWith(".")) ||
        (!isDir && clickableExtension.some((ext) => item.endsWith(ext)))
      );
    })
    .filter((item) => {
      return !(
        path.extname(item) === ".js" &&
        jsFolderBlackList.some((item) => currentPath.includes(item))
      );
      // 排除掉 program 等 文件夹里的 js
    })
    .filter(() => {
      return !folderBlackList.some((item) => currentPath.includes(item));
    }); // 去掉 node_modules 等

  function createItemButton(item, relativePath) {
    // 文档的路径名
    const baseName = path.basename(item, path.extname(item));
    // 如果是 md 文件，尝试读取第一行作为标题
    const articlePath = path.join(currentPath, baseName + ".md");
    let articleName = undefined;
    if (fs.existsSync(articlePath)) {
      // TODO: 我其实只需要第一行，有没有可以不用全部读取的方法？
      // 读取文件内容
      const data = fs.readFileSync(articlePath, "utf8");  
      // 获取第一行
      const firstLine = data.split("\n")[0];
      if(firstLine.startsWith("# ")) {
        articleName = firstLine.substring(2);
      }
    }
    return (
      (hashExtension.some((ext) => item.endsWith(ext))
        ? `<a href="#`
        : `<a href="`) +
      `${relativePath}">${articleName === undefined ? baseName : articleName}</a><br>`
    );
  }

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    let prefix = "";
    let line = lineD;

    for (let i = 0; i < depth; i++) {
      prefix += line & 1 ? "│　　" : "　　　";
      line >>= 1;
    }

    const style = prefix + "│<br>\n" + prefix + (isLast ? "└──" : "├──");
    const fullPath = path.join(currentPath, item);
    const isDirectory = fs.statSync(fullPath).isDirectory();

    if (isDirectory) {
      const children = folderTree(
        fullPath,
        depth + 1,
        startPath || currentPath,
        (isLast ? 0 : 1 << depth) + lineD,
      );

      if (children.length > 0) {
        table.push(`${style}${item}<br>`);
        if (children.length > 10 && lineD === 0) {
          children.splice(
            7,
            0,
            `${prefix}│　　<a href="javascript:void(0);" style="font-size:80%;line-height:100%" onclick="toggleNextNextVis(this)">显示全部</a><br>
            <span class="hiddenContent">`,
          );
          children.push("</span>");
        }
        table.push(...children);
      }
    } else {
      const relativePath = path
        .relative(startPath || currentPath, fullPath)
        .split(path.sep)
        .join("/");
      table.push(style + createItemButton(item, relativePath));
    }
  });

  return table;
}

function generateRecommend() {
  const listItems = recommend.map((item) => {
    let dateStr;
    if (item.date > 10000000) {
      dateStr = new Date(
        String(item.date).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
      ).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } else if (item.date > 100000) {
      dateStr = new Date(
        String(item.date).replace(/(\d{4})(\d{2})/, "$1-$2"),
      ).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } else {
      dateStr = "----";
    }

    const linkText =
      item.info || path.basename(item.link, path.extname(item.link));
    return `<li><a href="/${item.link}">${linkText}</a> <small>(${dateStr})</small></li>`;
  });

  return `<ul>\n${listItems.join("\n")}\n</ul>`;
}

function randomArticleJsGen(jsPath, dirPath) {
  const content = fs.readFileSync(jsPath, "utf8");
  const startTag = "//begin";
  const endTag = "//end";

  const articles = [];
  const baseDir = path.dirname(jsPath);

  function walk(dir) {
    fs.readdirSync(dir).forEach((item) => {
      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        if (!item.startsWith(".")) walk(fullPath);
      } else if (item.endsWith(".md") && !item.startsWith(".")) {
        articles.push(`"#${dirPath}${item}"`);
      }
    });
  }

  walk(baseDir);

  const newContent = content.replace(
    /\/\/begin[\s\S]*?\/\/end/,
    `${startTag}\n${articles.join(",\n")}\n${endTag}`,
  );

  fs.writeFileSync(jsPath, newContent);
}

function tocGen(dir) {
  const tree = `<p style="text-indent:0;line-height:100%">/root<br>\n${folderTree(
    dir,
  ).join("\n")}</p>`;

  const recommendation = generateRecommend();

  return `
  <h2>文档索引</h2>
  ${tree}
  <h2>推荐内容</h2>
  ${recommendation}`;
}

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

function readTemplateHTML(inputPath) {
  try {
    const data = fs.readFileSync(inputPath, "utf8");
    return data;
  } catch (err) {
    console.error(`读取文件 ${inputPath} 失败：`, err);
    return null;
  }
}

function convertMarkdown(inputPath) {
  const marked = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    }),
  );

  // 启用 marked-katex-extension 自动处理数学公式
  const options = {
    throwOnError: false,
    nonStandard: true,
  };
  marked.use(markedKatex(options));

  // 读取 Markdown 文件
  const data = fs.readFileSync(inputPath, "utf8");

  //划分内容为 [标题, 正文, 脚注]
  const content = ((str) => {
    let firstLineEndIndex = str.indexOf("\n");
    let firstLine = str.substring(0, firstLineEndIndex).trim();

    // 检查第一行是否以 "# " 开头
    if (str.startsWith("# ")) {
      firstLine = str.substring(1, firstLineEndIndex).trim(); // 去掉#
      str = str.substring(firstLineEndIndex + 1);
    }

    // 从字符串末尾开始查找最后一个换行符
    let lastIndex = str.length - 1;
    while (lastIndex >= 0 && str[lastIndex] !== "\n") {
      lastIndex--;
    }
    // 提取最后一行
    const lastLine = str.substring(lastIndex + 1).trim();
    // 检查最后一行的长度是否是日期
    if (
      lastLine.length < 50 &&
      ((lastLine.includes("月") && lastLine.includes("日")) ||
        (lastLine.match(/\//g) || []).length === 2)
    ) {
      return [firstLine, str.substring(0, lastIndex).trim(), lastLine];
    }
    // 如果不满足条件，返回空
    return [firstLine, str, ""];
  })(data.trim());

  // 将 Markdown 转换为 HTML
  console.log(`${inputPath} -> markdown`);
  return {
    title: content[0],
    html: marked.parse(content[1]),
    footnote: content[2],
  };
}

function generateHtmlFile(
  outputPath,
  templateHTML,
  titleContent,
  headContent,
  headingContent,
  htmlContent,
  footnoteContent,
  extraBodyContent,
) {
  // 检查生成的 HTML 中是否存在代码块（标记通常为 <pre><code ...>）
  // 仅当存在代码块时引入 Highlight.js 样式
  if (/<pre><code\b/.test(htmlContent)) {
    headContent += `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css">`;

    /* `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
    `;
    extraBodyContent += "<script>hljs.highlightAll();</script>"; */
  }
  // 检查是否存在公式，marked-katex-extension 渲染后的公式标签中包含 "katex" 类
  // 仅当存在数学公式时引入 KaTeX 样式
  if (/class="katex"/.test(htmlContent)) {
    headContent += `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossorigin="anonymous">
    `;
  }

  // 拼接完整的 HTML 文档
  const fullHtml = templateHTML
    .replace("TITLE_PLACEHOLDER", titleContent)
    .replace("HEAD_PLACEHOLDER", headContent)
    .replace("HEADING_PLACEHOLDER", headingContent)
    .replace("CONTENT_PLACEHOLDER", htmlContent)
    .replace("FOOTNOTE_PLACEHOLDER", footnoteContent)
    .replace("EXTRA_BODY_PLACEHOLDER", extraBodyContent);

  // 写入输出 HTML 文件
  fs.writeFileSync(outputPath, fullHtml, "utf8");
  console.log(`  -> ${outputPath}`);
}
// 遍历文件夹，处理其中的 .md 文件,生成html文件
function traverseDirectory(dirPath) {
  // 模板文件

  // 读取目录内容
  let files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);

    // 获取文件或文件夹的状态
    let stats = fs.statSync(filePath);
    if (stats.isDirectory() && !file.startsWith(".")) {
      // 如果是文件夹且不以 . 开头，递归调用
      traverseDirectory(filePath);
    } else if (stats.isFile() && file.endsWith(".md")) {
      // 如果是 .md 文件，调用处理函数

      // 获取文件不包含扩展名的名称
      const fileNameWithoutExt = path.basename(
        filePath,
        path.extname(filePath),
      );
      // 获取文件相对于某个目录的路径
      const relativePath = path.dirname(path.relative(rootPath, filePath));
      // 将文件的后缀换成 .html 的完整路径
      const htmlFilePath = path.format({
        dir: path.dirname(filePath),
        name: path.basename(filePath, path.extname(filePath)),
        ext: ".html",
      });
      // 创建html文件
      const content = convertMarkdown(filePath);
      generateHtmlFile(
        htmlFilePath,
        templateHTML,
        content.title,
        "",
        `<h3>${relativePath}</h3><h1>${fileNameWithoutExt}</h1>`,
        content.html,
        content.footnote,
        "",
      );
    }
  });
}

const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
const rootPath = path.dirname(__dirname);
traverseDirectory(rootPath);
// 文件生成完成后生成目录
const tocContent = tocGen(rootPath);
generateHtmlFile(
  path.join(rootPath, "toc.html"),
  templateHTML,
  "文档索引",
  "",
  `<h1>文档索引</h1>`,
  tocContent,
  "",
  foldingFuncForTOC,
);
const recommendation = generateRecommend();
generateHtmlFile(
  path.join(rootPath, "index.html"),
  templateHTML,
  "欢迎来到我的主页",
  "",
  `<h1>主页</h1>`,
  `${convertMarkdown(path.join(rootPath, "README.md")).html}<br>
${recommendation}`,
  "",
  foldingFuncForTOC,
);

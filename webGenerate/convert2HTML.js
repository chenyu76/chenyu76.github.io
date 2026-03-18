// import readline from "readline";
import fs from "fs";
import hljs from "highlight.js";
import {Marked} from "marked";
import markedAlert from 'marked-alert'
import markedFootnote from 'marked-footnote'
import {markedHighlight} from "marked-highlight";
import markedKatex from "marked-katex-extension";
import path from "path";

// 引入翻译函数
import {tr} from "./toc.js";

// 设置 marked 的渲染器
const marked = new Marked(
    markedHighlight({
      emptyLangClass : "hljs",
      langPrefix : "hljs language-",
      highlight(code, lang, _info) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, {language}).value;
      },
    }),
);
// 启用 marked-katex-extension 自动处理数学公式
marked.use(markedKatex({
  throwOnError : false,
  nonStandard : true,
}));
// 启用 marked-alert 插件处理警告框
marked.use(markedAlert());
// 启用 marked-footnote 插件处理脚注
marked.use(markedFootnote());

export function readTemplateHTML(inputPath) {
  try {
    const data = fs.readFileSync(inputPath, "utf8");
    return data;
  } catch (err) {
    console.error(`读取文件 ${inputPath} 失败：`, err);
    return null;
  }
}

/**
 * 检测 Markdown 是否只包含一个可选标题和一个链接
 * @param {string} md - 输入的 Markdown 文本
 * @returns {string|null} - 如果匹配则返回链接，否则返回 null
 */
function getSingleLinkFromMarkdown(md) {
  const len = md.length;
  let i = 0;

  // 辅助函数：跳过水平空白符（空格/制表符/回车）
  function skipHorizontal() {
    while (i < len && (md[i] === ' ' || md[i] === '\t' || md[i] === '\r')) i++;
  }

  // 辅助函数：计算并跳过连续换行
  function consumeNewlines() {
    let count = 0;
    while (i < len) {
      if (md[i] === '\n') {
        count++;
        i++;
      } else if (md[i] === ' ' || md[i] === '\t' || md[i] === '\r') {
        i++; // 换行间的空格也视为间隔
      } else {
        break;
      }
    }
    return count;
  }

  // 处理可选标题
  skipHorizontal();
  if (md[i] === '#' && md[i + 1] === ' ') {
    i += 2;
    // 寻找标题行结束
    while (i < len && md[i] !== '\n') i++;
  }

  // 检查标题后的换行
  const nlAfterTitle = consumeNewlines();
  if (nlAfterTitle > 2) return null; // 超过两个换行，直接短路

  // 检测链接主体
  let link = null;
  skipHorizontal();

  if (md[i] === '[') {
    // 匹配 [alt](url)
    const endBracket = md.indexOf(']', i + 1);
    if (endBracket === -1 || md[endBracket + 1] !== '(') return null;
    const endParen = md.indexOf(')', endBracket + 2);
    if (endParen === -1) return null;
    link = md.substring(endBracket + 2, endParen);
    i = endParen + 1;
  } else if (md.substring(i, i + 4) === 'http') {
    // 匹配 http... (直到空格或换行)
    const start = i;
    while (i < len && md[i] !== ' ' && md[i] !== '\n' && md[i] !== '\r' && md[i] !== '\t') i++;
    link = md.substring(start, i);
  } else {
    // 既不是标题，也不是指定的链接格式，短路
    return null;
  }

  // 检查链接后的尾部内容
  if (len - i > 3) return null; // 链接后如果还有超过3个字符，短路

  return link;
}

export function convertMarkdown(inputPath) {
  // 读取 Markdown 文件
  const data = fs.readFileSync(inputPath, "utf8");

  // 检查这个文件是不是单独的一个链接，如果是的话，就可以直接跳转过去了
  const maybeLink = getSingleLinkFromMarkdown(data);
  if (maybeLink) {
    let firstLineEndIndex = data.indexOf("\n");
    let firstLine = data.substring(0, firstLineEndIndex).trim();
    // 检查第一行是否以 "# " 开头
    if (data.startsWith("# ")) {
      firstLine = data.substring(1, firstLineEndIndex).trim(); // 去掉#
    }
    return {title : firstLine, redirect : maybeLink};
  }

  // 划分内容为 [标题, 正文, 脚注]
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
    if (lastLine.length < 50 &&
        ((lastLine.includes("月") && lastLine.includes("日")) ||
         (lastLine.match(/\//g) || []).length === 2)) {
      return [ firstLine, str.substring(0, lastIndex).trim(), lastLine ];
    }
    // 如果不满足条件，返回空
    return [ firstLine, str, "" ];
  })(data.trim());

  // 生成目录
  const toc = [];
  const renderer = new marked.Renderer();
  function createSlug(str) {
    return str
        // 将汉字转换为 Unicode 编码（保留原汉字作为后备）
        .replace(/[\u4e00-\u9fa5]/g,
                 (char) =>
                     `u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
        // 处理其他字符
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5-]+/g, '-') // 替换非字母数字汉字为-
        .replace(/-+/g, '-')                   // 合并连续的-
        .replace(/^-+/, '')                    // 去除开头的-
        .replace(/-+$/, '');                   // 去除结尾的-
  }

  renderer.heading = function(c) {
    const id = `h${c.depth}-${createSlug(c.raw)}`;
    toc.push({depth : c.depth, text : c.text, id : id});
    return `<h${c.depth} id="${id}">${c.text}</h${c.depth}>`;
  };

  marked.setOptions({renderer : renderer});
  const html = marked.parse(content[1]);

  console.log(`${inputPath} -> markdown`);
  return {title : content[0], html : html, footnote : content[2], toc : toc};
}

export function generateHtmlFile(
    outputPath = "",       // 输出路径
    templateHTML = "",     // HTML 模板字符串
    titleContent = "",     // 标题内容
    headContent = "",      // <head> 额外内容
    headingContent = "",   // 文档标题内容
    htmlContent = "",      // 正文内容
    footnoteContent = "",  // 脚注内容
    extraBodyContent = "", // <body> 结尾额外内容
    tocContent = "",       // 目录内容
) {
  // 处理代码块，注入复制按钮或识别为 ASCII 表格
  const tableCharRegex = /[┌┐└┘─│]/g;
  //  检查是否存在代码块
  if (/<pre><code\b/.test(htmlContent)) {
    htmlContent = htmlContent.replace(
        /<pre>([\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?)<\/pre>/g,
        (_match, fullContent, codeInnerHtml) => {
          // 统计制表符出现的次数
          const matches = codeInnerHtml.match(tableCharRegex);
          const count = matches ? matches.length : 0;

          if (count >= 10) {
            // 情况 A: 认为是制表/示意图
            // 1. 添加类名 ascii-table 以便通过 CSS 控制样式
            // 2. 这种块不需要复制按钮
            return `<pre class="ascii-table" lang="en">${fullContent}</pre>`;
          } else {
            // 情况 B: 普通代码块
            // 注入复制按钮
            return `<pre>${
                fullContent}<button class="copy-btn" title="Copy">📋</button></pre>`;
          }
        });

    headContent += `<link rel="stylesheet" href="/styles-code.css">`;

    // 客户端脚本（仅针对有 copy-btn 的块）
    extraBodyContent += `
<script>
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pre = btn.parentElement;
      const code = pre.querySelector('code');
      try {
        await navigator.clipboard.writeText(code.innerText);
        btn.textContent = ' ✓ ';
        setTimeout(() => btn.textContent = '📋', 1500);
      } catch (err) { console.error(err); }
    });
  });
</script>
`;
  }

  // 检查是否存在公式，marked-katex-extension 渲染后的公式标签中包含 "katex" 类
  // 仅当存在数学公式时引入 KaTeX 样式
  if (/class="katex"/.test(htmlContent)) {
    headContent += `
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css" integrity="sha384-Pu5+C18nP5dwykLJOhd2U4Xen7rjScHN/qusop27hdd2drI+lL5KvX7YntvT8yew" crossorigin="anonymous">
        `;
  }

  // 将 <hr> 标签替换为指定的 div 结构
  // htmlContent = transformHrTags(htmlContent); 
  // 创建替换映射
  const replacements = {
    "TITLE_PLACEHOLDER" : titleContent,
    "HEAD_PLACEHOLDER" : headContent,
    "HEADING_PLACEHOLDER" : headingContent,
    "CONTENT_PLACEHOLDER" : htmlContent,
    "FOOTNOTE_PLACEHOLDER" : footnoteContent,
    "EXTRA_BODY_PLACEHOLDER" : extraBodyContent,
    "TOC_PLACEHOLDER" : tocContent
  };

  const regex = new RegExp(Object.keys(replacements).join("|"), "g");
  const fullHtml =
      templateHTML.replace(regex, (matched) => replacements[matched]);

  fs.writeFileSync(outputPath, fullHtml, "utf8");
  console.log(`  -> ${outputPath}`);
}

export function allMarkdown2Html(dir, templateHTML, rootPath = dir) {
  let articles = {};
  let traverseDirectory = (dirPath) => {
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

        // 获取文件相对于网站根目录的路径
        const relativePath = path.dirname(path.relative(rootPath, filePath));
        const relativePathTranslated =
            "/" + relativePath.split(path.sep).map(tr).join("/") + "/";
        // 将文件的后缀换成 .html 的完整路径
        const htmlFilePath = path.format({
          dir : path.dirname(filePath),
          name : path.basename(filePath, path.extname(filePath)),
          ext : ".html",
        });
        // 创建html文件
        const content = convertMarkdown(filePath);
        if (content.hasOwnProperty("redirect")) {
          // 如果 content 中有 redirect 属性，说明这是一个重定向页面
          generateHtmlFile(
              htmlFilePath, templateHTML, content.title, 
              `<meta http-equiv="refresh" content="3;url=${content.redirect}">`,
              `<h3>${relativePathTranslated}</h3><h1>Redirecting to ${content.title}</h1>`,
              `<p>Redirecting to <a href="${content.redirect}">${content.redirect}</a> in 3 seconds...</p>`,
              "", "", "");
        }
        else {
          const htmlContent = content.html;
          const tocContent = generateTOC(content.toc);
          generateHtmlFile(
              htmlFilePath, templateHTML, content.title, "",
              `<h3>${relativePathTranslated}</h3><h1>${content.title}</h1>`,
              htmlContent, content.footnote, "", tocContent);
        }
        // 记录已经有的文章的信息
        articles[path.join(
            relativePath,
            path.basename(filePath, path.extname(filePath)),
            )] = {
          title : content.title,
          footnote : content.footnote,
        };
      }
    });
  };
  traverseDirectory(dir);
  return articles;
}

/* 生成TOC的HTML
传入的tocItems是一个数组，每个元素包含id, text和depth属性
{
        depth: 标题级别（1-6，对应h1-h6）,
        text: 标题文本,
        id: 标题的锚点ID
}
*/
function generateTOC(tocItems) {
  if (tocItems.length < 3)
    return '';

  let html = '<div class="toc">\n<ul>\n';
  let lastLevel = 1;

  tocItems.forEach(item => {
    // 处理层级关系
    while (lastLevel < item.depth) {
      html += '<ul>\n';
      lastLevel++;
    }
    while (lastLevel > item.depth) {
      html += '</ul>\n';
      lastLevel--;
    }

    html += `<li><a href="#${item.id}">${item.text}</a></li>\n`;
  });

  // 关闭所有未闭合的ul标签
  while (lastLevel > 1) {
    html += '</ul>\n';
    lastLevel--;
  }

  html += '</ul>\n</div>';
  return html;
};

import path from "path";
// import readline from "readline";
import fs from "fs";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import markedAlert from 'marked-alert'
import markedFootnote from 'marked-footnote'
import hljs from "highlight.js";
import markedKatex from "marked-katex-extension";

// 设置 marked 的渲染器
const marked = new Marked(
	markedHighlight({
		emptyLangClass: "hljs",
		langPrefix: "hljs language-",
		highlight(code, lang, _info) {
			const language = hljs.getLanguage(lang) ? lang : "plaintext";
			return hljs.highlight(code, { language }).value;
		},
	}),
);
// 启用 marked-katex-extension 自动处理数学公式
marked.use(markedKatex({
	throwOnError: false,
	nonStandard: true,
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

export function convertMarkdown(inputPath) {
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


	console.log(`${inputPath} -> markdown`);
	return {
		title: content[0],
		html: marked.parse(content[1]), // 将 Markdown 转换为 HTML
		footnote: content[2],
	};
}

export function generateHtmlFile(
	outputPath, // 输出路径
	templateHTML, // HTML 模板字符串
	titleContent, // 标题内容
	headContent, // <head> 额外内容
	headingContent, // 文档标题内容
	htmlContent, // 正文内容
	footnoteContent, // 脚注内容
	extraBodyContent, // <body> 结尾额外内容
) {
	// 检查生成的 HTML 中是否存在代码块（标记通常为 <pre><code ...>）
	// 仅当存在代码块时引入 Highlight.js 样式
	if (/<pre><code\b/.test(htmlContent)) {
		headContent += `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css">`;
		// 给代码块添加复制按钮
		extraBodyContent += `
<script>
document.querySelectorAll('pre').forEach(pre => {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = '📋';
  
  // 添加到DOM
  pre.prepend(btn);

  // 绑定点击事件
  btn.addEventListener('click', async () => {
    try {
      const code = pre.querySelector('code').innerText;
      await navigator.clipboard.writeText(code);
      
      btn.textContent = ' ✓ ';
      setTimeout(() => btn.textContent = '📋', 1500);
    } catch (err) {
      btn.textContent = 'FAIL！';
      btn.style.color = '#dc3545';
    }
  });
});
</script>
`;
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
					`<h3>${relativePath}</h3><h1>${content.title}</h1>`,
					content.html,
					content.footnote,
					"",
				);
				// 记录已经有的文章的信息
				articles[
					path.join(
						relativePath,
						path.basename(filePath, path.extname(filePath)),
					)
				] = {
					title: content.title,
					footnote: content.footnote,
				};
			}
		});
	};
	traverseDirectory(dir);
	return articles;
}

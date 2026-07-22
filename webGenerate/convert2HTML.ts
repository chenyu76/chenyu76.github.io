import fs from "fs";
import hljs from "highlight.js";
import { Marked } from "marked";
import markedAlert from "marked-alert";
import markedFootnote from "marked-footnote";
import { markedHighlight } from "marked-highlight";
import markedKatex from "marked-katex-extension";
import path from "path";

import { translatePath, detectLanguage, UI } from "./language.js";
import type { Lang } from "./language.js";

const html = String.raw;

export interface TocItem {
  depth: number;
  text: string;
  id: string;
}

export interface ArticleInfo {
  title?: string;
  title_zh?: string;
  title_en?: string;
  footnote?: string;
  redirect?: string;
  lang: Lang | "both";
  url_zh?: string;
  url_en?: string;
  [key: string]: unknown;
}

export interface MdGroup {
  zh?: string;
  en?: string;
  unsuffixed?: string;
}

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
marked.use(
  markedKatex({
    throwOnError: false,
    nonStandard: true,
  }),
);
marked.use(markedAlert());
marked.use(markedFootnote());

export function readTemplateHTML(inputPath: string) {
  try {
    return fs.readFileSync(inputPath, "utf8");
  } catch (err) {
    console.error(`读取文件 ${inputPath} 失败：`, err);
    return null;
  }
}

function getSingleLinkFromMarkdown(md: string) {
  const len = md.length;
  let i = 0;

  function skipHorizontal() {
    while (i < len && (md[i] === " " || md[i] === "\t" || md[i] === "\r")) i++;
  }

  function consumeNewlines() {
    let count = 0;
    while (i < len) {
      if (md[i] === "\n") {
        count++;
        i++;
      } else if (md[i] === " " || md[i] === "\t" || md[i] === "\r") {
        i++;
      } else {
        break;
      }
    }
    return count;
  }

  skipHorizontal();
  if (md[i] === "#" && md[i + 1] === " ") {
    i += 2;
    while (i < len && md[i] !== "\n") i++;
  }

  const nlAfterTitle = consumeNewlines();
  if (nlAfterTitle > 2) return null;

  let link = null;
  skipHorizontal();

  if (md[i] === "[") {
    const endBracket = md.indexOf("]", i + 1);
    if (endBracket === -1 || md[endBracket + 1] !== "(") return null;
    const endParen = md.indexOf(")", endBracket + 2);
    if (endParen === -1) return null;
    link = md.substring(endBracket + 2, endParen);
    i = endParen + 1;
  } else if (md.substring(i, i + 4) === "http") {
    const start = i;
    while (
      i < len &&
      md[i] !== " " &&
      md[i] !== "\n" &&
      md[i] !== "\r" &&
      md[i] !== "\t"
    )
      i++;
    link = md.substring(start, i);
  } else {
    return null;
  }

  if (len - i > 3) return null;

  return link;
}

export function convertMarkdown(inputPath: string): {
  title: string;
  html: string;
  footnote: string;
  toc: TocItem[];
  redirect?: string;
} {
  const data = fs.readFileSync(inputPath, "utf8");

  const maybeLink = getSingleLinkFromMarkdown(data);
  if (maybeLink) {
    let firstLineEndIndex = data.indexOf("\n");
    let firstLine = data.substring(0, firstLineEndIndex).trim();
    if (data.startsWith("# ")) {
      firstLine = data.substring(1, firstLineEndIndex).trim();
    }
    return {
      title: firstLine,
      html: "",
      footnote: "",
      toc: [],
      redirect: maybeLink,
    };
  }

  const content = ((str) => {
    let firstLineEndIndex = str.indexOf("\n");
    let firstLine = str.substring(0, firstLineEndIndex).trim();

    if (str.startsWith("# ")) {
      firstLine = str.substring(1, firstLineEndIndex).trim();
      str = str.substring(firstLineEndIndex + 1);
    }

    let lastIndex = str.length - 1;
    while (lastIndex >= 0 && str[lastIndex] !== "\n") {
      lastIndex--;
    }
    const lastLine = str.substring(lastIndex + 1).trim();
    if (
      lastLine.length < 50 &&
      ((lastLine.includes("月") && lastLine.includes("日")) ||
        (lastLine.match(/\//g) || []).length >= 2)
    ) {
      let mainContent = str
        .substring(0, lastIndex)
        .trim()
        .replace(/(?:\n|^)\s*(?:[-_*]\s*){3,}$/, "")
        .trim();
      return [firstLine, mainContent, lastLine];
    }
    let mainContent = str.replace(/(?:\n|^)\s*(?:[-_*]\s*){3,}$/, "").trim();
    return [firstLine, mainContent, ""];
  })(data.trim());

  const toc: TocItem[] = [];
  const renderer = new marked.Renderer();
  function createSlug(str: string) {
    return str
      .replace(
        /[\u4e00-\u9fa5]/g,
        (char: string) =>
          `u${char.charCodeAt(0).toString(16).padStart(4, "0")}`,
      )
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }

  renderer.heading = function (c) {
    const id = `h${c.depth}-${createSlug(c.raw)}`;
    toc.push({ depth: c.depth, text: c.text, id: id });
    return `<h${c.depth} id="${id}">${c.text}</h${c.depth}>`;
  };

  marked.setOptions({ renderer: renderer });
  const htmlContent = marked.parse(content[1] || "") as string;

  console.log(`${inputPath} -> markdown`);
  return {
    title: content[0] || "",
    html: htmlContent,
    footnote: content[2] || "",
    toc: toc,
  };
}

function generateLangButtonHtml(
  pageType: "article" | "index" | "toc" | "redirect",
  altLangUrl?: string,
): string {
  if (pageType === "article" && altLangUrl) {
    return html`<a
      href="${altLangUrl}"
      class="lang-btn scroll-top-btn"
      data-title-zh="切换到中文"
      data-title-en="Switch to English"
      title=""
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="icon">
        <use href="#icon-language" />
      </svg>
    </a>`;
  }
  if (pageType === "article" && !altLangUrl) {
    return ``;
  }
  return langButtonDropdownHtml();
}

function langButtonDropdownHtml(): string {
  return html` <button
      class="lang-toggle scroll-top-btn fade-in"
      data-title-zh="语言"
      data-title-en="Language"
      title=""
      aria-haspopup="true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="icon">
        <use href="#icon-language" />
      </svg>
    </button>
    <div class="lang-dropdown">
      <div class="lang-options">
        <label class="lang-option">
          <input type="radio" value="auto" class="lang-radio" />
          <span>${UI.follow_system.zh} / ${UI.follow_system.en}</span>
        </label>
        <label class="lang-option">
          <input type="radio" value="zh" class="lang-radio" />
          <span>${UI.chinese.zh}</span>
        </label>
        <label class="lang-option">
          <input type="radio" value="en" class="lang-radio" />
          <span>${UI.english.en}</span>
        </label>
      </div>
      <label class="show-both-label">
        <input type="checkbox" class="lang-show-both" />
        <span
          class="show-both-text"
          data-text-zh="${UI.show_both_zh}"
          data-text-en="${UI.show_both_en}"
        ></span>
      </label>
    </div>`;
}

function generateRedirectHtml(
  outputPath: string,
  title: string,
  availableLangs: { url: string; lang: Lang }[],
): void {
  const isBilingual = availableLangs.length >= 2;

  const links = availableLangs
    .map((a) => html`<a href="${a.url}">${a.url}</a>`)
    .join(" / ");

  if (!isBilingual) {
    const targetUrl = availableLangs[0]?.url || "/index.html";
    const page = html`<!doctype html>
      <html lang="zh">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="refresh" content="0;url=${targetUrl}" />
          <title>${title}</title>
        </head>
        <body>
          <p>${UI.redirecting_to.en} ${links}</p>
        </body>
      </html>`;
    fs.writeFileSync(outputPath, page, "utf8");
    console.log(`  -> ${outputPath}`);
    return;
  }

  const urlsObj = availableLangs
    .map((a) => `${a.lang}: "${a.url}"`)
    .join(",\n");

  const page = html`<!doctype html>
    <html lang="zh">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="stylesheet" href="/styles.css" />
        <style>
          .redirect-box {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            background: var(--card-bg-color);
            padding: 40px;
            box-shadow: 0 0 1px var(--shadow);
            max-width: 500px;
          }
          .redirect-box h1 {
            margin: 0 0 1em;
          }
          .redirect-box a {
            color: var(--link-color);
          }
        </style>
        <script>
          (function () {
            var urls = { ${urlsObj} };
            var browserLang = (navigator.language || "").startsWith("zh")
              ? "zh"
              : "en";
            var target = urls[browserLang] || urls[Object.keys(urls)[0]];
            window.location.replace(target);
          })();
        </script>
      </head>
      <body>
        <div class="redirect-box">
          <h1>${title}</h1>
          <p>${UI.redirecting_to.zh} / ${UI.redirecting_to.en}</p>
          <p>${links}</p>
        </div>
      </body>
    </html>`;

  fs.writeFileSync(outputPath, page, "utf8");
  console.log(`  -> ${outputPath}`);
}

export function generateHtmlFile(
  outputPath = "",
  templateHTML: string | null = "",
  titleContent = "",
  headContent = "",
  headingContent = "",
  htmlContent = "",
  footnoteContent = "",
  extraBodyContent = "",
  tocContent = "",
  pageType: "article" | "index" | "toc" | "redirect" = "article",
  lang?: Lang,
  altLangUrl?: string,
) {
  if (/<pre><code\b/.test(htmlContent)) {
    const tableCharRegex = /[┌┐└┘─│]/g;
    htmlContent = htmlContent.replace(
      /<pre>([\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?)<\/pre>/g,
      (_match, fullContent, codeInnerHtml) => {
        const matches = codeInnerHtml.match(tableCharRegex);
        const count = matches ? matches.length : 0;
        if (count >= 10) {
          return html`<pre class="ascii-table" lang="en">${fullContent}</pre>`;
        } else {
          return html`<pre>${fullContent}<button class="copy-btn" title="Copy">📋</button></pre>`;
        }
      },
    );

    headContent += html`<link rel="stylesheet" href="/styles-code.css" />`;

    extraBodyContent += html`
      <script>
        document.querySelectorAll(".copy-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const pre = btn.parentElement;
            const code = pre.querySelector("code");
            try {
              await navigator.clipboard.writeText(code.innerText);
              btn.textContent = " ✓ ";
              setTimeout(() => (btn.textContent = "📋"), 1500);
            } catch (err) {
              console.error(err);
            }
          });
        });
      </script>
    `;
  }

  if (/class="katex"/.test(htmlContent)) {
    headContent += html`
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css"
        integrity="sha384-Pu5+C18nP5dwykLJOhd2U4Xen7rjScHN/qusop27hdd2drI+lL5KvX7YntvT8yew"
        crossorigin="anonymous"
      />
    `;
  }

  const langMeta = lang
    ? html`lang="${lang}" data-page-lang="${lang}"`
    : html`lang="zh"`;
  const langButtonHtml = generateLangButtonHtml(pageType, altLangUrl);

  const replacements: Record<string, string> = {
    TITLE_PLACEHOLDER: titleContent,
    HEAD_PLACEHOLDER: headContent,
    HEADING_PLACEHOLDER: headingContent,
    CONTENT_PLACEHOLDER: htmlContent,
    FOOTNOTE_PLACEHOLDER: footnoteContent,
    EXTRA_BODY_PLACEHOLDER: extraBodyContent,
    TOC_PLACEHOLDER: tocContent,
    LANG_META_PLACEHOLDER: langMeta,
    LANG_BUTTON_PLACEHOLDER: langButtonHtml,
  };

  const regex = new RegExp(Object.keys(replacements).join("|"), "g");
  const fullHtml = (templateHTML as string).replace(
    regex,
    (matched) => replacements[matched]!,
  );

  fs.writeFileSync(outputPath, fullHtml, "utf8");
  console.log(`  -> ${outputPath}`);
}

function groupMdFiles(dirPath: string): Map<string, MdGroup> {
  const groupMap = new Map<string, MdGroup>();
  let files: string[];
  try {
    files = fs.readdirSync(dirPath);
  } catch {
    return groupMap;
  }

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(dirPath, file);

    const zhMatch = file.match(/^(.+)-zh\.md$/);
    const enMatch = file.match(/^(.+)-en\.md$/);

    if (zhMatch) {
      const base = zhMatch[1]!;
      if (!groupMap.has(base)) groupMap.set(base, {});
      groupMap.get(base)!.zh = filePath;
    } else if (enMatch) {
      const base = enMatch[1]!;
      if (!groupMap.has(base)) groupMap.set(base, {});
      groupMap.get(base)!.en = filePath;
    } else {
      const base = file.replace(/\.md$/, "");
      if (!groupMap.has(base)) groupMap.set(base, {});
      groupMap.get(base)!.unsuffixed = filePath;
    }
  }

  return groupMap;
}

function processMdGroup(
  dirPath: string,
  base: string,
  sources: MdGroup,
  templateHTML: string,
  rootPath: string,
  articles: Record<string, ArticleInfo>,
): void {
  let zhSource: string | undefined = sources.zh;
  let enSource: string | undefined = sources.en;

  if (sources.unsuffixed) {
    if (!zhSource && !enSource) {
      const content = fs.readFileSync(sources.unsuffixed, "utf8");
      const detected = detectLanguage(content);
      if (detected === "zh") zhSource = sources.unsuffixed;
      else enSource = sources.unsuffixed;
    } else if (!zhSource && enSource) {
      zhSource = sources.unsuffixed;
    } else if (zhSource && !enSource) {
      enSource = sources.unsuffixed;
    }
  }

  if (!zhSource && !enSource) return;

  const relativeDir = path.relative(rootPath, dirPath);
  const relativeDirTranslatedZh = translatePath(relativeDir, "zh");
  const relativeDirTranslatedEn = translatePath(relativeDir, "en");

  let zhContent: ReturnType<typeof convertMarkdown> | null = null;
  let enContent: ReturnType<typeof convertMarkdown> | null = null;
  let zhArticleTitle = base;
  let enArticleTitle = base;

  if (zhSource) {
    zhContent = convertMarkdown(zhSource);
    zhArticleTitle = zhContent.title || base;
  }
  if (enSource) {
    enContent = convertMarkdown(enSource);
    enArticleTitle = enContent.title || base;
  }

  const zhHtmlPath = path.join(dirPath, `${base}-zh.html`);
  const enHtmlPath = path.join(dirPath, `${base}-en.html`);
  const unsuffixedPath = path.join(dirPath, `${base}.html`);

  if (zhContent && !zhContent.redirect) {
    const toc = generateTOC(zhContent.toc || []);
    generateHtmlFile(
      zhHtmlPath,
      templateHTML,
      zhContent.title,
      "",
      html`<h3>${relativeDirTranslatedZh}</h3>
        <h1>${zhContent.title}</h1>`,
      zhContent.html,
      zhContent.footnote,
      "",
      toc,
      "article",
      "zh",
      enSource ? path.relative(dirPath, enHtmlPath) : undefined,
    );
  } else if (zhContent?.redirect) {
    generateHtmlFile(
      zhHtmlPath,
      templateHTML,
      zhContent.title,
      html`<meta http-equiv="refresh" content="3;url=${zhContent.redirect}" />`,
      html`<h3>${relativeDirTranslatedZh}</h3>
        <h1>Redirecting to ${zhContent.title}</h1>`,
      html`<p>
        Redirecting to
        <a href="${zhContent.redirect}">${zhContent.redirect}</a> in 3
        seconds...
      </p>`,
      "",
      "",
      "",
      "article",
      "zh",
      enSource ? path.relative(dirPath, enHtmlPath) : undefined,
    );
  }

  if (enContent && !enContent.redirect) {
    const toc = generateTOC(enContent.toc || []);
    generateHtmlFile(
      enHtmlPath,
      templateHTML,
      enContent.title,
      "",
      html`<h3>${relativeDirTranslatedEn}</h3>
        <h1>${enContent.title}</h1>`,
      enContent.html,
      enContent.footnote,
      "",
      toc,
      "article",
      "en",
      zhSource ? path.relative(dirPath, zhHtmlPath) : undefined,
    );
  } else if (enContent?.redirect) {
    generateHtmlFile(
      enHtmlPath,
      templateHTML,
      enContent.title,
      html`<meta http-equiv="refresh" content="3;url=${enContent.redirect}" />`,
      html`<h3>${relativeDirTranslatedEn}</h3>
        <h1>Redirecting to ${enContent.title}</h1>`,
      html`<p>
        Redirecting to
        <a href="${enContent.redirect}">${enContent.redirect}</a> in 3
        seconds...
      </p>`,
      "",
      "",
      "",
      "article",
      "en",
      zhSource ? path.relative(dirPath, zhHtmlPath) : undefined,
    );
  }

  const zhUrl = "/" + path.posix.join(relativeDir, `${base}-zh.html`);
  const enUrl = "/" + path.posix.join(relativeDir, `${base}-en.html`);

  const availableLangs: { url: string; lang: Lang }[] = [];
  if (zhContent) availableLangs.push({ url: zhUrl, lang: "zh" });
  if (enContent) availableLangs.push({ url: enUrl, lang: "en" });
  generateRedirectHtml(unsuffixedPath, base, availableLangs);

  const isBilingual = !!(zhContent && enContent);
  const primaryContent = zhContent || enContent;

  const articleKey = path.posix.join(relativeDir, base);
  articles[articleKey] = {
    title: primaryContent?.title || base,
    title_zh: zhContent?.title || enContent?.title || base,
    title_en: enContent?.title || zhContent?.title || base,
    footnote: primaryContent?.footnote,
    lang: isBilingual ? "both" : zhContent ? "zh" : "en",
    url_zh: zhContent ? zhUrl : undefined,
    url_en: enContent ? enUrl : undefined,
  };
}

const DIR_BLACKLIST = new Set(["node_modules", "webGenerate", ".git"]);

export function allMarkdown2Html(
  dir: string,
  templateHTML: string | null,
  rootPath = dir,
  excludeDirs: string[] = [],
) {
  const articles: Record<string, ArticleInfo> = {};

  function shouldSkip(fullPath: string): boolean {
    const name = path.basename(fullPath);
    if (name.startsWith(".")) return true;
    if (DIR_BLACKLIST.has(name)) return true;
    const rel = path.relative(rootPath, fullPath);
    return excludeDirs.some((d) => rel === d || rel.startsWith(d + path.sep));
  }

  function traverseAndProcess(dirPath: string) {
    if (shouldSkip(dirPath)) return;

    const groupMap = groupMdFiles(dirPath);

    for (const [base, sources] of groupMap) {
      processMdGroup(dirPath, base, sources, templateHTML!, rootPath, articles);
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dirPath, entry.name);
        if (!shouldSkip(fullPath)) {
          traverseAndProcess(fullPath);
        }
      }
    }
  }

  traverseAndProcess(dir);
  return articles;
}

function generateTOC(tocItems: TocItem[]) {
  if (tocItems.length < 3) return "";

  let htmlContent = html`<div class="toc">
    <ul></ul>
  </div> `;
  let lastLevel = 1;

  tocItems.forEach((item: TocItem) => {
    while (lastLevel < item.depth) {
      htmlContent += "<ul>\n";
      lastLevel++;
    }
    while (lastLevel > item.depth) {
      htmlContent += "</ul>\n";
      lastLevel--;
    }
    htmlContent += `<li><a href="#${item.id}">${item.text}</a></li>\n`;
  });

  while (lastLevel > 1) {
    htmlContent += "</ul>\n";
    lastLevel--;
  }

  htmlContent += "</ul>\n</div>";
  return htmlContent;
}

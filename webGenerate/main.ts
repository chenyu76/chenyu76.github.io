import fs from "fs";
import path from "path";

import {
  allMarkdown2Html,
  convertMarkdown,
  generateHtmlFile,
  readTemplateHTML,
} from "./convert2HTML.js";
import { syncRepositories } from "./syncRepositories.js";
import { __dirname, tocGen } from "./toc.js";
import { generateRecommend } from "./generateRecommend.js";
import { gitRepositories, recommend } from "./webConfig.js";
import { detectLanguage, UI } from "./language.js";
import type { Lang } from "./language.js";

const html = String.raw;

const langJs = html`
  <script>
    const LANG_KEY = "lang";
    const SHOW_BOTH_KEY = "showBoth";

    function getLang() {
      const stored = localStorage.getItem(LANG_KEY);
      if (stored === "zh" || stored === "en") return stored;
      return "auto";
    }

    function getEffectiveLang() {
      const lang = getLang();
      if (lang === "auto") {
        return (
          navigator.languages
            ?.find((l) => l.startsWith("zh"))
            ?.startsWith("zh") ||
          navigator.language?.startsWith("zh")
        )
          ? "zh"
          : "en";
      }
      return lang;
    }

    function getShowBoth() {
      const stored = localStorage.getItem(SHOW_BOTH_KEY);
      if (stored === null) return true;
      return stored === "true";
    }

    function applyLanguage() {
      const mode = getLang();
      const elang = getEffectiveLang();
      const showBoth = getShowBoth();

      document.documentElement.lang = elang;

      document.querySelectorAll("[data-lang]").forEach((el) => {
        const itemLang = el.dataset.lang;
        if (itemLang === elang) {
          el.style.display = "block";
        } else if (showBoth && el.dataset.fallback === "true") {
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      });

      updateTitlesAndTexts(elang);
      updateNavLinks(elang);

      document.querySelectorAll(".lang-radio").forEach((r) => {
        r.checked = r.value === getLang();
      });

      document.querySelectorAll(".lang-show-both").forEach((cb) => {
        cb.disabled = false;
        cb.checked = showBoth;
      });

      const showBothSpans = document.querySelectorAll(".show-both-text");
      showBothSpans.forEach((span) => {
        span.textContent =
          elang === "zh" ? span.dataset.textZh : span.dataset.textEn;
      });

      const showBothLabels = document.querySelectorAll(".show-both-label");
      showBothLabels.forEach((label) => {
        label.style.display = "flex";
      });
    }

    function closeAllLangDropdowns() {
      document.querySelectorAll(".lang-dropdown").forEach((dd) => {
        dd.classList.remove("active");
      });
    }

    function toggleLangDropdown(e) {
      e.stopPropagation();
      const btn = e.currentTarget;
      const dropdown = btn.parentElement.querySelector(".lang-dropdown");
      if (!dropdown) return;

      const isActive = dropdown.classList.contains("active");
      closeAllLangDropdowns();
      if (!isActive) {
        const rect = btn.getBoundingClientRect();
        dropdown.style.left = Math.min(rect.right + 4, window.innerWidth - 240) + "px";
        dropdown.style.top = Math.min(rect.top, window.innerHeight - 160) + "px";
        dropdown.classList.add("active");
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      applyLanguage();

      document.querySelectorAll(".lang-toggle").forEach((btn) => {
        btn.addEventListener("click", toggleLangDropdown);
      });

      document.querySelectorAll(".lang-radio").forEach((radio) => {
        radio.addEventListener("change", (e) => {
          if (!e.target.checked) return;
          const val = e.target.value;
          document.querySelectorAll(".lang-radio").forEach((r) => {
            r.checked = r.value === val;
          });
          localStorage.setItem(LANG_KEY, val);
          applyLanguage();
        });
      });

      document.querySelectorAll(".lang-show-both").forEach((cb) => {
        cb.addEventListener("change", (e) => {
          const checked = e.target.checked;
          document.querySelectorAll(".lang-show-both").forEach((c) => {
            c.checked = checked;
          });
          localStorage.setItem(SHOW_BOTH_KEY, checked ? "true" : "false");
          applyLanguage();
        });
      });

      document.addEventListener("click", (e) => {
        if (!e.target.closest(".lang-toggle") && !e.target.closest(".lang-dropdown")) {
          closeAllLangDropdowns();
        }
      });
    });
  </script>
`;

function getMdContent(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  try {
    return convertMarkdown(filePath).html;
  } catch {
    return "";
  }
}

function getMdSource(
  dirPath: string,
  baseName: string,
  lang: Lang,
): string | null {
  const zhPath = path.join(dirPath, `${baseName}-zh.md`);
  const enPath = path.join(dirPath, `${baseName}-en.md`);
  const unsuffixedPath = path.join(dirPath, `${baseName}.md`);

  if (lang === "zh") {
    if (fs.existsSync(zhPath)) return zhPath;
    if (!fs.existsSync(enPath) && fs.existsSync(unsuffixedPath)) {
      const content = fs.readFileSync(unsuffixedPath, "utf8");
      if (detectLanguage(content) === "zh") return unsuffixedPath;
    }
    if (fs.existsSync(enPath) && fs.existsSync(unsuffixedPath)) {
      const content = fs.readFileSync(unsuffixedPath, "utf8");
      if (detectLanguage(content) === "zh") return unsuffixedPath;
    }
    return null;
  }

  if (fs.existsSync(enPath)) return enPath;
  if (!fs.existsSync(zhPath) && fs.existsSync(unsuffixedPath)) {
    const content = fs.readFileSync(unsuffixedPath, "utf8");
    if (detectLanguage(content) === "en") return unsuffixedPath;
  }
  if (fs.existsSync(zhPath) && fs.existsSync(unsuffixedPath)) {
    const content = fs.readFileSync(unsuffixedPath, "utf8");
    if (detectLanguage(content) === "en") return unsuffixedPath;
  }
  return null;
}

const templateHTML = readTemplateHTML(path.join(__dirname, "template.html"));
const rootPath = path.dirname(__dirname);

// await syncRepositories(rootPath, gitRepositories);

const articles = allMarkdown2Html(rootPath, templateHTML, rootPath);

const cardStyle = html`
  <style>
    .card {
      box-shadow: 0 0 1px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
      width: auto;
      flex-grow: 1;
      max-width: var(--main-width);
      margin: 40px auto;
    }
    .card-top {
      flex: 1;
      background-color: #ffffff;
      padding: 40px;
      color: #333333;
    }
    .card-bottom {
      height: 50px;
      background-color: #f7f7f9;
      border-top: 1px solid #eaeaea;
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      color: #888888;
      font-size: 14px;
    }
    :root[data-theme="dark"] .card-top {
      background-color: #252535;
      color: #cdd6f4;
    }
    :root[data-theme="dark"] .card-bottom {
      background-color: #1a1a28;
      border-top-color: #313244;
      color: #6c7086;
    }
  </style>
`;

const tocStyle = "";

const treeHtml = tocGen(rootPath, articles);

const readmeZhSource = getMdSource(rootPath, "README", "zh");
const readmeEnSource = getMdSource(rootPath, "README", "en");
const readmeZh = readmeZhSource ? getMdContent(readmeZhSource) : "";
const readmeEn = readmeEnSource ? getMdContent(readmeEnSource) : "";

const toolsZhSource = getMdSource(
  path.join(rootPath, "program"),
  "readme",
  "zh",
);
const toolsEnSource = getMdSource(
  path.join(rootPath, "program"),
  "readme",
  "en",
);
const toolsZh = toolsZhSource ? getMdContent(toolsZhSource) : "";
const toolsEn = toolsEnSource ? getMdContent(toolsEnSource) : "";

const recommendAll = recommend
  .flatMap((item) => {
    const zh = generateRecommend(1, articles, "zh", [item]);
    const en = generateRecommend(1, articles, "en", [item]);
    return [zh, en].filter((s) => s.trim() !== "");
  })
  .join("");

const indexBody = html`
  <div data-lang="zh">
    ${readmeZh}
  </div>
  <div data-lang="en">
    ${readmeEn}
  </div>
</div></div>
${recommendAll}
<div class="content-wrapper"><div class="content">
  <div data-lang="zh">
    <h2>${UI.tools_heading.zh}</h2>
    ${toolsZh}
  </div>
  <div data-lang="en">
    <h2>${UI.tools_heading.en}</h2>
    ${toolsEn}
  </div>
`;

generateHtmlFile(
  path.join(rootPath, "index.html"),
  templateHTML,
  "chenyu",
  cardStyle,
  "",
  indexBody,
  "",
  langJs,
  "",
  "index",
);

const tocExtraJs = html`
  ${langJs}
  <script>
    document.addEventListener("click", (e) => {
      const folder = e.target.closest(".tree-folder");
      if (folder) {
        const branch = folder.closest(".tree-branch");
        if (branch) {
          branch.classList.toggle("tree-collapsed");
        }
      }
    });
  </script>
`;

const tocBody = html`
  <div data-lang="zh">
    <h1>${UI.toc_heading_main.zh}</h1>
  </div>
  <div data-lang="en">
    <h1>${UI.toc_heading_main.en}</h1>
  </div>
  ${treeHtml}
`;

generateHtmlFile(
  path.join(rootPath, "toc.html"),
  templateHTML,
  UI.toc_heading_main.zh,
  tocStyle,
  "",
  tocBody,
  "",
  tocExtraJs,
  "",
  "toc",
);

fs.writeFileSync(
  path.join(rootPath, "rss.xml"),
  generateRecommend(2, articles),
);
fs.writeFileSync(
  path.join(rootPath, "rss-zh.xml"),
  generateRecommend(2, articles, "zh"),
);
fs.writeFileSync(
  path.join(rootPath, "rss-en.xml"),
  generateRecommend(2, articles, "en"),
);
fs.writeFileSync(
  path.join(rootPath, "rss-zh-en.xml"),
  generateRecommend(2, articles, "zh-first"),
);
fs.writeFileSync(
  path.join(rootPath, "rss-en-zh.xml"),
  generateRecommend(2, articles, "en-first"),
);

const notFoundZh = html`<p>${UI.page_not_found.zh}</p>
  <br /><img src="/img/404.svg" />`;
const notFoundEn = html`<p>${UI.page_not_found.en}</p>
  <br /><img src="/img/404.svg" />`;

const notFoundBody = html`
  <h1 data-lang="zh">404 Not Found</h1>
  <h1 data-lang="en">404 Not Found</h1>
  <div data-lang="zh">${notFoundZh}</div>
  <div data-lang="en">${notFoundEn}</div>
`;

generateHtmlFile(
  path.join(rootPath, "404.html"),
  templateHTML,
  "404 not found",
  "",
  "",
  notFoundBody,
  "",
  "",
  "",
  "index",
);

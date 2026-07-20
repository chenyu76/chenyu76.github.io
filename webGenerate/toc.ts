import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { type ArticlesMap } from "./generateRecommend.js";
import { tr } from "./language.js";

const html = String.raw;

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const clickableExtension = [".html"];
const hashExtension = [".js"];
const folderBlackList = ["node_modules", "webGenerate"];
const jsFolderBlackList = ["webGenerate", "program", "img", "libs"];

function folderTreeHtml(
  dir: string,
  articles: ArticlesMap,
): string {
  function visit(currentPath: string, relativePath: string): string {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return "";
    }

    const folderBlackListFull = folderBlackList.map((b) =>
      path.join(dir, b),
    );
    if (folderBlackListFull.some((b) => currentPath.startsWith(b))) return "";

    const subdirs: fs.Dirent[] = [];
    const files: { name: string; baseName: string }[] = [];

    for (const entry of entries) {
      const full = path.join(currentPath, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        subdirs.push(entry);
      } else if (
        entry.isFile() &&
        clickableExtension.some((ext) => entry.name.endsWith(ext))
      ) {
        if (
          entry.name.endsWith(".js") &&
          jsFolderBlackList.some((item) => currentPath.includes(item))
        )
          continue;
        const baseName = path.basename(entry.name, path.extname(entry.name));
        files.push({ name: entry.name, baseName });
      }
    }

    subdirs.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.baseName.localeCompare(b.baseName));

    if (subdirs.length === 0 && files.length === 0) return "";

    let result = "";

    for (const sub of subdirs) {
      const subPath = path.join(currentPath, sub.name);
      const subRel = path.posix.join(relativePath, sub.name);

      let subEntries: fs.Dirent[];
      try {
        subEntries = fs.readdirSync(subPath, { withFileTypes: true });
      } catch {
        continue;
      }
      const subSubdirs = subEntries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
      const subFiles = subEntries.filter((e) => e.isFile() && clickableExtension.some((ext) => e.name.endsWith(ext)));

      const folderZh = tr(sub.name, "zh");
      const folderEn = tr(sub.name, "en");

      if (subSubdirs.length === 0 && subFiles.length === 1) {
        const singleFile = subFiles[0]!;
        const singleBase = path.basename(singleFile.name, path.extname(singleFile.name));
        const isIndexOrReadme = singleBase === "index" || singleBase === "readme";
        const href = path.posix.join("/", subRel, singleFile.name);
        const articleKey = path.posix.join(subRel, singleBase);
        const article = articles[articleKey];

        if (article) {
          if (article.lang === "both" || article.lang === "zh") {
            const zhHref = article.url_zh || href;
            const zhTitle = article.title_zh || singleBase;
            const isFallback = article.lang === "zh" ? ' data-fallback="true"' : "";
            result += html`<li data-lang="zh"${isFallback}>
              <a href="${zhHref}">${isIndexOrReadme ? folderZh : `${folderZh} / ${zhTitle}`}</a>
            </li>`;
          }
          if (article.lang === "both" || article.lang === "en") {
            const enHref = article.url_en || href;
            const enTitle = article.title_en || singleBase;
            const isFallback = article.lang === "en" ? ' data-fallback="true"' : "";
            result += html`<li data-lang="en"${isFallback}>
              <a href="${enHref}">${isIndexOrReadme ? folderEn : `${folderEn} / ${enTitle}`}</a>
            </li>`;
          }
        } else {
          result += html`<li>
            <a href="${href}">${isIndexOrReadme ? folderZh : `${folderZh} / ${singleBase}`}</a>
          </li>`;
        }
        continue;
      }

      const children = visit(subPath, subRel);
      if (!children) continue;

      result += html`<li class="tree-branch tree-collapsed">
        <span class="tree-folder" data-lang="zh">${folderZh}</span>
        <span class="tree-folder" data-lang="en">${folderEn}</span>
        <ul>
          ${children}
        </ul>
      </li>`;
    }

    const fileGroups: Map<string, { name: string; baseName: string }[]> = new Map();
    for (const f of files) {
      const stem = f.baseName.replace(/-(zh|en)$/, "");
      let group = fileGroups.get(stem);
      if (!group) {
        group = [];
        fileGroups.set(stem, group);
      }
      group.push(f);
    }

    const processedStems = new Set<string>();

    for (const [stem, group] of fileGroups) {
      if (processedStems.has(stem)) continue;
      processedStems.add(stem);

      const articleKey = path.posix.join(relativePath, stem);
      const article = articles[articleKey];

      if (article) {
        if (article.lang === "both" || article.lang === "zh") {
          const zhFile = group.find((g) => g.baseName === stem || g.baseName === `${stem}-zh`);
          const zhHref = article.url_zh || (zhFile ? path.posix.join("/", relativePath, zhFile.name) : "");
          const zhTitle = article.title_zh || stem;
          const isFallback = article.lang === "zh" ? ' data-fallback="true"' : "";
          result += html`<li data-lang="zh"${isFallback}>
            <a href="${zhHref}">${zhTitle}</a>
          </li>`;
        }
        if (article.lang === "both" || article.lang === "en") {
          const enFile = group.find((g) => g.baseName === stem || g.baseName === `${stem}-en`);
          const enHref = article.url_en || (enFile ? path.posix.join("/", relativePath, enFile.name) : "");
          const enTitle = article.title_en || stem;
          const isFallback = article.lang === "en" ? ' data-fallback="true"' : "";
          result += html`<li data-lang="en"${isFallback}>
            <a href="${enHref}">${enTitle}</a>
          </li>`;
        }
      } else {
        for (const f of group) {
          const hrefBase = path.posix.join("/", relativePath, f.name);
          const isJsHash = hashExtension.some((ext) => f.name.endsWith(ext));
          result += html`<li>
            ${isJsHash ? `<a href="#">` : `<a href="${hrefBase}">`}${f.baseName}</a>
          </li>`;
        }
      }
    }

    return result;
  }

  const tree = visit(dir, "");

  return html`<ul class="file-tree">
    <li class="tree-root">
      <span class="tree-folder" data-lang="zh">/root</span>
      <span class="tree-folder" data-lang="en">/root</span>
      <ul>
        ${tree}
      </ul>
    </li>
  </ul>`;
}

export function tocGen(dir: string, articles: ArticlesMap): string {
  const tree = folderTreeHtml(dir, articles);
  return tree;
}

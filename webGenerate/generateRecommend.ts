import fs from "fs";
import path from "path";

import { recommend, type RecommendItem } from "./webConfig.js";
import { __dirname, __filename } from "./toc.js";
import type { Lang } from "./language.js";

const xml = String.raw;
const html = String.raw;

export type ArticlesMap = Record<
  string,
  {
    title?: string;
    title_zh?: string;
    title_en?: string;
    footnote?: string;
    url_zh?: string;
    url_en?: string;
    lang?: string;
    [key: string]: unknown;
  }
>;

export type FeedMode = Lang | "zh-first" | "en-first" | undefined;

function cardHasLang(
  item: RecommendItem,
  lang: Lang,
  articles: ArticlesMap,
): boolean {
  if (typeof item === "string") {
    return true;
  }
  if (lang === "zh") {
    if (item.title_zh || item.info_zh) return true;
    if (item.title && !item.title_en) return true;
    if (
      !item.title_zh &&
      !item.title_en &&
      !item.title &&
      !item.info_zh &&
      !item.info_en
    ) {
      const key = item.link
        .replace(/\.html$/, "")
        .replace(/\.md$/, "")
        .replace(/^\//, "");
      const article = articles[key];
      if (!article) return false;
      return article.lang === "zh" || article.lang === "both";
    }
    return false;
  }
  if (lang === "en") {
    if (item.title_en || item.info_en) return true;
    if (item.title && !item.title_zh) return true;
    if (
      !item.title_zh &&
      !item.title_en &&
      !item.title &&
      !item.info_zh &&
      !item.info_en
    ) {
      const key = item.link
        .replace(/\.html$/, "")
        .replace(/\.md$/, "")
        .replace(/^\//, "");
      const article = articles[key];
      if (!article) return false;
      return article.lang === "en" || article.lang === "both";
    }
    return false;
  }
  return false;
}

function getCardTitle(
  item: RecommendItem,
  lang: Lang,
  articles: ArticlesMap,
): string {
  if (typeof item === "string") return item;
  const link = item.link;
  const key = link
    .replace(/\.html$/, "")
    .replace(/\.md$/, "")
    .replace(/^\//, "");
  const article = articles[key];

  if (lang === "zh") {
    return (
      item.title_zh || item.title || article?.title_zh || article?.title || link
    );
  }
  if (lang === "en") {
    return (
      item.title_en || item.title || article?.title_en || article?.title || link
    );
  }
  return item.title || article?.title || link;
}

function getCardInfo(item: RecommendItem, lang: Lang): string {
  if (typeof item === "string") return "";
  if (lang === "zh") return item.info_zh || item.info || "";
  if (lang === "en") return item.info_en || item.info || "";
  return item.info || "";
}

function getLangVersionUrl(
  link: string,
  lang: Lang,
  articles: ArticlesMap,
): string {
  if (link.startsWith("http")) return link;
  const ext = path.extname(link);
  if (ext === ".pdf" || ext === ".xml") return link;
  const base = link
    .replace(/\.html$/, "")
    .replace(/\.md$/, "")
    .replace(/^\//, "");
  const article = articles[base];
  if (lang === "zh" && article?.url_zh) return article.url_zh;
  if (lang === "en" && article?.url_en) return article.url_en;
  if (article?.url_zh) return article.url_zh;
  if (article?.url_en) return article.url_en;
  return `/` + base + `.html`;
}

function getDateString(
  itemDate: unknown,
  useUTC: boolean = false,
  lang: Lang = "zh",
): string {
  if (itemDate === undefined) return "----";
  let date: string | number;
  const dateLang = lang === "zh" ? "zh-CN" : "en-US";
  const dateFormatDM: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
  };
  const dateFormatDMY: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  };

  const formatDate = (d: Date, options: Intl.DateTimeFormatOptions) => {
    if (useUTC) return d.toUTCString();
    return d.toLocaleDateString(dateLang, options);
  };

  if (typeof itemDate === "number") {
    if (itemDate > 10000000) {
      date = formatDate(
        new Date(String(itemDate).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")),
        dateFormatDMY,
      );
    } else if (itemDate > 100000) {
      date = formatDate(
        new Date(String(itemDate).replace(/(\d{4})(\d{2})/, "$1-$2")),
        dateFormatDM,
      );
    } else {
      date = "----";
    }
  } else if (typeof itemDate === "string" && itemDate) {
    const cleaned = itemDate.replace(/日.*$/, "").replace(/[年月]/g, "/");
    date = formatDate(new Date(cleaned), dateFormatDMY);
    if (isNaN(new Date(cleaned).getTime())) {
      date = formatDate(
        new Date(itemDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")),
        dateFormatDMY,
      );
    }
  } else {
    date = "----";
  }
  return String(date);
}

function resolveEffectiveLang(mode: FeedMode): Lang {
  if (mode === "zh" || mode === "zh-first") return "zh";
  return "en";
}

function itemPriority(item: RecommendItem, mode: FeedMode): number {
  if (mode === "zh-first" || mode === "zh") {
    if (typeof item !== "string" && item.title_zh) return 0;
    if (typeof item !== "string" && item.title_en) return 1;
    return 0;
  }
  if (mode === "en-first" || mode === "en") {
    if (typeof item !== "string" && item.title_en) return 0;
    if (typeof item !== "string" && item.title_zh) return 1;
    return 0;
  }
  return 0;
}

function getRssTitle(
  item: RecommendItem,
  mode: FeedMode,
  articles: ArticlesMap,
): string {
  if (typeof item === "string") return item;
  const link = item.link;
  const key = link
    .replace(/\.html$/, "")
    .replace(/\.md$/, "")
    .replace(/^\//, "");
  const article = articles[key];
  const zh = item.title_zh || item.title || article?.title_zh || article?.title;
  const en = item.title_en || item.title || article?.title_en || article?.title;

  if (mode === "zh" || mode === "zh-first") {
    if (zh && en && zh !== en) return `${zh} / ${en}`;
    return zh || en || item.link;
  }
  if (mode === "en" || mode === "en-first") {
    if (en && zh && en !== zh) return `${en} / ${zh}`;
    return en || zh || item.link;
  }
  if (zh && en && zh !== en) return `${zh} / ${en}`;
  return zh || en || item.link;
}

function getRssInfo(
  item: RecommendItem,
  mode: FeedMode,
): string {
  if (typeof item === "string") return "";
  const effectiveLang = resolveEffectiveLang(mode);

  if (mode === "zh-first" || mode === "en-first") {
    const primary = getCardInfo(item, effectiveLang);
    const otherLang: Lang = effectiveLang === "zh" ? "en" : "zh";
    const secondary = getCardInfo(item, otherLang);
    if (primary && secondary && primary !== secondary) {
      return `${primary}\n\n${secondary}`;
    }
    return primary || secondary;
  }
  return getCardInfo(item, effectiveLang);
}

export function generateRecommend(
  type = 0,
  articles: ArticlesMap = {},
  mode?: FeedMode,
  source?: RecommendItem[],
): string {
  const rootPath = path.dirname(__dirname);

  const effectiveLang = mode ? resolveEffectiveLang(mode) : "zh";
  const filterLang =
    mode === "zh" || mode === "en" ? (mode as Lang) : undefined;

  let items = source || recommend;

  for (const item of items) {
    const linkRaw = typeof item === "string" ? item : item.link;
    if (!linkRaw.startsWith("http")) {
      const base = linkRaw
        .replace(/\.html$/, "")
        .replace(/\.md$/, "")
        .replace(/^\//, "");
      const article = articles[base];
      const resolvedUrl = !article
        ? linkRaw
        : linkRaw.endsWith(".html")
          ? article.url_zh || linkRaw
          : linkRaw;
      const filePath = path.join(
        rootPath,
        resolvedUrl.startsWith("/")
          ? resolvedUrl.replace(/^\//, "")
          : resolvedUrl,
      );
      if (!fs.existsSync(filePath) && !article) {
        if (process.env.SKIP_SYNC) {
          console.warn(
            `[WARNING] Recommend item "${linkRaw}" has no generated file.`,
          );
        } else {
          console.error(
            `[ERROR] Recommend item "${linkRaw}" has no generated file.`,
          );
        }
      }
    }
  }

  if (filterLang) {
    items = items.filter((item) => cardHasLang(item, filterLang, articles));
  }

  if (mode === "zh-first" || mode === "en-first") {
    items = [...items].sort(
      (a, b) => itemPriority(a, mode!) - itemPriority(b, mode!),
    );
  }

  const listItems = items.map((item) => {
    const linkRaw = typeof item === "string" ? item : item.link;

    const relativePathWithoutExt = linkRaw
      .replace(/\.html$/, "")
      .replace(/\.md$/, "")
      .replace(/^\//, "");

    let itemDate: unknown =
      typeof item !== "string" && "date" in item
        ? item.date
        : !linkRaw.startsWith("http") && relativePathWithoutExt in articles
          ? articles[relativePathWithoutExt]?.footnote
          : undefined;
    const date = getDateString(itemDate, type === 2, effectiveLang);

    const langUrl = getLangVersionUrl(linkRaw, effectiveLang, articles);

    const title = getCardTitle(item, effectiveLang, articles);

    let info = getCardInfo(item, effectiveLang);
    if (!info && !linkRaw.startsWith("http")) {
      const infoFilePath = langUrl.startsWith("/")
        ? path.join(rootPath, langUrl.replace(/^\//, ""))
        : path.join(rootPath, linkRaw);
      if (fs.existsSync(infoFilePath)) {
        const content = fs.readFileSync(infoFilePath, "utf-8");
        if (infoFilePath.endsWith(".html")) {
          const match = content.match(/<p>(.*?)<\/p>/i);
          if (match && match[1]) info = match[1];
        } else if (infoFilePath.endsWith(".md")) {
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
              info = trimmed;
              break;
            }
          }
        }
      }
    }

    const isFallback =
      effectiveLang === "zh"
        ? !cardHasLang(item, "en", articles)
        : !cardHasLang(item, "zh", articles);
    const fallbackAttr = isFallback ? ' data-fallback="true"' : "";

    switch (type) {
      case 0:
        return html`<li>
          <a href="${langUrl}">${title}</a> <small>(${date})</small>
        </li>`;
      case 1:
        return html`
          <div
            class="card content"
            data-lang="${effectiveLang}"
            ${fallbackAttr}
          >
            <div class="card-top">
              <h2><a href="${langUrl}">${title}</a></h2>
              <p>${info}</p>
            </div>
            <div class="card-bottom">${date}</div>
          </div>
        `;
      case 2: {
        const rssItemTitle = getRssTitle(item, mode, articles);
        const rssItemInfo =
          type === 2 ? getRssInfo(item, mode) : info;
        const rawLink = linkRaw.startsWith("https")
          ? linkRaw
          : `https://chenyu76.github.io/${linkRaw.replace(/^\//, "")}`;
        return xml`<item>
            <title>${rssItemTitle}</title>
            <link>${rawLink}</link>
            <description><![CDATA[${rssItemInfo}]]></description>
            <pubDate>${date}</pubDate>
            <guid>${rawLink}</guid>
          </item>`;
      }
      default:
        return "";
    }
  });

  const rssChannelTitle = !mode
    ? "Chen Yu's Website"
    : mode === "zh"
      ? "Chen Yu's Website (Chinese)"
      : mode === "en"
        ? "Chen Yu's Website (English)"
        : mode === "zh-first"
          ? "Chen Yu's Website (中文 / English)"
          : "Chen Yu's Website (English / 中文)";
  const rssChannelDesc = !mode
    ? "Welcome!"
    : mode === "zh"
      ? "Chinese articles"
      : mode === "en"
        ? "English articles"
        : mode === "zh-first"
          ? "Chinese first"
          : "English first";

  const wrap: string[][] = [
    ["<ul>", "</ul>"],
    ["", ""],
    [
      `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
      <channel>
      <title>${rssChannelTitle}</title>
      <description>${rssChannelDesc}</description>`,
      `</channel>
      </rss>`,
    ],
  ];

  return `${wrap[type]![0]}\n${listItems.join("\n")}\n${wrap[type]![1]}`;
}

import fs from "fs";
import path from "path";
import { recommend } from "./webConfig.js";
const xml = String.raw;
const html = String.raw;

export type ArticlesMap = Record<
  string,
  { title: string; footnote?: string; [key: string]: unknown }
>;

// 生成首页的推荐
// type: 0. 列表
//       1. 首页的卡片
//       2. rss xml
export function generateRecommend(type = 0, articles: ArticlesMap = {}) {
  const rootPath = path.dirname(__dirname);
  const listItems = recommend.map((item) => {
    const relativePathWithoutExt = item.link
      .replace(/\.html$/, "")
      .replace(/\.md$/, "")
      .replace(/^\//, "");
    let itemDate: string | number | undefined =
      "date" in item
        ? item.date
        : !item.link.startsWith("http") && relativePathWithoutExt in articles
          ? // 如果没有date信息，尝试使用 articles 信息的 footnote
            articles[relativePathWithoutExt]?.footnote
          : undefined;
    let date = getDateString(itemDate, type == 2);
    const title =
      "title" in item
        ? item.title
        : relativePathWithoutExt in articles
          ? articles[relativePathWithoutExt]?.title
          : path.basename(item.link, path.extname(item.link));
    const link = encodeURI(
      item.link.startsWith("/") || item.link.startsWith("https")
        ? item.link
        : "/" + item.link,
    );
    let info = item.info || "";
    // 如果没有info信息，从指向的文件中找到第一个自然段
    if (!info && !item.link.startsWith("http")) {
      const filePath = path.join(rootPath, item.link);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        if (item.link.endsWith(".html")) {
          const match = content.match(/<p>(.*?)<\/p>/i);
          if (match && match[1]) info = match[1];
        } else if (item.link.endsWith(".md")) {
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

    switch (type) {
      case 0:
        return html`<li>
          <a href="${link}">${title}</a> <small>(${date})</small>
        </li>`;
      case 1:
        return html`
          <div class="card content">
            <div class="card-top">
              <h2><a href="${link}">${title}</a></h2>
              <p>${info}</p>
            </div>

            <div class="card-bottom">${date}</div>
          </div>
        `;
      case 2:
        return xml`
          <item>
            <title>${title}</title>
            <link>${link}</link>
            <description><![CDATA[${info}]]></description>
            <pubDate>${date}</pubDate>
            <guid>${link}</guid>
          </item>
        `;
    }
  });

  let wrap: string[][] = [
    ["<ul>", "</ul>"],
    ["</div></div>", '<div class="content-wrapper"><div class="content">'],
    [
      `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0">
      <channel>
      <title>Chen Yu's Website</title>
      <description>Welcome!</description>`,
      `</channel>
      </rss>`,
    ],
  ];

  return `${wrap[type]![0]}\n${listItems.join("\n")}\n${wrap[type]![1]}`;
}

// 通过我的各种启发式规则得到一个规整的日期字符串
function getDateString(itemDate: any, useUTC: boolean = false): string {
  if (itemDate === undefined) return "----";
  let date: any;
  let dateLang: string = "zh-CN";
  let dateFormatDM: any = {
    month: "long",
    year: "numeric",
  };
  let dateFormatDMY: any = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  };

  const formatDate = (d: Date, options: any) => {
    if (useUTC) return d.toUTCString();
    return d.toLocaleDateString(dateLang, options);
  };

  if (typeof itemDate !== "number") {
    if (itemDate) {
      // 简单处理中文日期：去掉“日”后面的，换年月日为/
      itemDate = itemDate.replace(/日.*$/, "").replace(/[年月]/g, "/");
      date = formatDate(new Date(itemDate), dateFormatDMY);
      // fallback
      if (isNaN(date) || date === "Invalid Date")
        date = formatDate(
          new Date(itemDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")),
          dateFormatDMY,
        );
    } else {
      date = "----";
    }
  } else {
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
  }
  return date;
}

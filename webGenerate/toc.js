import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";

import recommend from "./recommend.js";

// 获取当前文件的路径
export const __filename = fileURLToPath(import.meta.url);
// 获取当前文件所在的目录
export const __dirname = path.dirname(__filename);

// 这些文件会在目录里显示
const clickableExtension = [ ".html" ];
// 这些后缀的文件会在按钮链接中加上 #
const hashExtension = [ ".js" ];
// 始终不显示的文件夹
const folderBlackList = [ "node_modules", "webGenerate" ];
// 文件路径含有这些的js文件将不会被显示
const jsFolderBlackList = [ "webGenerate", "program", "img", "libs" ];

// 创建文件目录树
function folderTreeHtml(dir, articles) {
  // 递归文件夹，生成目录树
  function folderTree(currentPath, depth = 0, startPath = null, lineD = 0) {
    const table = [];
    const items =
        fs.readdirSync(currentPath)
            .filter((item) => {
              const fullPath = path.join(currentPath, item);
              const isDir = fs.statSync(fullPath).isDirectory();
              return ((isDir && !item.startsWith(".")) ||
                      (!isDir &&
                       clickableExtension.some((ext) => item.endsWith(ext))));
            })
            .filter((item) => {
              return !(
                  path.extname(item) === ".js" &&
                  jsFolderBlackList.some((item) => currentPath.includes(item)));
              // 排除掉 program 等 文件夹里的 js
            })
            .filter(() => {
              return !folderBlackList.some((item) =>
                                               currentPath.includes(item));
            }); // 去掉 node_modules 等

    function createItemButton(item, relativePath) {
      // 文档的文件名,去掉后缀
      const baseName = path.basename(item, path.extname(item));
      // 如果是 md 文件，尝试读取第一行作为标题
      // 文件的完整路径，没有后缀
      // const articlePath = path.join(currentPath, baseName);

      const relativePathName = relativePath.replace(/\.html$/, "");
      let articleTitle = relativePathName in articles
                             ? articles[relativePathName].title
                             : undefined;
      return ((hashExtension.some((ext) => item.endsWith(ext)) ? `<a href="#`
                                                               : `<a href="`) +
              `${relativePath}">${
                  articleTitle === undefined ? baseName
                                             : articleTitle}</a><br>`);
    }
    // 改变文本颜色
    function col(str, color = "gray") {
      return `<span style="color:${color}">${str}</span>`;
    }

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      let prefix = "";
      let line = lineD;

      for (let i = 0; i < depth; i++) {
        prefix += line & 1 ? col("│　　") : col("　　　");
        line >>= 1;
      }

      const style =
          prefix + col("│<br>\n") + prefix + col(isLast ? "└──" : "├──");
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
                `${prefix}${
                    col("│　　")}<a href="javascript:void(0);" style="font-size:80%;line-height:100%" onclick="toggleNextNextVis(this)">显示全部</a><br>
            <span class="hiddenContent">`,
            );
            children.push("</span>");
          }
          table.push(...children);
        }
      } else {
        const relativePath = path.relative(startPath || currentPath, fullPath)
                                 .split(path.sep)
                                 .join("/");
        table.push(style + createItemButton(item, relativePath));
      }
    });

    return table;
  }
  return `<p style="text-indent:0;line-height:100%">/root<br>\n${
      folderTree(dir).join("\n").replace(
          /<\/span><span style="color:gray">/g,
          "",
          ) /* 删掉重复的颜色设置 */
  }</p>`;
}

export function generateRecommend(type = 0, articles = {}) {
  let year = 0;
  const listItems = recommend.map((item) => {
    let date;
    if (typeof item.date !== 'number') {
      date = new Date(item.date).toLocaleDateString("zh-CN", {
        day : "2-digit",
        month : "long",
        year : "numeric",
      });
    } else {
      if (item.date > 10000000) {
        date =
            new Date(
                String(item.date).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"),
                )
                .toLocaleDateString("zh-CN", {
                  day : "2-digit",
                  month : "long",
                  year : "numeric",
                });
      } else if (item.date > 100000) {
        date = new Date(
                   String(item.date).replace(/(\d{4})(\d{2})/, "$1-$2"),
                   )
                   .toLocaleDateString("zh-CN",
                                       {month : "long", year : "numeric"});
      } else {
        date = "----";
      }
    }
    const relativePathWithoutExt =
        item.link.replace(/\.html$/, "").replace(/^\//, "");
    const title = "title" in item ? item.title
                  : relativePathWithoutExt in articles
                      ? articles[relativePathWithoutExt].title
                      : path.basename(item.link, path.extname(item.link));
    const link =
        encodeURI(item.link.startsWith("/") || item.link.startsWith("https")
                      ? item.link
                      : "/" + item.link);
    const info = item.info || "";
    // marked.parse(item.info)

    // 处理年份变化，年份变化时添加年份标题
    let year_now = year;
    if (item.date > 10000000) {
      year_now = Math.floor(item.date / 10000);
    } else if (item.date > 100000) {
      year_now = Math.floor(item.date / 100);
    }
    const yearChange =
        year_now !== year
            ? `<hr><h3 style="text-align: center;">- ${year_now} -</h3>`
            : "";
    year = year_now;

    switch (type) {
    case 0:
      return `<li><a href="${link}">${title}</a> <small>(${date})</small></li>`;
    case 1:
      return `${yearChange}<hr><h2><a href="${link}">${title}</a></h2>
<small>${date}</small><br>
<p style="text-indent:0">${info}</p>`;
    }
  });

  let wrap = [
    [ "<ul>", "</ul>" ],
    [ "", "" ],
  ];

  return `${wrap[type][0]}\n${listItems.join("\n")}\n${wrap[type][1]}`;
}

/* function randomArticleJsGen(jsPath, dirPath) {
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
} */

export function tocGen(dir, articles) {
  const tree = folderTreeHtml(dir, articles);
  const recommendation = generateRecommend(0, articles);

  return `
  ${tree}
  <hr>
  ${recommendation}`;
}

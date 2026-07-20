import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { deleteRepositories } from "./syncRepositories.js";
import { gitRepositories } from "./webConfig.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deleteGeneratedHTML(dirPath: string) {
  let files: string[];
  try {
    files = fs.readdirSync(dirPath);
  } catch (err) {
    console.error("读取目录出错:", err);
    return;
  }

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch (err) {
      console.error("获取文件状态出错:", err);
      continue;
    }

    if (stats.isDirectory() && !file.startsWith(".")) {
      deleteGeneratedHTML(filePath);
    } else if (stats.isFile() && file.endsWith(".md")) {
      const baseName = path.basename(file, path.extname(file));
      const dir = path.dirname(filePath);
      removeFile(path.join(dir, `${baseName}.html`));
      removeFile(path.join(dir, `${baseName}-zh.html`));
      removeFile(path.join(dir, `${baseName}-en.html`));
      const stem = baseName.replace(/-(zh|en)$/, "");
      if (stem !== baseName) {
        removeFile(path.join(dir, `${stem}.html`));
      }
    }
  }
}

function removeFile(p: string) {
  try {
    fs.rmSync(p);
    console.log(`rm ${p}`);
  } catch (err: unknown) {
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(`skip ${p}`);
    } else {
      console.error("删除文件时发生错误:", err);
    }
  }
}

const rootPath = path.dirname(__dirname);
deleteGeneratedHTML(rootPath);
await deleteRepositories(rootPath, gitRepositories);
removeFile(path.join(rootPath, "index.html"));
removeFile(path.join(rootPath, "toc.html"));
removeFile(path.join(rootPath, "404.html"));
removeFile(path.join(rootPath, "rss.xml"));
removeFile(path.join(rootPath, "rss-zh.xml"));
removeFile(path.join(rootPath, "rss-en.xml"));
removeFile(path.join(rootPath, "rss-zh-en.xml"));
removeFile(path.join(rootPath, "rss-en-zh.xml"));

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
// 获取当前文件所在的目录
const __dirname = path.dirname(__filename);

// 删除同名markdown 的html
function traverseDirectory(dirPath) {
  // 模板文件

  // 读取目录内容
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      console.error("读取目录出错:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);

      // 获取文件或文件夹的状态
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error("获取文件状态出错:", err);
          return;
        }

        if (stats.isDirectory() && !file.startsWith(".")) {
          // 如果是文件夹且不以 . 开头，递归调用
          traverseDirectory(filePath);
        } else if (stats.isFile() && file.endsWith(".md")) {
          // 如果是 .md 文件，调用处理函数
          // 将文件的后缀换成 .html 的完整路径
          const htmlFilePath = path.format({
            dir: path.dirname(filePath),
            name: path.basename(filePath, path.extname(filePath)),
            ext: ".html",
          });
          removeFile(htmlFilePath);
        }
      });
    });
  });
}

function removeFile(path) {
  try {
    fs.rmSync(path);
    console.log(`rm ${path}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`skip ${path}`);
    } else {
      // 其他错误，打印错误信息
      console.error("删除文件时发生错误:", err);
    }
  }
}

const rootPath = path.dirname(__dirname);
traverseDirectory(rootPath);
removeFile(path.join(rootPath, "index.html"));
removeFile(path.join(rootPath, "toc.html"));

import {exec} from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

// 将 exec 转换为 Promise 版本
const execAsync = util.promisify(exec);

/**
 * 辅助函数：从 URL 获取仓库名
 * 例如: https://github.com/user/repo.git -> repo
 */
function getRepoName(url) { return url.split('/').pop().replace('.git', ''); }

/**
 * 辅助函数：生成 ZIP 下载链接
 * 输入: https://github.com/user/repo.git
 * 输出: https://github.com/user/repo/archive/HEAD.zip
 * 同时返回仓库名: repo
 */
function parseRepoInfo(url) {
  // 去掉末尾可能的 .git
  const cleanUrl = url.replace(/\.git$/, '');
  const repoName = cleanUrl.split('/').pop();
  // 构造 HEAD.zip 下载链接 (HEAD 指向默认分支 main/master)
  const zipUrl = `${cleanUrl}/archive/HEAD.zip`;
  return {repoName, zipUrl};
}

/**
 * 下载对应Github仓库并解压 (Sync via Zip)
 * 清理旧目录 -> curl 下载 -> unzip 解压 -> 修正文件夹名称
 */
export async function syncRepositories(rootPath, reps) {
  console.log(`开始在 ${rootPath} 下同步仓库 (ZIP 下载模式)...\n`);

  for (const [relativePath, urls] of Object.entries(reps)) {
    const baseDir = path.resolve(rootPath, relativePath);

    // 1. 确保父目录存在
    if (!fs.existsSync(baseDir)) {
      await fs.promises.mkdir(baseDir, {recursive : true});
    }

    console.log(`处理目录: ${relativePath}`);

    const tasks = urls.map(async (url) => {
      const {repoName, zipUrl} = parseRepoInfo(url);
      const finalRepoPath = path.join(baseDir, repoName);

      // 临时文件路径，用于下载和解压中转
      const tempZipName = `temp_${repoName}_${Date.now()}.zip`;
      const tempZipPath = path.join(baseDir, tempZipName);
      const tempExtractDir =
          path.join(baseDir, `temp_dir_${repoName}_${Date.now()}`);

      try {
        // A. 清理旧仓库
        if (fs.existsSync(finalRepoPath)) {
          console.log(`   [清理] 删除旧目录 ${repoName}...`);
          await fs.promises.rm(finalRepoPath, {recursive : true, force : true});
        }

        // B. 下载 ZIP (使用 curl)
        // -L 跟随重定向, -o 输出文件, -s
        // 静默模式(防止进度条刷屏，只由脚本控制日志)
        console.log(`   [下载] 正在下载 ${repoName} (HEAD.zip)...`);
        await execAsync(`curl -L -o "${tempZipPath}" -s "${zipUrl}"`,
                        {cwd : baseDir});

        // C. 解压 ZIP (使用 unzip)
        // -q 安静模式, -d 指定解压目录
        console.log(`   [解压] 正在解压 ${repoName}...`);
        await execAsync(`unzip -q "${tempZipPath}" -d "${tempExtractDir}"`,
                        {cwd : baseDir});

        // D. 目录重命名 (关键步骤)
        // GitHub zip 解压后通常是 'repo-main' 或 'repo-master'。
        // 我们需要读取临时目录里的那个唯一的文件夹，并把它移出来重命名为
        // repoName。
        const files = await fs.promises.readdir(tempExtractDir);
        if (files.length > 0) {
          const extractedFolderName = files[0]; // 获取 'repo-branchname'
          const srcPath = path.join(tempExtractDir, extractedFolderName);

          // 移动并重命名
          await fs.promises.rename(srcPath, finalRepoPath);
          console.log(`   [完成] ${repoName} 已就绪`);
        } else {
          throw new Error("解压后为空，下载可能失败");
        }

      } catch (error) {
        console.error(
            `   [失败] 处理 ${repoName} 失败: ${error.message.trim()}`);
      } finally {
        // E. 清理临时文件 (无论成功失败都执行)
        try {
          if (fs.existsSync(tempZipPath))
            await fs.promises.unlink(tempZipPath);
          if (fs.existsSync(tempExtractDir))
            await fs.promises.rm(tempExtractDir,
                                 {recursive : true, force : true});
        } catch (e) { /* 忽略清理错误 */
        }
      }
    });

    await Promise.all(tasks);
    console.log('---');
  }
  console.log('所有 ZIP 同步操作完成。\n');
}

/**
 * 删除仓库
 * 遍历列表，如果指定的仓库文件夹存在，将其强制删除
 */
export async function deleteRepositories(rootPath, reps) {
  console.log(`开始在 ${rootPath} 下删除指定仓库...\n`);

  for (const [relativePath, urls] of Object.entries(reps)) {
    const targetDir = path.resolve(rootPath, relativePath);

    // 如果连父目录都不存在，直接跳过该组
    if (!fs.existsSync(targetDir)) {
      console.log(`目录不存在，跳过: ${relativePath}`);
      continue;
    }

    console.log(`扫描目录: ${relativePath}`);

    const tasks = urls.map(async (url) => {
      const repoName = getRepoName(url);
      const repoPath = path.join(targetDir, repoName);

      try {
        if (fs.existsSync(repoPath)) {
          // 使用 fs.rm 进行递归强制删除 (Node.js 14.14+ 支持)
          await fs.promises.rm(repoPath, {recursive : true, force : true});
          console.log(`   [已删除] ${repoName}`);
        } else {
          console.log(`   [未找到] ${repoName} 不存在，无需删除`);
        }
      } catch (error) {
        console.error(`   [删除失败] 无法删除 ${repoName}: ${error.message}`);
      }
    });

    await Promise.all(tasks);
    console.log('---');
  }
  console.log(' 删除操作全部完成。\n');
}

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
 * 同步仓库
 * 如果仓库不存在 -> 执行浅克隆 (git clone --depth 1)
 * 如果仓库已存在 -> 执行拉取更新 (git pull)
 */
export async function syncRepositories(rootPath, reps) {
  console.log(`开始在 ${rootPath} 下同步仓库...\n`);

  for (const [relativePath, urls] of Object.entries(reps)) {
    const targetDir = path.resolve(rootPath, relativePath);

    // 确保父目录存在
    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, {recursive : true});
    }

    console.log(`检查目录: ${relativePath}`);

    const tasks = urls.map(async (url) => {
      const repoName = getRepoName(url);
      const repoPath = path.join(targetDir, repoName);

      try {
        if (fs.existsSync(repoPath)) {
          // --- 情况 A: 仓库存在，执行 git pull ---
          console.log(`    [更新] ${repoName} 已存在，正在拉取最新代码...`);
          // 注意: git pull 的 cwd 必须是仓库内部 (repoPath)
          await execAsync('git pull', {cwd : repoPath});
          console.log(`    [更新完成] ${repoName}`);
        } else {
          // --- 情况 B: 仓库不存在，执行 git clone ---
          console.log(`    [克隆] ${repoName} 不存在，正在浅克隆...`);
          // 注意: git clone 的 cwd 必须是父目录 (targetDir)
          await execAsync(`git clone --depth 1 ${url}`, {cwd : targetDir});
          console.log(`    [克隆完成] ${repoName}`);
        }
      } catch (error) {
        console.error(
            `   [失败] 操作 ${repoName} 失败: ${error.message.trim()}`);
      }
    });

    await Promise.all(tasks);
    console.log('---');
  }
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

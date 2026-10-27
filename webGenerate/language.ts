export type Lang = "zh" | "en";

export function detectLanguage(content: string, fallback: Lang = "zh"): Lang {
  if (!content) return fallback;

  const text = stripNoise(content);

  const han = (text.match(/\p{Script=Han}/gu) || []).length;
  const kana = (text.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu) || [])
    .length;
  const hangul = (text.match(/\p{Script=Hangul}/gu) || []).length;
  const latinWords = (text.match(/[\p{Script=Latin}]+/gu) || []).length;

  const zhUnits = han + kana + hangul;

  // 没有任何有效文字（纯符号 / emoji / 空文档）
  if (zhUnits + latinWords === 0) return fallback;
  // 完全没有东亚文字 → 英文
  if (zhUnits === 0) return "en";

  // 用"东亚字符数" vs "英文单词数"作为对比
  const ratio = zhUnits / (zhUnits + latinWords);

  // 中文占比够高 → 中文
  if (ratio >= 0.35) return "zh";
  // 中文占比被英文稀释，但绝对量不小（比如短标题「学习 React Hooks」）→ 仍判中文
  if (han >= 5 && ratio >= 0.2) return "zh";

  return "en";

  /** 剥掉代码 / URL / Markdown 语法等噪声，只留下真正的"文字" */
  function stripNoise(input: string): string {
    return (
      input
        // fenced code block（成对）
        .replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, " ")
        .replace(/^[ \t]*~~~[\s\S]*?^[ \t]*~~~/gm, " ")
        // 未闭合的 fenced code（流式渲染常见）直接丢到末尾
        .replace(/^[ \t]*```[\s\S]*$/gm, " ")
        .replace(/^[ \t]*~~~[\s\S]*$/gm, " ")
        // 行内代码
        .replace(/`[^`\n]*`/g, " ")
        // HTML 注释 / 标签
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]*>/g, " ")
        // Markdown 图片 / 链接：[text](url) -> text
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        // 裸 URL
        .replace(/https?:\/\/\S+/g, " ")
        // 行首结构符号（标题、引用、列表、分隔线等）
        .replace(/^[\s>#+*\-=~]+/gm, " ")
        // 强调 / 删除线符号
        .replace(/[*_~`]+/g, " ")
    );
  }
}

const DIR_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  program: { zh: "程序", en: "Programs" },
  writings: { zh: "文章", en: "Writings" },
  excerpts: { zh: "摘录", en: "Excerpts" },
  "quick-references": { zh: "速查", en: "Quick References" },
  "test-pages": { zh: "测试页面", en: "Test Pages" },
  img: { zh: "图片", en: "Images" },
  docs: { zh: "文档", en: "Docs" },
  node_modules: { zh: "依赖包", en: "Dependencies" },
  webGenerate: { zh: "网站生成", en: "Site Generator" },
};

export function tr(name: string, lang: Lang): string {
  return DIR_TRANSLATIONS[name]?.[lang] ?? name;
}

export function translatePath(relativePath: string, lang: Lang): string {
  return relativePath
    .split("/")
    .map((part) => tr(part, lang))
    .join("/");
}

export const UI = {
  toc_title: { zh: "文档索引", en: "Document Index" },
  home_title: { zh: "返回主页", en: "Home" },
  about_title: { zh: "关于", en: "About" },
  github_title: { zh: "跳转到 GitHub", en: "Go to GitHub" },
  theme_title: { zh: "切换深色模式", en: "Toggle Dark Mode" },
  scroll_top_title: { zh: "滚动到顶部", en: "Scroll to Top" },
  toc_heading: { zh: "目录", en: "Contents" },
  language_title: { zh: "语言", en: "Language" },
  show_all: { zh: "显示全部", en: "Show All" },
  show_less: { zh: "显示更少", en: "Show Less" },
  follow_system: { zh: "跟随系统", en: "Follow system" },
  chinese: { zh: "中文", en: "Chinese" },
  english: { zh: "English", en: "English" },
  show_both_zh: "此外，也展示英文内容",
  show_both_en: "Also show Chinese content",
  page_not_found: {
    zh: "你访问的页面不存在，可能是因为链接错误或者页面已被移动或删除。",
    en: "The page you are looking for does not exist. The link may be broken or the page may have been moved or deleted.",
  },
  redirecting_to: {
    zh: "正在重定向到",
    en: "Redirecting to",
  },
  redirect_in_seconds: {
    zh: "秒后跳转...",
    en: "in seconds...",
  },
  index_heading: { zh: "首页", en: "Home" },
  toc_heading_main: { zh: "文档索引", en: "Document Index" },
  tools_heading: { zh: "小工具", en: "Tools" },
} as const;

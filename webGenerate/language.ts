export type Lang = "zh" | "en";

export function detectLanguage(content: string): Lang {
  let total = 0;
  let chinese = 0;
  for (const ch of content) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7f) {
      total++;
      continue;
    }
    if (
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0x3400 && cp <= 0x4dbf) ||
      (cp >= 0xf900 && cp <= 0xfaff)
    ) {
      chinese++;
    }
    total++;
  }
  if (total === 0) return "zh";
  return chinese / total >= 0.1 ? "zh" : "en";
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

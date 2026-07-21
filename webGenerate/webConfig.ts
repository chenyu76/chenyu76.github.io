/*
 * 网站附带的其他 Git 仓库列表
 * 这些仓库将可在网站生成时被同步更新
 * 键为相对于根目录的路径
 * 值为该路径下需要同步的 Git 仓库 URL 列表
 * （submodule 要反复同步更新这些仓库，不是很方便，所以不想用）
 * NOTE: 由于使用github自动打包的zip，所以gitlab等其他平台的仓库应该不适用
 */
const toMyRepo = (repo: string) => `https://github.com/chenyu76/${repo}`;
export const gitRepositories = {
  program: [
    "draw-n-pointed-star",
    "color_wars",
    "hextris",
    "metronome",
    "tetris",
    "turntable-web",
    "guitar-sight-reading-trainer-web",
    "color_sequence_game",
  ].map(toMyRepo),
  writings: ["how-to-expose-ssh-to-the-internet-with-frp"].map(toMyRepo),
};

export type RecommendItem =
  | string
  | {
      link: string;
      date?: number | string;
      title?: string;
      info?: string;
      title_zh?: string;
      title_en?: string;
      info_zh?: string;
      info_en?: string;
    };

/**
 * 主页的推荐内容
 * link:  链接
 * 如果是markdown文档，直接用html后缀即可，网站编译时会生成对应的html文件
 *
 * date:
 * 日期，格式YYYYMMDD 或 YYYYMM 或 YYYY 或
 * 字符串（这会移交给JavaScript的Date对象处理）
 * 如果不指定，会尝试从md文件最后一行读出来
 *
 * title / info:
 * 单语言快捷字段（向后兼容）。如果无 _zh/_en 后缀字段，detectLanguage() 自动判定语言
 *
 * title_zh / title_en / info_zh / info_en:
 * 双语显式字段。有 title_zh → 该卡片有中文版；有 title_en → 该卡片有英文版
 */
export const recommend: RecommendItem[] = [
  {
    link: "writings/deans-office-latex.html",
    date: 20260722,
  },
  {
    link: "program/hextris/index.html",
    date: 20260607,
    title_zh: "俄罗斯方块，但是六边形往中心落",
    title_en: "Tetris, but hexagons fall toward the center",
    info_zh: "六边形向中心坠落的俄罗斯方块变体。",
    info_en:
      "A Tetris variant where blocks fall toward the center of a hexagon grid.",
  },
  "writings/copilot-key-as-input-method-switch.html",
  {
    link: "writings/matlab_behavior_test/index.html",
    date: "20260512",
    title_zh: "奇妙的MATLAB语言特性小测试",
    title_en: "A interesting test of MATLAB language features",
    info_zh: "我讨厌MATLAB。",
    info_en: "I hate MATLAB.",
  },
  "writings/how-to-expose-ssh-to-the-internet-with-frp/index.html",
  {
    date: 20260401,
    link: "program/4d-sokoban/index.html",
    title_zh: "4D推箱子",
    title_en: "4D sokoban",
    info_zh:
      "相信大家都玩过2D的推箱子游戏，那让我们试试4D的。（这真是给人类玩的吗）",
    info_en:
      "Everyone's played 2D Sokoban games, so let's try a 4D one. (Is this really for humans?)",
  },
  {
    date: 20260213,
    link: "https://github.com/chenyu76/draftsman.nvim",
    title_zh: "Draftsman.nvim",
    title_en: "Draftsman.nvim",
    info_zh:
      "（Github链接）Neovim插件。功能丰富的ASCII图表绘制工具，支持绘制方框、箭头、线条和文字，并可轻松编辑。",
    info_en:
      "(GitHub link) Neovim plugin. A feature-rich ASCII diagramming tool for Neovim. Draw boxes, arrows, lines, and text, and edit them easily.",
  },
  {
    date: 20260126,
    link: "https://github.com/chenyu76/github-latex-readme",
    title_zh: "在Github上用LaTeX写README",
    title_en: "Writing a README in LaTeX on GitHub",
    info_zh:
      "（Github链接）使用 GitHub Actions 将 LaTeX 文件自动编译为 SVG，从而用 LaTeX 编写 Github 上的 README 文件。",
    info_en:
      "(Github link) Use GitHub Actions to automatically compile LaTeX files into SVG, thus enabling you to write README files on Github in LaTeX.",
  },
  {
    date: 20260109,
    link: "writings/new-year-new-theme.html",
    title_zh: "本网页背景上的元素现在随风摆动",
    info_zh:
      "可能需要稍等一会才会有风吹来。<br>也许会对您的设备有些许性能影响（虽然我已经尽量优化了）。",
  },
  {
    date: 20251221,
    link: "writings/college-reverse-proxy.html",
    info_zh:
      "我们将在校园网内计算机上使用frp配置反向代理并安装WireGuard实现在校外访问校内的网络资源。以及一些相关的注意事项。",
  },
  {
    date: 20251121,
    link: "https://github.com/chenyu76/glyph-ascii-canvas",
    // title_zh: "Glyph ASCII Canvas",
    title_en: "Glyph ASCII Canvas",
    // info_zh:
    //   "（Github链接）一个可以将图片转换为ASCII艺术的Python程序。使用滑动窗口模板匹配算法，考虑形状和空间关系。",
    info_en:
      "(GitHub link) A Python program that generates ASCII art from images using a sliding window template matching approach. Considers shape and spatial relationships by comparing image patches against rendered font templates using MSE.",
  },
  {
    date: 20250715,
    link: "program/draw-n-pointed-star/readme.html",
    info_zh:
      "我们都知道，正五角星只有一种画法（除去平凡的正五边形情形），但当点数增大时，画法就有很多了。我感觉当点数增加时，绘制的形状应该会很好看。",
  },
  {
    date: 20250614,
    link: "program/color_wars/index.html",
    title_zh: "颜色战争 · 改",
    info_zh:
      "来自JindoBlu的1 2 3 4 Player Games 里有一个叫Color wars的游戏，原版是只有一个方形地图的2～4人对抗游戏。我寻思着可以加点东西，于是就写了这个。增加了更多地图类型和更多玩家。",
  },
  {
    date: 20250607,
    link: "program/tetris/readme.html",
    info_zh:
      "如果一个俄罗斯方块每次给你的方块不是随机的，而是暗中由算法控制，或是帮助你，或是阻止你。<br>将难度调到1享受要啥没啥的狗屎版俄罗斯方块；还附带一个可以自己玩俄罗斯方块的AI，也许你可以看着它玩用于解闷。",
  },
  {
    date: 20250412,
    link: "writings/remarkable_cover.html",
    info_zh: "便宜实用手感好，避免屏幕被划伤，但是不耐脏？",
  },
  {
    date: 20250311,
    link: "writings/latex-with-inkscape.html",
    info_zh: "没有附带一个Inkscape教程",
  },
  {
    date: 20250220,
    link: "writings/Add-citation-in-LaTeX.html",
    info_zh: "有同学问我怎么引用文章，就有了这一篇基础的LaTeX引用方法",
  },
  {
    date: 20250206,
    link: "writings/new-year-new-theme.html",
    info_zh: "蛇年的全新网站样式！动态随机生成的js背景！",
  },
  {
    date: 20241215,
    link: "writings/julia-set.pdf",
    title_zh: "Julia集的计算机艺术",
    info_zh: "（pdf文件)（某课程作业）简单的迭代居然能生成复杂而迷人的图形。",
  },
  {
    date: "Nov 17, 2024",
    link: "https://github.com/chenyu76/MMA-Hirota-D-operators",
    title_zh: "Hirota D 算子的 Mathematica 实现",
    info_zh: "（Github 链接）",
  },
  {
    date: 20240909,
    link: "program/7-piece-puzzle/Readme and solution.html",
    title_zh: "一个拼图游戏",
    info_zh: "关卡随机生成的拼图游戏",
  },
  {
    date: 202408,
    link: "program/TractorBattle3D/readme.html",
    title_zh: "一个对抗游戏",
    info_zh: "生成障碍阻碍对手的多人本地游戏，Godot练习",
  },
  {
    date: 202408,
    link: "writings/some-szu-LaTeX-template.html",
  },
  {
    date: 20240826,
    link: "https://github.com/chenyu76/MatrixGraphViewer",
    title_zh: "以网格形式批量查看有命名规范的图片的Qt程序",
    info_zh: "（Github链接）",
  },
  {
    date: 20240620,
    link: "writings/about-the-website.html",
    title_zh: "关于本站",
    info_zh: "第一篇文章",
  },
].map((v) => (typeof v === "string" ? { link: v } : v));

export default { recommend, gitRepositories };

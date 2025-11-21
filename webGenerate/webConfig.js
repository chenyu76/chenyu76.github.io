/**
 * 主页的推荐内容
 * link: 链接
 * date:
 * 日期，格式YYYYMMDD 或 YYYYMM
 * 或字符串（这会移交给JavaScript的Date对象处理）
 * title:
 * 标题（可选，若不填，尝试从对应的markdown文件的第一行寻找标题）
 * info:
 * 介绍（html格式）
 * （可选，若不填，我希望能从生成的html文件里找到第一个<p>填进去，但目前还没实现）
 */
export const recommend = [
  {
    date : 20251121,
    link : "https://github.com/chenyu76/glyph-ascii-canvas",
    title : "Glyph ASCII Canvas",
    info :
        "（Github链接）一个可以将图片转换为ASCII艺术的Python程序。<br>This program generates ASCII art from images using a sliding window template matching approach. Unlike simpler ASCII converters that map pixels directly to characters based on brightness, this algorithm considers the shape and spatial relationships by comparing image patches against rendered font templates using Mean Squared Error (MSE)."
  },
  {
    date : 20250825,
    link : "writings/new-year-new-theme.html",
    title : "本网页背景上的草现在随风摆动",
    info :
        "可能需要稍等一会才会有风吹来。<br>也许会对您的设备有些许性能影响（虽然我已经尽量优化了）。"
  },
  {
    date : 20250715,
    link : "program/draw-n-pointed-star/readme.html",
    info :
        " 我们都知道，正五角星只有一种画法（除去平凡的正五边形情形），但当点数增大时，画法就有很多了。我感觉当点数增加时，绘制的形状应该会很好看。",
  },
  {
    date : 20250614,
    link : "program/color_wars/index.html",
    title : "颜色战争 · 改",
    info :
        "来自JindoBlu的1 2 3 4 Player Games 里有一个叫Color wars的游戏，原版是只有一个方形地图的2～4人对抗游戏。我寻思着可以加点东西，于是就写了这个。增加了更多地图类型和更多玩家。",
  },
  {
    date : 20250607,
    link : "program/tetris/readme.html",
    // title : "稍有不同的俄罗斯方块",
    info :
        "如果一个俄罗斯方块每次给你的方块不是随机的，而是暗中由算法控制，或是帮助你，或是阻止你。<br>将难度调到1享受要啥没啥的狗屎版俄罗斯方块；还附带一个可以自己玩俄罗斯方块的AI，也许你可以看着它玩用于解闷。",
  },
  {
    date : 20250412,
    link : "writings/remarkable_cover.html",
    info : "便宜实用手感好，避免屏幕被划伤，但是不耐脏？",
  },
  {
    date : 20250311,
    link : "writings/latex-with-inkscape.html",
    info : "没有附带一个Inkscape教程",
  },
  {
    date : 20250220,
    link : "writings/Add-citation-in-LaTeX.html",
    info : "有同学问我怎么引用文章，就有了这一篇基础的LaTeX引用方法",
  },
  {
    date : 20250206,
    link : "writings/new-year-new-theme.html",
    info : "蛇年的全新网站样式！动态随机生成的js背景！",
  },
  {
    date : 20241215,
    link : "writings/julia-set.pdf",
    title : "Julia集的计算机艺术",
    info : "（pdf文件)（某课程作业）简单的迭代居然能生成复杂而迷人的图形。",
  },
  {
    date : "Nov 17, 2024",
    link : "https://github.com/chenyu76/MMA-Hirota-D-operators",
    title : "Hirota D 算子的 Mathematica 实现",
    info : "（Github 链接）"
  },
  {
    date : 20240909,
    link : "program/7-piece-puzzle/Readme and solution.html",
    title : "一个拼图游戏",
    info : "关卡随机生成的拼图游戏",
  },
  // {
  //   date : 20240905,
  //   link : "program/counter.html",
  //   title : "计数器",
  //   info : "只是一个计数器，按一下加一（也可以设置为别的）",
  // },
  {
    date : 202408,
    link : "program/TractorBattle3D/readme.html",
    title : "一个对抗游戏",
    info : "生成障碍阻碍对手的多人本地游戏，Godot练习",
  },
  {
    date : 202408,
    link : "writings/some-szu-LaTeX-template.html",
  },
  {
    date : 20240826,
    link : "https://github.com/chenyu76/MatrixGraphViewer",
    title : "以网格形式批量查看有命名规范的图片的Qt程序",
    info : "（Github链接）",
  },
  {
    date : 20240620,
    link : "writings/about-the-website.html",
    title : "关于本站",
    info : "第一篇文章",
  },
];

/*
 * Git 仓库列表
 * 键为相对于根目录的路径
 * 值为该路径下需要同步的 Git 仓库 URL 列表
 */
export const gitRepositories = {
  "program" : [
    "draw-n-pointed-star", "color_wars", "hextris", "metronome", "tetris"
  ].map(myRepo)
};

function myRepo(repo) { return `https://github.com/chenyu76/${repo}.git`; }

export default {recommend, gitRepositories};

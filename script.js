// 平滑滚动到顶部
function scrollToTop() {
  document.body.scrollTo({
    left : 0,
    top : 0,
    behavior : "smooth",
  });
  // 兼容 Firefox/IE
  document.documentElement.scrollTo({
    left : 0,
    top : 0,
    behavior : "smooth",
  });
}

function debounce(func, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { func.apply(this, args); }, delay);
  };
}

// --- 目录与侧边栏控制逻辑 ---

// 1. 初始化检查与事件绑定
document.addEventListener("DOMContentLoaded", () => {
  const tocContent = document.getElementById("toc-content");
  const rightSidebar = document.getElementById("right-sidebar");
  const mobileBtn = document.getElementById("toc-mobile-btn");
  const mobileTocContent = document.getElementById("toc-content-mobile");

  // 检查目录是否为空
  if (tocContent &&
      (!tocContent.innerHTML.trim() || tocContent.innerText.trim() === "")) {
    // 隐藏 PC 端右侧栏
    if (rightSidebar)
      rightSidebar.style.display = "none";
    // 隐藏移动端按钮
    if (mobileBtn)
      mobileBtn.style.display = "none";

    document.documentElement.style.setProperty('--right-sidebar-width', '0px');
  } else if (mobileTocContent && tocContent) {
    // 同步内容到移动端目录
    mobileTocContent.innerHTML = tocContent.innerHTML;

    // 移动端点击链接自动关闭目录
    mobileTocContent.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        const wrapper = document.getElementById("toc-mobile-wrapper");
        if (wrapper)
          wrapper.classList.remove("active");
      });
    });
  }
});

// 滚动监听：
// 控制左侧栏显示
// 控制背景可见性
const titleContainer = document.getElementById("title-container");
const leftSidebar = document.getElementById("left-sidebar");
const iframeBackground = document.getElementById("iframe-background");
var currentTopContentScrollStatus = false; // 为真时是滚动到下方了
window.addEventListener("scroll", () => {
  if (!leftSidebar)
    return;
  // 当顶部的底部边缘跑到了视口上方，说明已经完全滚出去了
  let newScrollStatus = titleContainer.getBoundingClientRect().bottom < 0;
  if (newScrollStatus == currentTopContentScrollStatus)
    return;
  currentTopContentScrollStatus = newScrollStatus;
  if (currentTopContentScrollStatus) {
    leftSidebar.classList.add("show");
    iframeBackground.style.display = "none";
  } else {
    leftSidebar.classList.remove("show");
    iframeBackground.style.display = "";
  }
}, true);

// 3. 移动端目录切换
function toggleToc() {
  const wrapper = document.getElementById("toc-mobile-wrapper");
  if (wrapper)
    wrapper.classList.toggle("active");
}

// 4. 点击空白处关闭移动端目录
document.addEventListener("click", (e) => {
  const toc = document.getElementById("toc-mobile-wrapper");
  const btn = document.getElementById("toc-mobile-btn");

  if (window.innerWidth < 1200 && toc && toc.classList.contains("active")) {
    // 如果点击的既不是目录面板，也不是触发按钮，则关闭
    if (!toc.contains(e.target) && !btn.contains(e.target)) {
      toc.classList.remove("active");
    }
  }
});

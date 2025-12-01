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
  const titleContainer = document.getElementById("title-container");

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

  // 夜间模式适配，还没做好
  let nightModeControl = () => {
    if (typeof isNight !== 'undefined' && isNight) {
      let div = document.getElementById("top-buttons-wrapper");
      if (div) {
        let children = div.querySelectorAll("*");
        children.forEach((element) => {
          let img = element.querySelector("img");
          if (img)
            img.style.filter = "invert(1)";
        });
      }
      let hdiv = document.getElementById("heading");
      if (hdiv)
        hdiv.style.color = "white";
    }
  };
  nightModeControl();
  setInterval(nightModeControl, 1001);
});

// 2. 滚动监听：控制左侧栏显示
window.addEventListener(
    "scroll", debounce(() => {
      const leftSidebar = document.getElementById("left-sidebar");
      const topButtons = document.getElementById("top-buttons-wrapper");

      if (!leftSidebar || !topButtons)
        return;

      // 获取顶部按钮组的位置
      const topButtonsRect = topButtons.getBoundingClientRect();

      // 当顶部按钮的底部边缘跑到了视口上方 ( < 0 )，说明已经完全滚出去了
      if (topButtonsRect.bottom < 0) {
        leftSidebar.classList.add("show");
      } else {
        leftSidebar.classList.remove("show");
      }
    }, 50), true);

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

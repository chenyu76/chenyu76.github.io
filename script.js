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
const iframeBackground = document.getElementById("iframe-background");
var currentTopContentScrollStatus = false; // 为真时是滚动到下方了
window.addEventListener("scroll", () => {
  let newScrollStatus = titleContainer.getBoundingClientRect().bottom < 0;
  if (newScrollStatus == currentTopContentScrollStatus)
    return;
  currentTopContentScrollStatus = newScrollStatus;
  if (currentTopContentScrollStatus) {
    iframeBackground.style.display = "none";
  } else {
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

// --- PJAX (无刷新无缝切换页面) ---
document.addEventListener("click", (e) => {
  // 寻找被点击的 a 标签
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  // 忽略无效链接或包含 _blank 的链接
  if (!href || link.target === "_blank") return;

  // 使用完整的 URL 解析，便于比较
  const url = new URL(link.href, window.location.href);
  // 只处理同源同端口的链接
  if (url.origin !== window.location.origin) return;

  // 忽略非 HTML 或目录的资源（如 .pdf, .zip, .png）
  if (url.pathname.match(/\.[^/]+$/) && !url.pathname.endsWith(".html")) return;

  // 如果仅仅是 hash 改变（页面内锚点跳转），交给浏览器原生处理
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
      return;
  }

  e.preventDefault();
  navigateTo(url.href);
});

window.addEventListener("popstate", () => {
  navigateTo(window.location.href, false);
});

async function navigateTo(url, pushState = true) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
        window.location.href = url; // 降级处理
        return;
    }
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    // 1. 替换标题
    document.title = doc.title;
    
    // 2. 同步 Head 中的 CSS 链接 (例如 katex, highlight.js 的按需引入)
    const currentLinks = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    doc.head.querySelectorAll('link[rel="stylesheet"]').forEach(newLink => {
        if (!currentLinks.includes(newLink.href)) {
            const linkNode = document.createElement("link");
            linkNode.rel = "stylesheet";
            linkNode.href = newLink.href;
            if (newLink.integrity) linkNode.integrity = newLink.integrity;
            if (newLink.crossOrigin) linkNode.crossOrigin = newLink.crossOrigin;
            document.head.appendChild(linkNode);
        }
    });

    // 3. 替换内容区域
    const selectorsToReplace = ["#heading", ".content", "#footnote"];
    selectorsToReplace.forEach(selector => {
        const newEl = doc.querySelector(selector);
        const oldEl = document.querySelector(selector);
        if (newEl && oldEl) {
            oldEl.innerHTML = newEl.innerHTML;
        } else if (oldEl && !newEl) {
            oldEl.innerHTML = ""; // 处理新页面不存在该部分的情况
        }
    });
    
    // 4. 替换和处理目录
    const newToc = doc.querySelector("#toc-content");
    const tocContent = document.querySelector("#toc-content");
    if (newToc && tocContent) {
        tocContent.innerHTML = newToc.innerHTML;
        
        // 重新同步到移动端目录
        const mobileTocContent = document.getElementById("toc-content-mobile");
        if (mobileTocContent) {
             mobileTocContent.innerHTML = newToc.innerHTML;
             mobileTocContent.querySelectorAll("a").forEach(a => {
                a.addEventListener("click", () => {
                    const wrapper = document.getElementById("toc-mobile-wrapper");
                    if (wrapper) wrapper.classList.remove("active");
                });
            });
        }
        
        // 控制侧边栏显隐逻辑
        const rightSidebar = document.getElementById("right-sidebar");
        const mobileBtn = document.getElementById("toc-mobile-btn");
        if (!tocContent.innerHTML.trim() || tocContent.innerText.trim() === "") {
             if (rightSidebar) rightSidebar.style.display = "none";
             if (mobileBtn) mobileBtn.style.display = "none";
             document.documentElement.style.setProperty('--right-sidebar-width', '0px');
        } else {
             if (rightSidebar) rightSidebar.style.display = "";
             if (mobileBtn) mobileBtn.style.display = "";
             document.documentElement.style.setProperty('--right-sidebar-width', ''); // 恢复默认
        }
    }

    // 5. 更新 URL
    if (pushState) {
      history.pushState(null, "", url);
    }
    
    // 6. 重新执行新页面注入的内联脚本 (例如由于有代码块才动态插入的 copy-btn 脚本)
    doc.body.querySelectorAll("script:not([src])").forEach(script => {
         const newScript = document.createElement("script");
         newScript.textContent = script.textContent;
         document.body.appendChild(newScript);
         setTimeout(() => newScript.remove(), 100);
    });

    // 如果目标 url 中带有 hash，滚动到对应元素；否则滚动到顶部
    const urlObj = new URL(url);
    if (urlObj.hash) {
        const targetElement = document.querySelector(urlObj.hash);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth' });
        } else {
            scrollToTop();
        }
    } else {
        scrollToTop();
    }

  } catch (err) {
    console.error("PJAX 发生错误，降级回传统跳转:", err);
    window.location.href = url;
  }
}

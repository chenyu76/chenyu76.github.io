function scrollToTop() {
  document.body.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });
  document.documentElement.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });
}

function getTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const toggleUses = document.querySelectorAll(
    "#theme-toggle use, #theme-toggle-mobile use",
  );
  toggleUses.forEach((use) => {
    use.setAttribute(
      "href",
      theme === "dark" ? "#icon-light-mode" : "#icon-dark-mode",
    );
  });
  const iframe = document.getElementById("iframe-background");
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: "theme", theme }, "*");
  }
}

function toggleTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    localStorage.setItem("theme", "auto");
  } else {
    const systemIsDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    localStorage.setItem("theme", systemIsDark ? "light" : "dark");
  }
  applyTheme(getTheme());
}

function updateTitlesAndTexts(lang) {
  document.querySelectorAll("[data-title-zh]").forEach((el) => {
    const title =
      lang === "zh" ? el.dataset.titleZh : el.dataset.titleEn || el.dataset.titleZh;
    el.setAttribute("title", title || "");
  });

  document.querySelectorAll("[data-text-zh]").forEach((el) => {
    const text =
      lang === "zh" ? el.dataset.textZh : el.dataset.textEn || el.dataset.textZh;
    el.textContent = text || "";
  });
}

function updateNavLinks(lang) {
  document.querySelectorAll(".nav-lang-aware").forEach((link) => {
    const base = link.dataset.hrefBase;
    if (base) {
      link.href = base.replace(/\.html$/, `-${lang}.html`);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getTheme());

  const pageLang = document.documentElement.dataset.pageLang || "zh";
  updateTitlesAndTexts(pageLang);
  updateNavLinks(pageLang);

  const tocContent = document.getElementById("toc-content");
  const rightSidebar = document.getElementById("right-sidebar");
  const mobileBtn = document.getElementById("toc-mobile-btn");
  const mobileTocContent = document.getElementById("toc-content-mobile");

  if (
    tocContent &&
    (!tocContent.innerHTML.trim() || tocContent.innerText.trim() === "")
  ) {
    if (rightSidebar) rightSidebar.style.display = "none";
    if (mobileBtn) mobileBtn.style.display = "none";
    document.documentElement.style.setProperty("--right-sidebar-width", "0px");
  } else if (mobileTocContent && tocContent) {
    mobileTocContent.innerHTML = tocContent.innerHTML;
    mobileTocContent.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        const wrapper = document.getElementById("toc-mobile-wrapper");
        if (wrapper) wrapper.classList.remove("active");
      });
    });
  }
});

const titleContainer = document.getElementById("title-container");
const iframeBackground = document.getElementById("iframe-background");
var currentTopContentScrollStatus = false;
window.addEventListener(
  "scroll",
  () => {
    let newScrollStatus = titleContainer.getBoundingClientRect().bottom < 0;
    if (newScrollStatus == currentTopContentScrollStatus) return;
    currentTopContentScrollStatus = newScrollStatus;
    if (currentTopContentScrollStatus) {
      iframeBackground.style.display = "none";
    } else {
      iframeBackground.style.display = "";
    }
  },
  true,
);

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    const stored = localStorage.getItem("theme");
    if (!stored || stored === "auto") {
      applyTheme(e.matches ? "dark" : "light");
    }
  });

function toggleToc() {
  const wrapper = document.getElementById("toc-mobile-wrapper");
  if (wrapper) wrapper.classList.toggle("active");
}

document.addEventListener("click", (e) => {
  const toc = document.getElementById("toc-mobile-wrapper");
  const btn = document.getElementById("toc-mobile-btn");
  if (window.innerWidth < 1200 && toc && toc.classList.contains("active")) {
    if (!toc.contains(e.target) && !btn.contains(e.target)) {
      toc.classList.remove("active");
    }
  }
});

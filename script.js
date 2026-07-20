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

const LANG_KEY = "lang";
const SHOW_BOTH_KEY = "showBoth";

function getLang() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === "zh" || stored === "en") return stored;
  return "auto";
}

function getEffectiveLang() {
  const lang = getLang();
  if (lang === "auto") {
    return (
      navigator.languages
        ?.find((l) => l.startsWith("zh"))
        ?.startsWith("zh") ||
      navigator.language?.startsWith("zh")
    )
      ? "zh"
      : "en";
  }
  return lang;
}

function getShowBoth() {
  const stored = localStorage.getItem(SHOW_BOTH_KEY);
  if (stored === null) return true;
  return stored === "true";
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

function applyLanguage() {
  const mode = getLang();
  const elang = getEffectiveLang();
  const showBoth = getShowBoth();

  document.documentElement.lang = elang;

  document.querySelectorAll("[data-lang]").forEach((el) => {
    const itemLang = el.dataset.lang;
    if (itemLang === elang) {
      el.style.display = "block";
    } else if (showBoth && el.dataset.fallback === "true") {
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  });

  updateTitlesAndTexts(elang);
  updateNavLinks(elang);

  document.querySelectorAll(".lang-radio").forEach((r) => {
    r.checked = r.value === getLang();
  });

  document.querySelectorAll(".lang-show-both").forEach((cb) => {
    cb.disabled = false;
    cb.checked = showBoth;
  });

  const showBothSpans = document.querySelectorAll(".show-both-text");
  showBothSpans.forEach((span) => {
    span.textContent =
      elang === "zh" ? span.dataset.textZh : span.dataset.textEn;
  });

  const showBothLabels = document.querySelectorAll(".show-both-label");
  showBothLabels.forEach((label) => {
    label.style.display = "flex";
  });
}

function closeAllLangDropdowns() {
  document.querySelectorAll(".lang-dropdown").forEach((dd) => {
    dd.classList.remove("active");
  });
}

function toggleLangDropdown(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const dropdown = btn.parentElement.querySelector(".lang-dropdown");
  if (!dropdown) return;

  const isActive = dropdown.classList.contains("active");
  closeAllLangDropdowns();
  if (!isActive) {
    const rect = btn.getBoundingClientRect();
    dropdown.style.left = Math.min(rect.right + 4, window.innerWidth - 240) + "px";
    dropdown.style.top = Math.min(rect.top, window.innerHeight - 160) + "px";
    dropdown.classList.add("active");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(getTheme());

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

  applyLanguage();

  document.querySelectorAll(".lang-toggle").forEach((btn) => {
    btn.addEventListener("click", toggleLangDropdown);
  });

  document.querySelectorAll(".lang-radio").forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      const val = e.target.value;
      document.querySelectorAll(".lang-radio").forEach((r) => {
        r.checked = r.value === val;
      });
      localStorage.setItem(LANG_KEY, val);
      applyLanguage();
    });
  });

  document.querySelectorAll(".lang-show-both").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(".lang-show-both").forEach((c) => {
        c.checked = checked;
      });
      localStorage.setItem(SHOW_BOTH_KEY, checked ? "true" : "false");
      applyLanguage();
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-toggle") && !e.target.closest(".lang-dropdown")) {
      closeAllLangDropdowns();
    }
  });
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
  const folder = e.target.closest(".tree-folder");
  if (folder) {
    const branch = folder.closest(".tree-branch");
    if (branch) {
      branch.classList.toggle("tree-collapsed");
    }
  }
});

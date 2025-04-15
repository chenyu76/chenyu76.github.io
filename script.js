function the_script() {
  return 'This is the JavaScript file of this website. </br>See raw file at <a href="script.js"> script.js </a>';
}

// 平滑滚动到顶部
function scrollToTop() {
  document.body.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });
}

// 是否是竖屏模式
let pixelImgInit = () => {
  if (window.innerHeight > window.innerWidth) {
    imgInit(0.382 * window.innerHeight);
    let t = document.getElementById("title-container");
    t.style.height = "38.2vh";
    //let s = document.getElementById("anime-spacer");
    //s.style.height = "63vh";
  } else {
    imgInit(0.618 * window.innerHeight);
  }
  // 来自背景的是否是夜晚,颜色切换
  if (isNight) {
    let div = document.getElementById("top-buttons-wrapper");
    let children = div.querySelectorAll("*"); // 获取 div 内所有子元素
    children.forEach((element) => {
      let img = element.querySelector("img"); // 获取 <a> 标签中的 <img> 元素
      if (img) img.style.filter = "invert(1)"; // 仅对 <img> 标签应用 invert(1)
    });
    let hdiv = document.getElementById("heading");
    hdiv.style.color = "white";
  }
};
pixelImgInit();
// 每隔十分钟更新背景
setInterval(pixelImgInit, 600000);

// 处理窗口大小变化
// 防抖函数封装
function debounce(func, delay = 250) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId); // 清除之前的定时器
    timeoutId = setTimeout(() => {
      func.apply(this, args); // 延迟执行目标函数
    }, delay);
  };
}
// 处理窗口大小变化
function handleResize() {
  is_first_img_init = true;
  pixelImgInit();
}
// 使用防抖包装处理函数
const debouncedResize = debounce(handleResize, 300);
// 监听窗口resize事件
window.addEventListener("resize", debouncedResize);

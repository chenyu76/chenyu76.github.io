function the_script() {
  return 'This is the JavaScript file of this website. </br>See raw file at <a href="script.js"> script.js </a>';
}


// 获取当前的哈希值
function getHashParam() {
  return window.location.hash
    ? (function (str) {
        // 如果参数没有后缀就添加.md后缀
        if (str) {
          if (str.includes(".")) return str;
          else return str + ".md";
        }
        return str;
      })(window.location.hash.substring(1))
    : "README.md";
}

// TODO: hash变化时跳转到指定位置（目录）
// 监听 hashchange 事件以动态加载新的 Markdown 文件
/* window.addEventListener("hashchange", async () => {
  // 显示加载
  document.getElementById("heading").innerHTML = "<h1>加载中…</h1>";
  const spacer = document.getElementById("anime-spacer");
  scrollToTop();
  spacer.classList.remove("shrinked");

  // 开始处理文本内容
  var start = performance.now();
  // 也许我应该使用 github action 将文本都处理好了直接下载就行而不是客户端处理
  var tt = await parseFile(getHashParam());
  var end = performance.now();

  // 等待动画结束
  setTimeout(
    () => {
      loadText(tt);
      setTimeout(() => {
        spacer.classList.add("shrinked");
      }, 20);
    },
    ((a) => {
      return a > 0 ? a : 0;
    })(500 - (end - start)),
  );
}); */

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

// HTML 加载完成后，使用当前天空的近地面颜色作为页面背景。
// 让访问者感觉加载能快点。与图无关。
function setPageBackgroundColor() {
  const color = rgb2hex(interpolate_time_color(
      currentHour, skyColorDict[skyColorDict.length - 1]));
  document.documentElement.style.backgroundColor = color;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setPageBackgroundColor,
                            {once : true});
} else {
  setPageBackgroundColor();
}

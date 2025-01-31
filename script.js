function the_script() {
  return 'This is the JavaScript file of this website. </br>See raw file at <a href="script.js"> script.js </a>';
}

function parseFile(file) {
  return fetch(file)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load " + file + ": " + response.statusText);
      }
      return response.text().then((text) => {
        const extension = file.split(".").pop();

        //划分内容为 [标题, 正文, 脚注（日期）]
        const content = ((str) => {
          let firstLineEndIndex = str.indexOf("\n");
          let firstLine = str.substring(0, firstLineEndIndex).trim();

          // 检查第一行是否以 "# " 开头
          if (str.startsWith("# ")) {
            firstLine = str.substring(1, firstLineEndIndex).trim();
            str = str.substring(firstLineEndIndex + 1);
          }

          // 从字符串末尾开始查找最后一个换行符
          let lastIndex = str.length - 1;
          while (lastIndex >= 0 && str[lastIndex] !== "\n") {
            lastIndex--;
          }
          // 提取最后一行
          const lastLine = str.substring(lastIndex + 1).trim();
          // 检查最后一行的长度是否是日期
          if (
            lastLine.length < 50 &&
            ((lastLine.includes("月") && lastLine.includes("日")) ||
              (lastLine.match(/\//g) || []).length === 2)
          ) {
            return [firstLine, str.substring(0, lastIndex).trim(), lastLine];
          }
          // 如果不满足条件，返回null
          return [firstLine, str, null];
        })(text);

        return {
          firstLine: content[0],
          content: ((htmlString) => {
            // 查找包含百分数的alt属性的img标签，并设置相应的width属性，使在编写md时能直接设置图片百分比大小
            // 创建一个临时的DOM容器来解析HTML字符串
            //var parser = new DOMParser();
            var doc = new DOMParser().parseFromString(htmlString, "text/html");

            // 获取所有的img标签
            doc.querySelectorAll("img").forEach(function (img) {
              var altText = img.getAttribute("alt");

              // 检查alt属性是否包含百分数
              let match = altText.match(/(\d+)%/);
              if (altText && match) {
                img.style.width = match[1] + "%";
              }
            });

            // 返回处理后的HTML字符串
            return doc.body.innerHTML;
          })(
            extension === "md"
              ? marked.parse(content[1]) // 调用marked库处理 markdown 文件
              : extension === "js"
                ? (() => {
                    var fName = content[0].split(" ")[1].split("(")[0];
                    if (eval("typeof " + fName + ' !== "function"')) {
                      // 将js文件的代码加至document中
                      var script = document.createElement("script");
                      script.text = text;
                      document.body.appendChild(script);
                    }
                    return eval(fName + "()");
                  })()
                : content[1],
          ),
          footnote: content[2],
          lastModified: response.headers.get("Last-Modified"),
          file: file,
        };
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      document.getElementById("content").innerHTML =
        `<p style="color: red;">${error}</p>`;
      return {
        content: "<h1>Error</h1>\n<p>" + error.message + "</p>",
        firstLine: null,
        lastModified: null,
        footnote: null,
        file: file,
        error: error.message,
      };
    });
}

function loadText(fileContent) {
  // 标题显示
  document.getElementById("heading").innerHTML =
    "<h1>" +
    ((str) => {
      let r = str.split(".");
      return r[r.length - 2];
    })(decodeURIComponent(fileContent.file)) +
    "</h1>";
  document.getElementById("heading").innerHTML = ((text) => {
    // 先找到最后一个斜杠的位置
    const lastSlashIndex = text.lastIndexOf("/");
    const lastDotIndex = text.lastIndexOf(".");

    if (lastDotIndex != -1) {
      text = text.slice(0, lastDotIndex);
    }

    // 如果没有斜杠，返回原文本
    if (lastSlashIndex === -1) {
      return `<h1>${text}</h1>`;
    }

    // 获取最后一个斜杠之后的文本，并用 <h1> 包裹
    const lastPart = text.slice(lastSlashIndex + 1);
    const wrappedLastPart = `<h1>${lastPart}</h1>`;

    // 获取最后一个斜杠之前的文本，并用 <h5> 和 <br> 包裹
    const firstPart = text.slice(0, lastSlashIndex);
    const wrappedFirstPart = `<h4>/${firstPart}/</h4>`;

    // 返回拼接的结果
    return wrappedFirstPart + wrappedLastPart;
  })(decodeURIComponent(fileContent.file));
  // 内容
  if (fileContent.content !== undefined)
    document.getElementById("content").innerHTML = fileContent.content;
  document.title = fileContent.firstLine;
  // 脚注
  document.getElementById("footnote").innerHTML =
    (fileContent.footnote != null ? fileContent.footnote + "\n</br>" : "") +
    (fileContent.lastModified != null
      ? "本站最后提交于：" + fileContent.lastModified
      : "");
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

// 监听 hashchange 事件以动态加载新的 Markdown 文件
window.addEventListener("hashchange", async () => {
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
});

// 初次加载时调用
window.addEventListener("load", async () => {
  loadText(await parseFile(getHashParam()));
  const spacer = document.getElementById("anime-spacer");
  spacer.classList.add("shrinked");
});

// 平滑滚动到顶部
function scrollToTop() {
  document.body.scrollTo({
    left: 0,
    top: 0,
    behavior: "smooth",
  });
}

function toggleNextNextVis(self) {
  var content = self.nextElementSibling.nextElementSibling;

  if (!content.classList.contains("show")) {
    // 开始显示内容，添加类名 'show' 以触发动画
    content.style.display = "inline-block";
    setTimeout(function () {
      content.classList.add("show");
    }, 10);
    self.textContent = "显示更少";
  } else {
    // 删除类名 'show' 并设置过渡动画
    content.classList.remove("show");
    setTimeout(function () {
      content.style.display = "none"; // 在动画结束后设置 display: none
    }, 310);
    self.textContent = "显示全部";
  }
}

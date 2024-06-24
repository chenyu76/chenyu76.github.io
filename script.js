function parseFile(file) {
    return fetch(file)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load ' + file + ': ' + response.statusText);
            }
            return response.text().then(text => {
                const extension = file.split('.').pop();

                const content = ((str) => {
                    let firstLineEndIndex = str.indexOf('\n');
                    let firstLine = str.substring(0, firstLineEndIndex).trim();

                    // 检查第一行是否以 "# " 开头
                    if (str.startsWith("# ")) {
                        firstLine = str.substring(1, firstLineEndIndex).trim();
                        str = str.substring(firstLineEndIndex + 1);
                    }

                    // 从字符串末尾开始查找最后一个换行符
                    let lastIndex = str.length - 1;
                    while (lastIndex >= 0 && str[lastIndex] !== '\n') {
                        lastIndex--;
                    }
                    // 提取最后一行
                    const lastLine = str.substring(lastIndex + 1).trim();
                    // 检查最后一行的长度是否是日期
                    if (lastLine.length < 25
                        && ((lastLine.includes('月') && lastLine.includes('日'))
                            || ((lastLine.match(/\//g) || []).length === 2))) {
                        return [firstLine, str.substring(0, lastIndex).trim(), lastLine];
                    }
                    // 如果不满足条件，返回null
                    return [firstLine, str, null];
                })(text);

                return {
                    firstLine: content[0],
                    content: extension === 'md' ? marked.parse(content[1]) : content[1],
                    footnote: content[2],
                    lastModified: response.headers.get('Last-Modified'),
                    file: file
                };
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('content').innerHTML = `<p style="color: red;">${error}</p>`;
            return {
                content: '',
                firstLine: null,
                lastModified: null,
                footnote: null,
                file: file,
                error: error.message
            };
        });
}


function loadText(fileContent) {
    document.getElementById('heading').innerHTML = fileContent.firstLine != null ? "<h1>" + fileContent.firstLine + "</h1>" : "";
    document.getElementById('content').innerHTML = fileContent.content;
    document.title = fileContent.firstLine;
    document.getElementById('footnote').innerHTML = (fileContent.footnote != null ? fileContent.footnote + "\n</br>" : "")
        + (fileContent.lastModified != null ? "本站最后提交于：" + fileContent.lastModified : "");
}


// 获取当前的哈希值
function getHashParam() {
    return window.location.hash ? (function (str) { // 如果参数没有后缀就添加.md后缀
        if (str) {
            if (str.includes("."))
                return str;
            else
                return str + ".md";
        }
        return str;
    })(window.location.hash.substring(1)) : 'README.md';
}

// 监听 hashchange 事件以动态加载新的 Markdown 文件
window.addEventListener('hashchange', async () => {
    const spacer = document.getElementById('anime-spacer');
    scrollToTop();
    spacer.classList.add('expanded');

    // 开始处理文本内容
    var start = performance.now();
    var tt = await parseFile(getHashParam());
    var end = performance.now();

    // 等待动画结束
    setTimeout(() => {
        loadText(tt);
        setTimeout(() => {
            spacer.classList.remove('expanded');
        }, 20);
    }, ((a) => { return a > 0 ? a : 0; })(500 - (end - start)));
});


// 初次加载时调用
window.addEventListener('load', async () => {
    loadText(await parseFile(getHashParam()));
});

// 平滑滚动到顶部
function scrollToTop() {
    document.body.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
    })
}
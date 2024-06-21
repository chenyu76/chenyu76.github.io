function parseFile(file) {
    return fetch(file)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load ' + file + ': ' + response.statusText);
            }
            return response.text().then(text => {
                const extension = file.split('.').pop();

                return {
                    content: extension === 'md' ? marked.parse(text) : text,
                    lastModified: response.headers.get('Last-Modified'),
                    firstLine: text.split('\n')[0],
                    file: file
                };
            });
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('content').innerHTML = `<p style="color: red;">${error}</p>`;
            return {
                content: '',
                lastModified: null,
                file: file,
                error: error.message
            };
        });
}


function loadText(fileContent) {
    document.getElementById('content').innerHTML = fileContent.content;
    document.title = fileContent.firstLine.replace(/^# /, '');
    document.getElementById('footnote').innerHTML = 'lastModified' in fileContent ? "最后修改日期：" + fileContent.lastModified : "";
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
    var start = new Date().getTime()
    var tt = await parseFile(getHashParam());
    var end = new Date().getTime()

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
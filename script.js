function loadViewFile(file) {
    return new Promise((resolve, reject) => {
        fetch(file)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load ' + file + ': ' + response.statusText);
                }
                return response.text();
            })
            .then(text => {
                const extension = file.split('.').pop();
                if (extension === 'md') {
                    // 使用 marked 库将 Markdown 转换为 HTML 
                    document.getElementById('content').innerHTML = marked.parse(text);
                } else {
                    // 不是 markdown 就直接解析
                    document.getElementById('content').innerHTML = text;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('content').innerHTML = `<p style="color: red;">${error}</p>`;
            });
        resolve();// 加载完后再调用动画
    });
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
window.addEventListener('hashchange', () => {
    const spacer = document.getElementById('anime-spacer');
    scrollToTop();
    spacer.classList.add('expanded');
    setTimeout(() => {
        loadViewFile(getHashParam()).then(() => {
            spacer.classList.remove('expanded');
        });
    }, 450);
});

// 初次加载时调用
window.addEventListener('load', () => {
    loadViewFile(getHashParam());
});

// 平滑滚动到顶部
function scrollToTop() {
    document.body.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
    })
}
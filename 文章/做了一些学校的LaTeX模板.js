function 做了一些学校LaTeX模板() {
    info = "\n\
    \n\
    <a href=\"https://raw.githubusercontent.com/chenyu76/some-SZU-LaTeX-templates\" target=\"_blank\" title=\"仓库地址\"><i class=\"fa-brands fa-github\"></i>仓库地址</a>\n\
    \n\
    <p>以下是仓库的readme文件，通过js fetch 原封不动的搬过来了，虽然好像不是很兼容但是勉强能看，耶！</p>\n\
    \n\
    \n\
    "
    const url = 'https://raw.githubusercontent.com/chenyu76/some-SZU-LaTeX-templates/main/README.md';

    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('content').innerHTML = info + marked.parse(data);
        })
        .catch(error => {
            document.getElementById('content').innerHTML = 'Failed to load content: ' + error.message;
        });
}

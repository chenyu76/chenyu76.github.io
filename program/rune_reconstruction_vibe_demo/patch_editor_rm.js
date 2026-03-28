const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

// replace the dragging mousedown block
const oldMousedown = `    div.onmousedown = (e) => {
        if (e.target.classList.contains('port')) return;
        if (e.button === 2) { // 右键删除节点
            removeNode(inst);
            return;
        }
        const rect = editorCanvas.getBoundingClientRect();`;

const newMousedown = `    div.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation(); // prevent window context menu from interfering if any
        removeNode(inst);
    };

    div.onmousedown = (e) => {
        if (e.target.classList.contains('port')) return;
        if (e.button === 2) return; // handled by oncontextmenu
        const rect = editorCanvas.getBoundingClientRect();`;

content = content.replace(oldMousedown, newMousedown);
fs.writeFileSync('src/js/editor.js', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

const targetStr = `    drawing = { fromId: inst.instId, fromPort: portIdx, x: e.clientX, y: e.clientY, curX: e.clientX, curY: e.clientY };
    
    document.onmousemove = (me) => {
        drawing.curX = me.clientX;
        drawing.curY = me.clientY;
        renderConnections();
    };
    document.onmouseup = () => { drawing = null; document.onmousemove = null; renderConnections(); };`;

const replaceStr = `    const rect = editorCanvas.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / zoom;
    const startY = (e.clientY - rect.top) / zoom;
    drawing = { fromId: inst.instId, fromPort: portIdx, x: startX, y: startY, curX: startX, curY: startY };

    document.onmousemove = (me) => {
        const curRect = editorCanvas.getBoundingClientRect();
        drawing.curX = (me.clientX - curRect.left) / zoom;
        drawing.curY = (me.clientY - curRect.top) / zoom;
        renderConnections();
    };
    document.onmouseup = () => { drawing = null; document.onmousemove = null; renderConnections(); };`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/js/editor.js', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

// Patch node dragging logic
content = content.replace(
    /const ox = e\.clientX - div\.offsetLeft;\n        const oy = e\.clientY - div\.offsetTop;\n        document\.onmousemove = \(me\) => \{\n            inst\.x = me\.clientX - ox;\n            inst\.y = me\.clientY - oy;\n            div\.style\.left = inst\.x \+ 'px';\n            div\.style\.top = inst\.y \+ 'px';\n            renderConnections\(\);\n        \};\n        document\.onmouseup = \(\) => document\.onmousemove = null;/,
    `const rect = editorCanvas.getBoundingClientRect();
        const startMouseX = (e.clientX - rect.left) / zoom;
        const startMouseY = (e.clientY - rect.top) / zoom;
        const ox = startMouseX - inst.x;
        const oy = startMouseY - inst.y;

        document.onmousemove = (me) => {
            const currentMouseX = (me.clientX - rect.left) / zoom;
            const currentMouseY = (me.clientY - rect.top) / zoom;
            inst.x = currentMouseX - ox;
            inst.y = currentMouseY - oy;
            div.style.left = inst.x + 'px';
            div.style.top = inst.y + 'px';
            renderConnections();
        };
        document.onmouseup = () => document.onmousemove = null;`
);

// Patch drawing line logic
content = content.replace(
    /drawing = \{ fromId: inst\.instId, fromPort: portIdx, x: e\.clientX, y: e\.clientY, curX: e\.clientX, curY: e\.clientY \};\n\n    document\.onmousemove = \(me\) => \{\n        drawing\.curX = me\.clientX;\n        drawing\.curY = me\.clientY;\n        renderConnections\(\);\n    \};\n    document\.onmouseup = \(\) => \{ drawing = null; document\.onmousemove = null; renderConnections\(\); \};/,
    `const rect = editorCanvas.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / zoom;
    const startY = (e.clientY - rect.top) / zoom;
    drawing = { fromId: inst.instId, fromPort: portIdx, x: startX, y: startY, curX: startX, curY: startY };

    document.onmousemove = (me) => {
        const curRect = editorCanvas.getBoundingClientRect();
        drawing.curX = (me.clientX - curRect.left) / zoom;
        drawing.curY = (me.clientY - curRect.top) / zoom;
        renderConnections();
    };
    document.onmouseup = () => { drawing = null; document.onmousemove = null; renderConnections(); };`
);

// Also remove the explicit - 50 from drawCurve in drawing mode if it's there
content = content.replace(
    /drawCurve\(x1, y1, drawing\.curX, drawing\.curY - 50, varColor\('--accent'\), -1\);/,
    `drawCurve(x1, y1, drawing.curX, drawing.curY, '#00ff88', -1); // fixed hardcoded offset and color just in case`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

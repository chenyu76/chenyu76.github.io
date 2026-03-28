const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /function drawCurve\(x1, y1, x2, y2, color, connIdx\) \{[\s\S]*?svgLayer\.appendChild\(path\);\n\}/,
    `function drawCurve(x1, y1, x2, y2, color, connIdx) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = \\\`M \\\${x1} \\\${y1} C \\\${x1 + 60} \\\${y1}, \\\${x2 - 60} \\\${y2}, \\\${x2} \\\${y2}\\\`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.dataset.idx = connIdx;
    
    if (connIdx !== -1) {
        path.style.cursor = 'pointer';
        path.oncontextmenu = (e) => {
            e.preventDefault();
            state.conns.splice(connIdx, 1);
            renderConnections();
        };
        path.onmouseover = () => path.setAttribute('stroke', '#ff3366');
        path.onmouseout = () => path.setAttribute('stroke', color);
    }
    
    svgLayer.appendChild(path);
}`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /const editorMain = document\.getElementById\('editor-main'\);/,
    `const editorMain = document.getElementById('editor-main');
const editorCanvas = document.getElementById('editor-canvas');
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;

editorMain.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(0.2, zoom * zoomFactor), 3);
    
    // Zoom around mouse
    const rect = editorMain.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    
    zoom = newZoom;
    editorCanvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoom})\`;
});

editorMain.addEventListener('mousedown', (e) => {
    if (e.target === editorMain || e.target === editorCanvas || e.target.id === 'connections-svg') {
        isPanning = true;
    }
});
window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX += e.movementX;
        panY += e.movementY;
        editorCanvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${zoom})\`;
    }
});
window.addEventListener('mouseup', () => {
    isPanning = false;
});`
);

content = content.replace(
    /editorMain\.appendChild\(div\);/g,
    `editorCanvas.appendChild(div);`
);

content = content.replace(
    /editorMain\.getBoundingClientRect\(\)/g,
    `editorMain.getBoundingClientRect()`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

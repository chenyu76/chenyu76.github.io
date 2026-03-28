const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /drawCurve\(x1, y1, drawing\.curX, drawing\.curY, '#00ff88', -1\); \/\/ fixed hardcoded offset and color just in case/,
    `drawCurve(x1, y1, drawing.curX, drawing.curY, varColor('--accent'), -1);`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

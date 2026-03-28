const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /path\.style\.cursor = 'pointer';/,
    `path.style.cursor = 'pointer';\n        path.style.pointerEvents = 'auto';`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

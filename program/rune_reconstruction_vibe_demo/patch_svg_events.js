const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /path\.oncontextmenu = \(e\) => \{\n\s*e\.preventDefault\(\);\n\s*state\.conns\.splice\(connIdx, 1\);\n\s*renderConnections\(\);\n\s*\};\n\s*path\.onmouseover = \(\) => path\.setAttribute\('stroke', '#ff3366'\);\n\s*path\.onmouseout = \(\) => path\.setAttribute\('stroke', color\);/,
    `path.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.conns.splice(connIdx, 1);
            renderConnections();
        });
        path.addEventListener('mouseover', () => {
            path.setAttribute('stroke', '#ff3366');
            path.setAttribute('stroke-width', '6');
        });
        path.addEventListener('mouseout', () => {
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '3');
        });`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

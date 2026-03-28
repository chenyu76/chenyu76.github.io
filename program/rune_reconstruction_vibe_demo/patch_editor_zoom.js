const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(
    /<div id="editor-main" style="width: calc\(100% - 250px\);">\s*<svg id="connections-svg"><\/svg>\s*<\/div>/,
    `<div id="editor-main" style="width: calc(100% - 250px); overflow: hidden; position: relative; background-color: #222;">
                <div id="editor-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 0 0;">
                    <svg id="connections-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;"></svg>
                </div>
            </div>`
);

fs.writeFileSync('index.html', html, 'utf8');

let css = fs.readFileSync('src/css/style.css', 'utf8');
css = css.replace(
    /#editor-main \{ flex-grow: 1; position: relative; overflow: hidden; background-image: \s*radial-gradient\(circle, #222 1px, transparent 1px\); background-size: 40px 40px; \}/,
    `#editor-main { flex-grow: 1; position: relative; overflow: hidden; background-color: var(--panel-bg); }
#editor-canvas { width: 4000px; height: 4000px; position: absolute; transform-origin: 0 0; background-image: radial-gradient(circle, #444 1px, transparent 1px); background-size: 40px 40px; }`
);
fs.writeFileSync('src/css/style.css', css, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

content = content.replace(
    /<div id="editor-main">/,
    `<div id="inventory-panel" style="position: absolute; right: 0; top: 71px; width: 250px; height: calc(100% - 71px); background: #111; border-left: 1px solid #333; overflow-y: auto; z-index: 60; padding: 10px;">
                <div style="color: var(--accent); font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 5px;">节点储存库 / NODE REPOSITORY</div>
                <div id="inventory-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
            </div>
            <div id="editor-main" style="width: calc(100% - 250px);">`
);

fs.writeFileSync('index.html', content, 'utf8');

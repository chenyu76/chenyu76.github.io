const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

// Fix drawCurve
content = content.replace(
    /function drawCurve\(x1, y1, x2, y2, color, idx\) \{[\s\S]*?\}/,
    `function drawCurve(x1, y1, x2, y2, color, idx) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const ctrl1X = x1 + 50;
    const ctrl2X = x2 - 50;
    const d = \`M \${x1} \${y1} C \${ctrl1X} \${y1}, \${ctrl2X} \${y2}, \${x2} \${y2}\`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.dataset.idx = idx;
    
    // allow deleting lines with right click
    path.style.cursor = 'pointer';
    path.oncontextmenu = (e) => {
        e.preventDefault();
        state.conns.splice(idx, 1);
        renderConnections();
    };

    svgLayer.appendChild(path);
}`
);

// Add removeNode and inventory logic
content = content.replace(
    /export function removeNode\(inst\) \{/,
    `export function removeNode(inst) {
    // move to inventory
    state.inventory.push(inst);
    renderInventory();
    
    // then continue with cleanup`
);

content += `\n
export function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.inventory.forEach((inst, idx) => {
        const div = document.createElement('div');
        div.style.background = '#1a1a24';
        div.style.border = '1px solid #444';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.2s';
        
        div.innerHTML = \`<div style="font-size: 11px; color: \${inst.type === 'TRIGGER' ? '#00ff88' : inst.type === 'OPERATOR' ? '#ffcc00' : '#ff3366'}">\${inst.type}</div>
                       <div style="font-weight: bold; margin-top: 5px;">\${inst.name}</div>\`;
        
        div.onmouseover = () => div.style.borderColor = 'var(--accent)';
        div.onmouseout = () => div.style.borderColor = '#444';
        
        div.onclick = () => {
            // Restore from inventory
            state.inventory.splice(idx, 1);
            
            // Place at center of screen loosely
            inst.x = 200 + Math.random() * 100;
            inst.y = 200 + Math.random() * 100;
            
            state.nodes.push(inst);
            createNodeUI(inst);
            renderInventory();
        };
        
        list.appendChild(div);
    });
}
`;

fs.writeFileSync('src/js/editor.js', content, 'utf8');

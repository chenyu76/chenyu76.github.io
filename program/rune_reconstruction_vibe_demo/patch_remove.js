const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /function removeNode\(inst\) \{/,
    `function removeNode(inst) {
    if (inst.id === 'n_self') return; // Cannot delete self node
    if (!state.inventory) state.inventory = [];
    state.inventory.push(inst);
    renderInventory();
`
);

content = content.replace(
    /export function openEditor\(\) \{/,
    `export function openEditor() {
    renderInventory();
`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

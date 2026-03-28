const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

content = content.replace(
    /let connectsToSelf = false;\n\s*const effectOuts = state\.conns\.filter\(c => c\.fromId === currNode\.instId\);\n\s*effectOuts\.forEach\(c => \{\n\s*const n = state\.nodes\.find\(node => node\.instId === c\.toId\);\n\s*if \(n && n\.id === 'n_self'\) connectsToSelf = true;\n\s*\}\);\n\s*activeSpells\.push\(\{ \.\.\.currentContext, connectsToSelf \}\);/,
    `let connectsToSelf = false;
                const effectOuts = state.conns.filter(c => c.fromId === currNode.instId);
                effectOuts.forEach(c => {
                    const n = state.nodes.find(node => node.instId === c.toId);
                    if (n && n.id === 'n_self') connectsToSelf = true;
                });
                
                if (!connectsToSelf) continue;
                
                activeSpells.push({ ...currentContext, connectsToSelf });`
);

fs.writeFileSync('src/js/logic.js', content, 'utf8');

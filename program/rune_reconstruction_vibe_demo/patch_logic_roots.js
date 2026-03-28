const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

content = content.replace(
    /const selfNodes = state\.nodes\.filter\(n => n\.id === 'n_self'\);\s+selfNodes\.forEach\(startNode => \{[\s\S]*?\}\);/g,
    `const triggers = state.nodes.filter(n => n.id === eventType && n.type === 'TRIGGER');
    triggers.forEach(startNode => {
        let emitPorts = Array.from({length: startNode.out}, (_, idx) => idx);
        emitPorts.forEach(portNum => {
            const outgoing = state.conns.filter(c => c.fromId === startNode.instId && c.fromPort === portNum);
            outgoing.forEach(conn => {
                const nextNode = state.nodes.find(n => n.instId === conn.toId);
                if (nextNode) {
                    traverse(nextNode, conn.toPort, { 
                        entity: entity,
                        dmg: entity.damage || 15, 
                        mult: 1.2, 
                        recur: 1, 
                        split: 1, 
                        area: 1.0, 
                        speed: 1.0, 
                        autoAim: false, 
                        isNova: false,
                        isCrit: false,
                        gravity: false,
                        effect: null,
                        ...extraContext
                    }, 0);
                }
            });
        });
    });`
);

fs.writeFileSync('src/js/logic.js', content, 'utf8');

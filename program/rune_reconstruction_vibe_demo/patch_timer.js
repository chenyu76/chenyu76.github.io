const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

// Replace the traverse start logic
content = content.replace(
    /const triggers = state\.nodes\.filter\(n => n\.id === eventType && n\.type === 'TRIGGER'\);\n    triggers\.forEach\(startNode => \{[\s\S]*?    \}\);\n\n    function traverse/g,
    `const triggers = state.nodes.filter(n => n.id === eventType && n.type === 'TRIGGER');
    triggers.forEach(startNode => {
        // --- 触发器门控 (Moved from traverse) ---
        if (startNode.id === 't_pulsar') {
            if (entity.timers[startNode.instId] === undefined) {
                entity.timers[startNode.instId] = entity.type === 'player' ? 0 : Date.now();
            }
            const lastFire = entity.timers[startNode.instId];
            const minInterval = 600 * (extraContext.speed || 1.0); // Rough estimate
            if (Date.now() - lastFire < minInterval) return; // Not ready
            entity.timers[startNode.instId] = Date.now();
        } else if (startNode.id === 't_time') {
            if (entity.timers[startNode.instId] === undefined) {
                entity.timers[startNode.instId] = entity.type === 'player' ? 0 : Date.now();
            }
            const lastTime = entity.timers[startNode.instId];
            if (Date.now() - lastTime < 3000) return;
            entity.timers[startNode.instId] = Date.now();
            extraContext.dmg = (extraContext.dmg || 15) * 3; // Built-in strong buff
        }
        
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
    });

    function traverse`
);

// Remove the trigger check inside traverse
content = content.replace(
    /        \/\/ --- 触发器门控 ---\n        if \(currNode\.type === 'TRIGGER'\) \{[\s\S]*?\}\n\n        \/\/ 1\. 基础算子/,
    `        // 1. 基础算子`
);

fs.writeFileSync('src/js/logic.js', content, 'utf8');

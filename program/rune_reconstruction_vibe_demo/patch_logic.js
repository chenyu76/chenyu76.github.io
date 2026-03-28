const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

content = content.replace(
    /if \(currNode\.id === 't_pulsar'\) \{([\s\S]*?)\}/,
    `if (currNode.id === 't_pulsar') {
                if (context.entity.timers[currNode.instId] === undefined) {
                    // For player (id starts with 'player'), fire immediately. For others, wait.
                    context.entity.timers[currNode.instId] = context.entity.type === 'player' ? 0 : Date.now();
                }
                const lastFire = context.entity.timers[currNode.instId];
                const minInterval = 600 * context.speed;
                if (Date.now() - lastFire < minInterval) return; // Not ready
                context.entity.timers[currNode.instId] = Date.now();
            }`
);

content = content.replace(
    /else if \(currNode\.id === 't_time'\) \{([\s\S]*?)\}/,
    `else if (currNode.id === 't_time') {
                if (context.entity.timers[currNode.instId] === undefined) {
                    context.entity.timers[currNode.instId] = context.entity.type === 'player' ? 0 : Date.now();
                }
                const lastTime = context.entity.timers[currNode.instId];
                if (Date.now() - lastTime < 3000) return;
                context.entity.timers[currNode.instId] = Date.now();
                context.dmg *= 3; // Built-in strong buff
            }`
);

fs.writeFileSync('src/js/logic.js', content, 'utf8');

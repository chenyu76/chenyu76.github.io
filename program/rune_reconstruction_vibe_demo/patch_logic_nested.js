const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

// The block to replace:
const targetStr = `            // --- 效果节点终止与实体生成 ---
            if (currNode.type === 'EFFECT') {
                currentContext.effect = currNode.id;
                currentContext.finalDmg = currentContext.dmg * Math.pow(currentContext.mult, currentContext.recur);
                
                // Add to spells payload to be fired by game.js
                // But wait! We need to know if this effect connects to n_self.
                let connectsToSelf = false;
                const effectOuts = state.conns.filter(c => c.fromId === currNode.instId);
                effectOuts.forEach(c => {
                    const n = state.nodes.find(node => node.instId === c.toId);
                    if (n && n.id === 'n_self') connectsToSelf = true;
                });
                
                if (!connectsToSelf) continue;
                
                activeSpells.push({ ...currentContext, connectsToSelf });
                continue; // Do not traverse further from Effect here, it's terminal for the signal. The new Entity will evaluate its own logic.
            }`;

const replaceStr = `            // --- 效果节点累积并继续遍历 ---
            if (currNode.type === 'EFFECT') {
                currentContext.payloads = [...(currentContext.payloads || [])];
                currentContext.payloads.push({
                    effect: currNode.id,
                    finalDmg: currentContext.dmg * Math.pow(currentContext.mult, currentContext.recur),
                    speed: currentContext.speed,
                    split: currentContext.split,
                    area: currentContext.area,
                    isCrit: currentContext.isCrit,
                    isNova: currentContext.isNova,
                    gravity: currentContext.gravity,
                    autoAim: currentContext.autoAim
                });
                // NO 'continue' here, it allows the signal to proceed to the next node!
            }
            
            if (currNode.id === 'n_self') {
                if (currentContext.payloads && currentContext.payloads.length > 0) {
                    let payloads = [...currentContext.payloads];
                    let activePayload = payloads.pop(); // The innermost effect
                    activeSpells.push({
                        ...currentContext,
                        ...activePayload,
                        payloads: payloads,
                        connectsToSelf: true
                    });
                }
                continue; // End this branch of traversal (reaches terminal n_self)
            }`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/js/logic.js', content, 'utf8');

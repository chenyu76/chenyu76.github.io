const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

const targetStr = `            // GC
            state.entities = state.entities.filter(e => (e.life > 0 && e.hp > 0) || e.type === 'player');`;

const replaceStr = `            // Payload On-Death Triggers
            state.entities.forEach(e => {
                if (!e.isDead && (e.hp <= 0 || e.life <= 0) && e.type !== 'player') {
                    e.isDead = true;
                    if (e.payloads && e.payloads.length > 0) {
                        const nextPayloads = [...e.payloads];
                        const activePayload = nextPayloads.pop();
                        
                        const spell = {
                            ...e, 
                            ...activePayload,
                            payloads: nextPayloads,
                            connectsToSelf: e.isSelf
                        };
                        
                        // Slightly randomize angle if there's no inherent autoAim or split?
                        // Actually fireSpells handles angle distribution if split > 1
                        fireSpells([spell], e);
                    }
                }
            });

            // GC
            state.entities = state.entities.filter(e => (e.life > 0 && e.hp > 0) || e.type === 'player');`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync('src/js/game.js', content, 'utf8');

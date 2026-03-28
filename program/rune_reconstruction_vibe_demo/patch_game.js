const fs = require('fs');

let content = fs.readFileSync('src/js/game.js', 'utf8');

// replace logic import
content = content.replace("import { resolveLogic } from './logic.js';", "import { resolveEntityEvent } from './logic.js';\nimport { Entity } from './state.js';");

// refactor fireSpells
content = content.replace(/function fireSpells\(spells, originX, originY\) \{[\s\S]*?\n\}/, `function fireSpells(spells, entity) {
    spells.forEach(s => {
        let targetAngle = null;
        if (s.autoAim) {
            let nearest = null, minDist = Infinity;
            state.entities.forEach(e => {
                if (e.team !== entity.team && e.hp > 0 && e.type !== 'bullet' && e.type !== 'mine' && e.type !== 'orb') {
                    const d = Math.hypot(e.x - entity.x, e.y - entity.y);
                    if (d < minDist) { minDist = d; nearest = e; }
                }
            });
            if (nearest) targetAngle = Math.atan2(nearest.y - entity.y, nearest.x - entity.x);
        }

        for (let i = 0; i < s.split; i++) {
            const angle = targetAngle !== null 
                ? targetAngle + (Math.random() - 0.5) * 0.2 
                : (Math.PI * 2 / s.split) * i + state.frame * 0.05;
            
            let newEnt = null;

            if (s.effect === 'e_orb') {
                newEnt = new Entity({ 
                    type: 'orb', team: entity.team, x: entity.x, y: entity.y, angle: angle, dist: 50 + Math.random() * 50,
                    damage: s.finalDmg, color: '#00f2ff', life: 200, isCrit: s.isCrit, isNova: s.isNova, area: s.area, gravity: s.gravity, isSelf: s.connectsToSelf
                });
            } else if (s.effect === 'e_tp') {
                entity.x += Math.cos(angle) * 150;
                entity.y += Math.sin(angle) * 150;
                newEnt = new Entity({ type: 'flash', team: entity.team, x: entity.x, y: entity.y, damage: 0, life: 10, color: '#fff', isNova: true, area: 1 });
            } else if (s.effect === 'e_mine') {
                newEnt = new Entity({ 
                    type: 'mine', team: entity.team, x: entity.x, y: entity.y, vx: 0, vy: 0,
                    damage: s.finalDmg * 2, color: '#ff3300', life: 150, isCrit: s.isCrit, isNova: true, area: s.area * 1.5, gravity: s.gravity, isSelf: s.connectsToSelf
                });
            } else if (s.effect === 'e_blackhole') {
                newEnt = new Entity({ 
                    type: 'blackhole', team: entity.team, x: entity.x + Math.cos(angle) * 150, y: entity.y + Math.sin(angle) * 150, vx: 0, vy: 0,
                    damage: s.finalDmg * 0.1, color: '#330066', life: 100, isCrit: s.isCrit, isNova: true, area: s.area * 3.0, gravity: true, isSelf: s.connectsToSelf
                });
            } else if (s.effect === 'e_laser') {
                state.entities.forEach(e => {
                    if (e.team !== entity.team && e.hp > 0 && e.type !== 'bullet') {
                        const ex = e.x - entity.x, ey = e.y - entity.y;
                        const cross = Math.abs(ex * Math.sin(angle) - ey * Math.cos(angle));
                        const dot = ex * Math.cos(angle) + ey * Math.sin(angle);
                        if (cross < 20 && dot > 0 && dot < 800) {
                            e.hp -= s.finalDmg;
                            popDmg(e.x, e.y, s.finalDmg, s.isCrit);
                        }
                    }
                });
                newEnt = new Entity({ 
                    type: 'laser', team: entity.team, x: entity.x, y: entity.y, angle: angle,
                    damage: 0, color: s.isCrit ? '#ff0' : '#00f2ff', life: 10, gravity: false, isSelf: s.connectsToSelf
                });
            } else {
                newEnt = new Entity({ 
                    type: 'bullet', team: entity.team, x: entity.x, y: entity.y, 
                    vx: Math.cos(angle) * 8 * s.speed, vy: Math.sin(angle) * 8 * s.speed, 
                    damage: s.finalDmg, color: s.isCrit ? '#ff0' : getDmgColor(s.finalDmg), 
                    life: 80, isCrit: s.isCrit, isNova: s.isNova, area: s.area, gravity: s.gravity, isSelf: s.connectsToSelf
                });
            }

            if (newEnt) {
                // If the new entity isSelf, we need to associate it with its parent's owner maybe? Or just its own position
                state.entities.push(newEnt);
            }
        }
    });
}`);

fs.writeFileSync('src/js/game.js', content, 'utf8');

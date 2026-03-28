const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /type: 'orb', team: entity\.team, x: entity\.x, y: entity\.y, angle: angle, dist: 50 \+ Math\.random\(\) \* 50,/,
    `type: 'orb', team: entity.team, x: entity.x, y: entity.y, angle: angle, dist: 50 + Math.random() * 50, targetId: entity.id, centerX: entity.x, centerY: entity.y,`
);

content = content.replace(
    /if \(e\.type === 'orb'\) \{\n\s*e\.angle \+= 0\.1;\n\s*const p = state\.entities\.find\(p => p\.type === 'player'\);\n\s*if \(p\) \{\n\s*e\.x = p\.x \+ Math\.cos\(e\.angle\) \* e\.dist;\n\s*e\.y = p\.y \+ Math\.sin\(e\.angle\) \* e\.dist;\n\s*\}\n\s*\}/,
    `if (e.type === 'orb') {
                    e.angle += 0.1;
                    let p = state.entities.find(p => p.id === e.targetId);
                    if (!p) p = { x: e.centerX, y: e.centerY }; // fallback to spawn position if parent is dead
                    else { e.centerX = p.x; e.centerY = p.y; } // update center to track living parent
                    
                    e.x = p.x + Math.cos(e.angle) * e.dist;
                    e.y = p.y + Math.sin(e.angle) * e.dist;
                }`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

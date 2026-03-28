const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

const newLoop = `
function takeDamage(amt, entity) {
    if (entity.hp <= 0) return;
    entity.hp -= amt;
    const hitSpells = resolveEntityEvent(entity, 't_hit');
    if (hitSpells.length) fireSpells(hitSpells, entity);

    if (entity.hp <= 0) {
        if (entity.type === 'player' && !state.debug.isInvincible) gameOver();
        else {
            const deathSpells = resolveEntityEvent(entity, 't_death');
            if (deathSpells.length) fireSpells(deathSpells, entity);
            if (entity.team !== 0) {
                const player = state.entities.find(e => e.type === 'player');
                if (player) {
                    player.exp += 20;
                    if (player.exp >= player.nextExp) levelUp(player);
                }
            }
        }
    }
}

function gameOver() {
    state.isPaused = true;
    alert("架构崩溃：逻辑回路已过载。系统尝试重启中...");
    location.reload();
}

function levelUp(player) {
    player.lv++;
    player.exp = 0;
    player.nextExp *= 1.3;
    state.isPaused = true;
    
    const panel = document.getElementById('choice-panel');
    const list = document.getElementById('choice-list');
    list.innerHTML = '';
    panel.style.display = 'flex';

    // RUNE_LIB is imported
    const pool = [...RUNE_LIB].sort(() => 0.5 - Math.random()).slice(0, 3);
    pool.forEach(proto => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = \`
            <div class="card-type">\${proto.type}</div>
            <h3>\${proto.name}</h3>
            <p>\${proto.desc}</p>
        \`;
        card.onclick = () => {
            const inst = { 
                ...proto, 
                instId: Math.random().toString(36).substr(2, 9), 
                x: 100 + Math.random() * 200, 
                y: 100 + Math.random() * 200 
            };
            state.nodes.push(inst);
            createNodeUI(inst);
            panel.style.display = 'none';
            openEditor();
        };
        list.appendChild(card);
    });
}

function spawnEnemy() {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    const a = Math.random() * Math.PI * 2;
    state.entities.push(new Entity({ 
        type: 'enemy', team: 1, 
        x: player.x + Math.cos(a) * 600, 
        y: player.y + Math.sin(a) * 600, 
        hp: 25 * Math.pow(1.3, player.lv), maxHp: 25 * Math.pow(1.3, player.lv),
        radius: 15, color: '#ff3366', damage: 0.5
    }));
}

export function init() {
    INITIAL_NODES.forEach(n => {
        const proto = RUNE_LIB[n.protoIdx];
        const inst = { ...proto, instId: n.instId, x: n.x, y: n.y };
        state.nodes.push(inst);
        createNodeUI(inst);
    });
    
    INITIAL_CONNS.forEach(c => state.conns.push({ ...c }));

    document.getElementById('btn-close').onclick = () => {
        document.getElementById('node-editor').style.display = 'none';
        state.isPaused = false;
    };

    const keys = {};
    window.onkeydown = (e) => keys[e.key.toLowerCase()] = true;
    window.onkeyup = (e) => keys[e.key.toLowerCase()] = false;

    function loop() {
        if (!state.isPaused) {
            state.frame++;
            
            // Generate Events for ALL entities
            for (let i = 0; i < state.entities.length; i++) {
                let e = state.entities[i];
                if (e.hp <= 0 && e.life <= 0) continue; // Dead
                
                // Input processing for player
                if (e.type === 'player') {
                    if (keys.w) e.y -= 4; if (keys.s) e.y += 4;
                    if (keys.a) e.x -= 4; if (keys.d) e.x += 4;
                }

                // Update basic movement
                if (e.type === 'orb') {
                    e.angle += 0.1;
                    const p = state.entities.find(p => p.type === 'player');
                    if (p) {
                        e.x = p.x + Math.cos(e.angle) * e.dist;
                        e.y = p.y + Math.sin(e.angle) * e.dist;
                    }
                } else if (e.type === 'enemy') {
                    const p = state.entities.find(p => p.type === 'player');
                    if (p) {
                        const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx*dx + dy*dy);
                        if (d > 0) { e.x += (dx/d)*2; e.y += (dy/d)*2; }
                    }
                } else if (e.type !== 'laser' && e.type !== 'flash' && e.type !== 'mine' && e.type !== 'blackhole' && e.type !== 'player') {
                    e.x += e.vx; e.y += e.vy;
                }
                
                // Track move event
                const distMoved = Math.hypot(e.x - e.lastX, e.y - e.lastY);
                if (distMoved > 0) {
                    e.moveAccumulator += distMoved;
                    if (e.moveAccumulator > 100) {
                        e.moveAccumulator -= 100;
                        const moveSpells = resolveEntityEvent(e, 't_move');
                        if (moveSpells.length) fireSpells(moveSpells, e);
                    }
                }
                e.lastX = e.x; e.lastY = e.y;

                // Pulsar and Time events
                const pulsarSpells = resolveEntityEvent(e, 't_pulsar');
                if (pulsarSpells.length) fireSpells(pulsarSpells, e);
                
                const timeSpells = resolveEntityEvent(e, 't_time');
                if (timeSpells.length) fireSpells(timeSpells, e);

                // Life drain
                if (e.life !== Infinity) {
                    e.life--;
                    if (e.life <= 0) e.hp = 0; // mark for GC
                }
            }

            // Collisions
            for (let i = 0; i < state.entities.length; i++) {
                let a = state.entities[i];
                if (a.hp <= 0 && a.life <= 0) continue;
                
                for (let j = i + 1; j < state.entities.length; j++) {
                    let b = state.entities[j];
                    if (b.hp <= 0 && b.life <= 0) continue;
                    
                    if (a.team !== b.team) {
                        // Gravity attraction
                        if (a.gravity && b.type === 'enemy') {
                            const gd = Math.hypot(a.x - b.x, a.y - b.y);
                            if (gd > 0 && gd < 200) { b.x += (a.x - b.x)/gd * 3; b.y += (a.y - b.y)/gd * 3; }
                        }
                        if (b.gravity && a.type === 'enemy') {
                            const gd = Math.hypot(b.x - a.x, b.y - a.y);
                            if (gd > 0 && gd < 200) { a.x += (b.x - a.x)/gd * 3; a.y += (b.y - a.y)/gd * 3; }
                        }

                        // Physical Hit
                        if (a.type !== 'laser' && a.type !== 'flash' && b.type !== 'laser' && b.type !== 'flash') {
                            let collisionDist = a.radius + b.radius;
                            if (a.isNova) collisionDist += a.area * 20;
                            if (b.isNova) collisionDist += b.area * 20;
                            
                            if (Math.hypot(a.x - b.x, a.y - b.y) < collisionDist) {
                                if (a.damage > 0 && b.hp > 0 && b.type !== 'bullet' && b.type !== 'orb') {
                                    takeDamage(a.damage, b);
                                    popDmg(b.x, b.y, a.damage, a.isCrit);
                                    if (a.type === 'mine') { a.area *= 2; a.damage = 0; a.life = 10; }
                                    else if (a.type !== 'orb' && !a.isNova && a.type !== 'blackhole') a.life = 0;
                                }
                                if (b.damage > 0 && a.hp > 0 && a.type !== 'bullet' && a.type !== 'orb') {
                                    takeDamage(b.damage, a);
                                    popDmg(a.x, a.y, b.damage, b.isCrit);
                                    if (b.type === 'mine') { b.area *= 2; b.damage = 0; b.life = 10; }
                                    else if (b.type !== 'orb' && !b.isNova && b.type !== 'blackhole') b.life = 0;
                                }
                            }
                        }
                    }
                }
            }

            // GC
            state.entities = state.entities.filter(e => (e.life > 0 && e.hp > 0) || e.type === 'player');
            
            if (state.frame % 50 === 0) spawnEnemy();
        }

        // Render
        ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        state.entities.forEach(b => { 
            if (b.type === 'laser') {
                ctx.strokeStyle = b.color; ctx.lineWidth = b.isCrit ? 6 : 3;
                ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(b.angle) * 1000, b.y + Math.sin(b.angle) * 1000); ctx.stroke();
            } else if (b.type === 'flash') {
                ctx.fillStyle = \`rgba(255, 255, 255, \${b.life / 10})\`;
                ctx.beginPath(); ctx.arc(b.x, b.y, 30, 0, Math.PI * 2); ctx.fill();
            } else if (b.type === 'player') {
                ctx.fillStyle = varColor('--accent'); ctx.beginPath(); ctx.arc(b.x, b.y, 15, 0, Math.PI * 2); ctx.fill();
            } else if (b.type === 'enemy') {
                ctx.fillStyle = b.color; ctx.fillRect(b.x - 15, b.y - 15, 30, 30);
            } else {
                ctx.fillStyle = b.color; ctx.beginPath(); 
                let radius = b.type === 'orb' ? 8 : (b.isNova ? 12 : 6);
                if (b.type === 'mine') radius = 15;
                if (b.type === 'blackhole') radius = 25;
                if (b.isNova) radius += b.area * 5;
                ctx.arc(b.x, b.y, radius, 0, Math.PI * 2); ctx.fill(); 
                if (b.isCrit) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
            }
        });

        // UI
        const p = state.entities.find(e => e.type === 'player');
        if (p) {
            document.getElementById('txt-lv').innerText = p.lv;
            document.getElementById('exp-bar').style.width = (p.exp / p.nextExp * 100) + '%';
            document.getElementById('hp-bar').style.width = Math.max(0, (p.hp / p.maxHp * 100)) + '%';
            
            const spells = resolveEntityEvent(p, 't_pulsar');
            const maxDmg = spells.length ? Math.max(...spells.map(s => s.finalDmg)) : 0;
            document.getElementById('txt-dmg').innerText = format(maxDmg);
        }

        requestAnimationFrame(loop);
    }
    loop();
}
`;

// Replace everything after fireSpells with the new logic
content = content.replace(/function takeDamage\(amt\) \{[\s\S]*/, newLoop);
fs.writeFileSync('src/js/game.js', content, 'utf8');

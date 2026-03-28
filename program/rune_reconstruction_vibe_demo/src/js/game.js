import { state } from './state.js';
import { RUNE_LIB, INITIAL_NODES, INITIAL_CONNS } from './config.js';
import { format, getDmgColor, varColor, popDmg } from './utils.js';
import { resolveEntityEvent, resolveEntityMoveMode } from './logic.js';
import { Entity } from './state.js';
import { createNodeUI, openEditor } from './editor.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

const inputState = {
    keys: {},
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
};

window.addEventListener('mousemove', (e) => {
    inputState.mouse.x = e.clientX;
    inputState.mouse.y = e.clientY;
});

function findNearestHostile(entity) {
    let nearest = null;
    let minDist = Infinity;
    state.entities.forEach(e => {
        if (e.team !== entity.team && e.hp > 0 && e.type !== 'flash' && e.type !== 'laser') {
            const d = Math.hypot(e.x - entity.x, e.y - entity.y);
            if (d < minDist) { minDist = d; nearest = e; }
        }
    });
    return nearest;
}

function applyMoveMode(entity) {
    const mode = entity.moveMode || 'ballistic';
    const speed = entity.moveSpeed || (entity.type === 'player' ? 4 : 8);

    if (mode === 'wasd') {
        let dx = 0;
        let dy = 0;
        if (inputState.keys.w || inputState.keys.arrowup) dy -= 1;
        if (inputState.keys.s || inputState.keys.arrowdown) dy += 1;
        if (inputState.keys.a || inputState.keys.arrowleft) dx -= 1;
        if (inputState.keys.d || inputState.keys.arrowright) dx += 1;
        const len = Math.hypot(dx, dy) || 1;
        if (dx !== 0 || dy !== 0) {
            entity.x += (dx / len) * speed;
            entity.y += (dy / len) * speed;
        }
        return;
    }

    if (mode === 'mouse') {
        const dx = inputState.mouse.x - entity.x;
        const dy = inputState.mouse.y - entity.y;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
            entity.x += (dx / d) * speed;
            entity.y += (dy / d) * speed;
        }
        return;
    }

    if (mode === 'homing') {
        const t = findNearestHostile(entity);
        if (t) {
            const dx = t.x - entity.x;
            const dy = t.y - entity.y;
            const d = Math.hypot(dx, dy);
            if (d > 1) {
                entity.x += (dx / d) * speed;
                entity.y += (dy / d) * speed;
                return;
            }
        }
    }

    // ballistic/default
    entity.x += entity.vx || 0;
    entity.y += entity.vy || 0;
}

function getLaunchTargetAngleFromMoveMode(moveMode, caster) {
    if (moveMode === 'homing') {
        const nearest = findNearestHostile(caster);
        if (nearest) return Math.atan2(nearest.y - caster.y, nearest.x - caster.x);
    }
    if (moveMode === 'mouse') {
        return Math.atan2(inputState.mouse.y - caster.y, inputState.mouse.x - caster.x);
    }
    if (moveMode === 'wasd') {
        let dx = 0;
        let dy = 0;
        if (inputState.keys.w || inputState.keys.arrowup) dy -= 1;
        if (inputState.keys.s || inputState.keys.arrowdown) dy += 1;
        if (inputState.keys.a || inputState.keys.arrowleft) dx -= 1;
        if (inputState.keys.d || inputState.keys.arrowright) dx += 1;
        if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
    }
    return null;
}

// 全局右键禁用
window.oncontextmenu = (e) => {
    e.preventDefault();
    return false;
};

/** 发射逻辑封装 **/
function fireSpells(spells, entity) {
    spells.forEach(s => {
        const moveMode = s.moveMode || 'ballistic';
        let targetAngle = getLaunchTargetAngleFromMoveMode(moveMode, entity);

        for (let i = 0; i < s.split; i++) {
            const angle = targetAngle !== null
                ? targetAngle + (Math.random() - 0.5) * 0.2
                : (Math.PI * 2 / s.split) * i + state.frame * 0.05;

            let newEnt = null;

            if (s.effect === 'e_orb') {
                newEnt = new Entity({
                    type: 'orb', team: entity.team, x: entity.x, y: entity.y, angle: angle, dist: 50 + Math.random() * 50, targetId: entity.id, centerX: entity.x, centerY: entity.y,
                    damage: s.finalDmg, color: '#00f2ff', life: 200, isCrit: s.isCrit, isNova: s.isNova, area: s.area, gravity: s.gravity, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic'
                });
            } else if (s.effect === 'e_tp') {
                entity.x += Math.cos(angle) * 150;
                entity.y += Math.sin(angle) * 150;
                newEnt = new Entity({ type: 'flash', team: entity.team, x: entity.x, y: entity.y, damage: 0, life: 10, color: '#fff', isNova: true, area: 1, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic' });
            } else if (s.effect === 'e_mine') {
                newEnt = new Entity({
                    type: 'mine', team: entity.team, x: entity.x, y: entity.y, vx: 0, vy: 0,
                    damage: s.finalDmg * 2, color: '#ff3300', life: 150, isCrit: s.isCrit, isNova: true, area: s.area * 1.5, gravity: s.gravity, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic'
                });
            } else if (s.effect === 'e_blackhole') {
                newEnt = new Entity({
                    type: 'blackhole', team: entity.team, x: entity.x + Math.cos(angle) * 150, y: entity.y + Math.sin(angle) * 150, vx: 0, vy: 0,
                    damage: s.finalDmg * 0.1, color: '#330066', life: 100, isCrit: s.isCrit, isNova: true, area: s.area * 3.0, gravity: true, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic'
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
                    damage: 0, color: s.isCrit ? '#ff0' : '#00f2ff', life: 10, gravity: false, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic'
                });
            } else {
                newEnt = new Entity({
                    type: 'bullet', team: entity.team, x: entity.x, y: entity.y,
                    vx: Math.cos(angle) * 8 * s.speed, vy: Math.sin(angle) * 8 * s.speed,
                    damage: s.finalDmg, color: s.isCrit ? '#ff0' : getDmgColor(s.finalDmg),
                    life: 80, isCrit: s.isCrit, isNova: s.isNova, area: s.area, gravity: s.gravity, payloads: s.payloads || [], moveMode: s.moveMode || 'ballistic'
                });
            }

            if (newEnt) {
                // If the new entity isSelf, we need to associate it with its parent's owner maybe? Or just its own position
                state.entities.push(newEnt);
            }
        }
    });
}

/** 玩家伤害逻辑 **/

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
    const pool = [...RUNE_LIB].filter(r => r.id !== 'n_self').sort(() => 0.5 - Math.random()).slice(0, 5);
    pool.forEach(proto => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.innerHTML = `
            <div class="card-type">${proto.type}</div>
            <h3>${proto.name}</h3>
            <p>${proto.desc}</p>
        `;
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

function canTriggerRuneEvents(entity) {
    if (!entity || !entity.isSelf) return false;
    return !['bullet', 'laser', 'flash', 'mine', 'blackhole', 'orb'].includes(entity.type);
}

export function init() {
    INITIAL_NODES.forEach(n => {
        const proto = n.protoId ? RUNE_LIB.find(r => r.id === n.protoId) : RUNE_LIB[n.protoIdx];
        if (!proto) return;
        const inst = { ...proto, instId: n.instId, x: n.x, y: n.y };
        state.nodes.push(inst);
        createNodeUI(inst);
    });

    INITIAL_CONNS.forEach(c => state.conns.push({ ...c }));

    document.getElementById('btn-close').onclick = () => {
        document.getElementById('node-editor').style.display = 'none';
        state.isPaused = false;
    };

    window.onkeydown = (e) => inputState.keys[e.key.toLowerCase()] = true;
    window.onkeyup = (e) => inputState.keys[e.key.toLowerCase()] = false;

    function loop() {
        if (!state.isPaused) {
            state.frame++;

            // Generate Events for ALL entities
            let entitiesCount = state.entities.length;
            for (let i = 0; i < entitiesCount; i++) {
                let e = state.entities[i];
                if (e.hp <= 0 && e.life <= 0) continue; // Dead

                if (e.type === 'player') {
                    e.moveMode = resolveEntityMoveMode(e, 'wasd');
                    e.moveSpeed = 4;
                }

                // Update basic movement
                if (e.type === 'orb') {
                    e.angle += 0.1;
                    let p = state.entities.find(p => p.id === e.targetId);
                    if (!p) p = { x: e.centerX, y: e.centerY }; // fallback to spawn position if parent is dead
                    else { e.centerX = p.x; e.centerY = p.y; } // update center to track living parent

                    e.x = p.x + Math.cos(e.angle) * e.dist;
                    e.y = p.y + Math.sin(e.angle) * e.dist;
                } else if (e.type === 'enemy') {
                    const p = state.entities.find(p => p.type === 'player');
                    if (p) {
                        const dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
                        if (d > 0) { e.x += (dx / d) * 2; e.y += (dy / d) * 2; }
                    }
                } else if (e.type !== 'laser' && e.type !== 'flash' && e.type !== 'mine' && e.type !== 'blackhole') {
                    applyMoveMode(e);
                }

                // Track move event
                const distMoved = Math.hypot(e.x - e.lastX, e.y - e.lastY);
                if (distMoved > 0) {
                    e.moveAccumulator += distMoved;
                    if (e.moveAccumulator > 100 && canTriggerRuneEvents(e)) {
                        e.moveAccumulator -= 100;
                        const moveSpells = resolveEntityEvent(e, 't_move');
                        if (moveSpells.length) fireSpells(moveSpells, e);
                    }
                }
                e.lastX = e.x; e.lastY = e.y;

                // Pulsar and Time events
                if (canTriggerRuneEvents(e)) {
                    const pulsarSpells = resolveEntityEvent(e, 't_pulsar');
                    if (pulsarSpells.length) fireSpells(pulsarSpells, e);

                    const timeSpells = resolveEntityEvent(e, 't_time');
                    if (timeSpells.length) fireSpells(timeSpells, e);
                }

                // Life drain
                if (e.life !== Infinity) {
                    e.life--;
                    if (e.life <= 0) e.hp = 0; // mark for GC
                }
            }

            // Collisions
            entitiesCount = state.entities.length;
            for (let i = 0; i < entitiesCount; i++) {
                let a = state.entities[i];
                if (a.hp <= 0 && a.life <= 0) continue;

                for (let j = i + 1; j < entitiesCount; j++) {
                    let b = state.entities[j];
                    if (b.hp <= 0 && b.life <= 0) continue;

                    if (a.team !== b.team) {
                        // Gravity attraction
                        if (a.gravity && b.type === 'enemy') {
                            const gd = Math.hypot(a.x - b.x, a.y - b.y);
                            if (gd > 0 && gd < 200) { b.x += (a.x - b.x) / gd * 0.5; b.y += (a.y - b.y) / gd * 0.5; }
                        }
                        if (b.gravity && a.type === 'enemy') {
                            const gd = Math.hypot(b.x - a.x, b.y - a.y);
                            if (gd > 0 && gd < 200) { a.x += (b.x - a.x) / gd * 0.5; a.y += (b.y - a.y) / gd * 0.5; }
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
                                    if (a.type === 'mine') { a.area *= 2; a.damage = 0; a.life = 10; a.color = 'rgba(255, 51, 0, 0.4)'; }
                                    else if (a.type !== 'orb' && !a.isNova && a.type !== 'blackhole' && a.type !== 'enemy' && a.type !== 'player') a.life = 0;
                                }
                                if (b.damage > 0 && a.hp > 0 && a.type !== 'bullet' && a.type !== 'orb') {
                                    takeDamage(b.damage, a);
                                    popDmg(a.x, a.y, b.damage, b.isCrit);
                                    if (b.type === 'mine') { b.area *= 2; b.damage = 0; b.life = 10; b.color = 'rgba(255, 51, 0, 0.4)'; }
                                    else if (b.type !== 'orb' && !b.isNova && b.type !== 'blackhole' && b.type !== 'enemy' && b.type !== 'player') b.life = 0;
                                }
                            }
                        }
                    }
                }
            }

            // Payload On-Death Triggers
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

                        // fireSpells handles angle distribution if split > 1
                        fireSpells([spell], e);
                    }
                }
            });

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
                ctx.fillStyle = `rgba(255, 255, 255, ${b.life / 10})`;
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

            const spells = resolveEntityEvent(p, 't_pulsar', {}, true);
            const maxDmg = spells.length ? Math.max(...spells.map(s => s.finalDmg)) : 0;
            document.getElementById('txt-dmg').innerText = format(maxDmg);
        }

        requestAnimationFrame(loop);
    }
    loop();
}

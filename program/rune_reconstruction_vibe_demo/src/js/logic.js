import { state, Entity } from './state.js';
import { getDmgColor } from './utils.js';

const MOVEMENT_NODE_TO_MODE = {
    o_aim: 'homing',
    m_wasd: 'wasd',
    m_mouse: 'mouse',
    m_homing: 'homing'
};

function getMovementModeFromNodeInst(instId) {
    const node = state.nodes.find(n => n.instId === instId);
    if (!node) return null;
    return MOVEMENT_NODE_TO_MODE[node.id] || null;
}

export function resolveNodeMoveMode(targetNode, fallbackMode = 'ballistic') {
    if (!targetNode) return fallbackMode;
    const moveInputPort = targetNode.moveInputPort;
    if (moveInputPort === undefined || moveInputPort === null) return fallbackMode;

    const movementConns = state.conns.filter(c => c.toId === targetNode.instId && c.toPort === moveInputPort);
    for (const conn of movementConns) {
        const mode = getMovementModeFromNodeInst(conn.fromId);
        if (mode) return mode;
    }
    return fallbackMode;
}

export function resolveEntityMoveMode(entity, fallbackMode = 'wasd') {
    if (!entity || entity.type !== 'player') return entity?.moveMode || fallbackMode;
    const selfNode = state.nodes.find(n => n.id === 'n_self');
    if (!selfNode) return fallbackMode;
    return resolveNodeMoveMode(selfNode, fallbackMode);
}

/** 核心逻辑：基于实体上下文的图遍历 **/
export function resolveEntityEvent(entity, eventType, extraContext = {}, isDryRun = false) {
    if (!entity.isSelf) return [];
    // Projectiles and temporary effects should never act as rune casters.
    if (['bullet', 'laser', 'flash', 'mine', 'blackhole', 'orb'].includes(entity.type)) return [];

    const activeSpells = [];
    const triggers = state.nodes.filter(n => n.id === eventType && n.type === 'TRIGGER');
    triggers.forEach(startNode => {
        // --- 触发器门控 (Moved from traverse) ---
        if (startNode.id === 't_pulsar') {
            if (entity.timers[startNode.instId] === undefined) {
                entity.timers[startNode.instId] = entity.type === 'player' ? 0 : Date.now();
            }
            const lastFire = entity.timers[startNode.instId];
            const minInterval = 600 * (extraContext.speed || 1.0); // Rough estimate
            if (Date.now() - lastFire < minInterval) {
                if (!isDryRun) return; // For dry runs we still traverse to see stats! Wait, no, we need to bypass timer entirely for dry run
            } else {
                if (!isDryRun) entity.timers[startNode.instId] = Date.now();
            }
        } else if (startNode.id === 't_time') {
            if (entity.timers[startNode.instId] === undefined) {
                entity.timers[startNode.instId] = entity.type === 'player' ? 0 : Date.now();
            }
            const lastTime = entity.timers[startNode.instId];
            if (Date.now() - lastTime < 3000) {
                if (!isDryRun) return;
            } else {
                if (!isDryRun) entity.timers[startNode.instId] = Date.now();
            }
            extraContext.dmg = (extraContext.dmg || 15) * 3; // Built-in strong buff
        }

        let emitPorts = Array.from({ length: startNode.out }, (_, idx) => idx);
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
                        isNova: false,
                        isCrit: false,
                        gravity: false,
                        moveMode: 'ballistic',
                        effect: null,
                        ...extraContext
                    }, 0);
                }
            });
        });
    });

    function traverse(currNode, inPortIdx, context, depth) {
        if (depth > 20) return; // Prevent infinite loops
        // 1. 基础算子
        if (currNode.id === 'o_aim') context.moveMode = 'homing';
        if (currNode.id === 'o_mult') context.mult *= 1.6;
        if (currNode.id === 'o_split') context.split += 1;
        if (currNode.id === 'o_recur') context.recur += 1;
        if (currNode.id === 'o_accel') context.speed *= 0.75;
        if (currNode.id === 'm_wasd') context.moveMode = 'wasd';
        if (currNode.id === 'm_mouse') context.moveMode = 'mouse';
        if (currNode.id === 'm_homing') context.moveMode = 'homing';
        if (currNode.id === 'o_demux') {
            context.split += 1;
            context.dmg *= 0.9;
        }
        if (currNode.id === 'o_mux') {
            context.mult *= 1.15;
            context.dmg *= 1.1;
            if (inPortIdx === 0) context.moveMode = 'homing';
            else if (inPortIdx === 1) context.split += 1;
            else {
                context.gravity = true;
                context.area *= 1.2;
            }
        }
        if (currNode.id === 'o_weave') {
            if (inPortIdx === 0) {
                context.dmg *= 1.4;
                context.speed *= 0.95;
            } else if (inPortIdx === 1) {
                context.split += 1;
                context.area *= 1.2;
            } else {
                context.mult *= 1.3;
                context.moveMode = 'homing';
            }
            context.recur += 1;
        }
        if (currNode.id === 'o_prism') {
            if (inPortIdx === 0) {
                if (Math.random() < 0.35) {
                    context.isCrit = true;
                    context.dmg *= 2.2;
                }
            } else {
                context.isNova = true;
                context.area *= 1.8;
                context.dmg *= 0.85;
            }
        }

        // 2. 进阶算子
        if (currNode.id === 'o_crit') {
            if (Math.random() < 0.2) {
                context.isCrit = true;
                context.dmg *= 4.0;
            }
        }
        if (currNode.id === 'o_nova') {
            context.isNova = true;
            context.dmg *= 0.7;
            context.area *= 2.5;
        }
        if (currNode.id === 'o_cond') {
            const hpRatio = context.entity.hp / context.entity.maxHp;
            if (hpRatio > 0.5) return; // 逻辑阻断
        }
        if (currNode.id === 'o_speedup') context.speed *= 1.5;
        if (currNode.id === 'o_slowdown') {
            context.speed *= 0.5;
            context.area *= 2.0;
            context.dmg *= 2.0;
        }
        if (currNode.id === 'o_gravity') context.gravity = true;

        // Loop logic
        let loopCount = currNode.id === 'o_loop' ? 3 : 1;

        for (let i = 0; i < loopCount; i++) {
            let currentContext = { ...context };
            if (currNode.id === 'o_loop' && i > 0) {
                currentContext.dmg *= 0.8;
            }

            // --- 效果节点累积并继续遍历 ---
            if (currNode.type === 'EFFECT') {
                const effectMoveMode = resolveNodeMoveMode(currNode, currentContext.moveMode || 'ballistic');
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
                    moveMode: effectMoveMode
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
            }

            // --- 寻找从所有输出端口出去的连线 ---
            let emitPorts = Array.from({ length: currNode.out }, (_, idx) => idx);
            emitPorts.forEach(portNum => {
                const outgoing = state.conns.filter(c => c.fromId === currNode.instId && c.fromPort === portNum);
                outgoing.forEach(conn => {
                    const nextNode = state.nodes.find(n => n.instId === conn.toId);
                    if (nextNode) {
                        let nextContext = { ...currentContext };
                        if (currNode.id === 'o_router') {
                            if (portNum === 0) {
                                nextContext.speed *= 1.5;
                            } else if (portNum === 1) {
                                nextContext.dmg *= 1.35;
                                nextContext.speed *= 0.85;
                            } else if (portNum === 2) {
                                nextContext.moveMode = 'homing';
                                nextContext.split += 1;
                            } else {
                                nextContext.gravity = true;
                                nextContext.area *= 1.5;
                            }
                        } else if (currNode.id === 'o_prism') {
                            if (portNum === 0) nextContext.mult *= 1.15;
                            if (portNum === 1) nextContext.speed *= 1.2;
                            if (portNum === 2) nextContext.area *= 1.25;
                        } else if (currNode.id === 'o_weave') {
                            if (portNum === 0) nextContext.dmg *= 1.2;
                            if (portNum === 1) nextContext.split += 1;
                        }

                        // Pass destination input port so multi-input operators can react per socket.
                        traverse(nextNode, conn.toPort, nextContext, depth + 1);
                    }
                });
            });
        }
    }

    return activeSpells;
}

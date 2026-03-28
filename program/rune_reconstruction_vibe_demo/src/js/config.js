/** 符文库定义 (带端口配置) **/
export const RUNE_LIB = [
    { id: 'n_self', type: 'ENTITY', name: '自身', desc: '实体锚点。IN1 接收法术，IN2 绑定移动方式。', in: 2, out: 0, inLabels: ['法术锚点', '移动方式'], moveInputPort: 1 },

    { id: 't_pulsar', type: 'TRIGGER', name: '脉冲核心', desc: '基础逻辑激发器，持续产生法术信号。', in: 0, out: 1 },
    { id: 't_hit', type: 'TRIGGER', name: '反震回路', desc: '受到伤害时激发信号，释放防御性逻辑。', in: 0, out: 1 },
    { id: 't_death', type: 'TRIGGER', name: '余烬共鸣', desc: '击杀敌人时从其位置激发信号。', in: 0, out: 1 },
    { id: 't_time', type: 'TRIGGER', name: '时空节拍', desc: '每隔一定时间自动激发强效信号。', in: 0, out: 1 },
    { id: 't_move', type: 'TRIGGER', name: '动能转子', desc: '移动时持续产生能量信号。', in: 0, out: 1 },

    { id: 'm_wasd', type: 'MOVEMENT', name: '键盘位移', desc: '将对象移动方式绑定为 WASD/方向键。', in: 0, out: 1, outLabels: ['移动模式'] },
    { id: 'm_mouse', type: 'MOVEMENT', name: '鼠标引导', desc: '将对象移动方式绑定为追随鼠标。', in: 0, out: 1, outLabels: ['移动模式'] },
    { id: 'm_homing', type: 'MOVEMENT', name: '敌方追踪', desc: '将对象移动方式绑定为追踪最近敌人。', in: 0, out: 1, outLabels: ['移动模式'] },

    { id: 'o_aim', type: 'MOVEMENT', name: '自动寻踪', desc: '速度提供器：持续给目标施加朝向最近敌人的速度。', in: 0, out: 1, outLabels: ['移动模式'] },
    { id: 'o_mult', type: 'OPERATOR', name: '倍增回路', desc: '伤害指数提升 x1.6。', in: 1, out: 1 },
    { id: 'o_split', type: 'OPERATOR', name: '逻辑分流器', desc: '将单路信号分流为双路，并增加弹幕数量。', in: 1, out: 2 },
    { id: 'o_recur', type: 'OPERATOR', name: '递归循环', desc: '增加逻辑深度，极大放大伤害跳变。', in: 1, out: 1 },
    { id: 'o_accel', type: 'OPERATOR', name: '超频模块', desc: '缩短施法间隔 25%。', in: 1, out: 1 },
    { id: 'o_crit', type: 'OPERATOR', name: '概率坍缩', desc: '20% 几率产生 4.0x 暴击伤害。', in: 1, out: 1 },
    { id: 'o_nova', type: 'OPERATOR', name: '能量扩散', desc: '伤害降低 30%，但获得大范围爆炸效果。', in: 1, out: 1 },
    { id: 'o_cond', type: 'OPERATOR', name: '低压闸门', desc: '仅在 HP 低于 50% 时允许逻辑通过。', in: 1, out: 1 },
    { id: 'o_speedup', type: 'OPERATOR', name: '动量加速', desc: '弹道飞行速度提升 50%。', in: 1, out: 1 },
    { id: 'o_slowdown', type: 'OPERATOR', name: '重相凝滞', desc: '弹道减速 50%，但碰撞体积和伤害增加 100%。', in: 1, out: 1 },
    { id: 'o_gravity', type: 'OPERATOR', name: '引力坍塌', desc: '赋予弹幕微弱的引力，持续吸引周围敌人。', in: 1, out: 1 },
    { id: 'o_loop', type: 'OPERATOR', name: '莫比乌斯环', desc: '逻辑信号在当前节点循环 3 次。', in: 1, out: 1 },
    { id: 'o_mux', type: 'OPERATOR', name: '逻辑聚合', desc: '聚合多条逻辑链，统一输出。', in: 3, out: 1 },
    { id: 'o_demux', type: 'OPERATOR', name: '逻辑散播', desc: '将单路信号散播为 3 路独立信号。', in: 1, out: 3, outLabels: ['高速', '重击', '控场'] },
    { id: 'o_weave', type: 'OPERATOR', name: '网格编织器', desc: '3 输入 2 输出。不同输入端口注入不同增益，适合交织多条支路。', in: 3, out: 2 },
    { id: 'o_router', type: 'OPERATOR', name: '拓扑路由器', desc: '1 输入 4 输出。每个输出口对应独立的弹道策略。', in: 1, out: 4 },
    { id: 'o_prism', type: 'OPERATOR', name: '棱镜矩阵', desc: '2 输入 3 输出。输入端决定“暴击模式”或“爆裂模式”。', in: 2, out: 3 },

    { id: 'e_photon', type: 'EFFECT', name: '光子投射', desc: 'IN1 发射逻辑，IN2 绑定子弹移动方式。', in: 2, out: 2, inLabels: ['发射逻辑', '移动方式'], outLabels: ['级联 A', '级联 B'], moveInputPort: 1 },
    { id: 'e_blackhole', type: 'EFFECT', name: '虛空坍缩', desc: 'IN1 发射逻辑，IN2 绑定黑洞移动方式。', in: 2, out: 2, inLabels: ['发射逻辑', '移动方式'], outLabels: ['级联 A', '级联 B'], moveInputPort: 1 },
    { id: 'e_orb', type: 'EFFECT', name: '逻辑法球', desc: '生成围绕自身旋转的高速能量球。', in: 2, out: 1, inLabels: ['发射逻辑', '移动方式'], moveInputPort: 1 },
    { id: 'e_mine', type: 'EFFECT', name: '逻辑地雷', desc: '在当前位置放置一颗高爆地雷，延迟引爆。', in: 2, out: 1, inLabels: ['发射逻辑', '移动方式'], moveInputPort: 1 },
    { id: 'e_tp', type: 'EFFECT', name: '量子跃迁', desc: '角色朝鼠标方向瞬移一段距离（有冷却）。', in: 1, out: 1 },
    { id: 'e_laser', type: 'EFFECT', name: '线性切割', desc: '发射贯穿激光，适合作为网络终端高爆发节点。', in: 2, out: 1, inLabels: ['发射逻辑', '移动方式'], moveInputPort: 1 }
];

export const INITIAL_NODES = [
    { protoId: 't_pulsar', instId: 'init-t', x: 50, y: 150 },
    { protoId: 'o_aim', instId: 'init-a', x: 250, y: 150 },
    { protoId: 'e_photon', instId: 'init-e', x: 450, y: 150 },
    { protoId: 'm_wasd', instId: 'init-move', x: 450, y: 260 },
    { protoId: 'n_self', instId: 'init-self', x: 650, y: 150 }
];

export const INITIAL_CONNS = [
    { fromId: 'init-t', fromPort: 0, toId: 'init-a', toPort: 0 },
    { fromId: 'init-a', fromPort: 0, toId: 'init-e', toPort: 0 },
    { fromId: 'init-e', fromPort: 0, toId: 'init-self', toPort: 0 },
    { fromId: 'init-move', fromPort: 0, toId: 'init-self', toPort: 1 }
];

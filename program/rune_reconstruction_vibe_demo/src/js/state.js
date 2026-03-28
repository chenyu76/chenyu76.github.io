export class Entity {
    constructor(opts) {
        this.id = opts.id || Math.random().toString(36).substr(2, 9);
        this.type = opts.type || 'unknown'; // 'player', 'enemy', 'bullet', 'mine', etc.
        this.team = opts.team || 0; // 0: player team, 1: enemy team
        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.hp = opts.hp || 1;
        this.maxHp = opts.maxHp || 1;
        this.radius = opts.radius || 10;
        this.color = opts.color || '#fff';
        this.life = opts.life !== undefined ? opts.life : Infinity;
        this.damage = opts.damage || 0;
        this.isSelf = opts.isSelf || false;
        
        this.frame = 0;
        this.timers = {};
        this.moveAccumulator = 0;
        this.lastX = this.x;
        this.lastY = this.y;
        
        this.exp = opts.exp || 0;
        this.nextExp = opts.nextExp || 60;
        this.lv = opts.lv || 1;
        
        // Context traits
        this.angle = opts.angle || 0;
        this.dist = opts.dist || 0;
        this.gravity = opts.gravity || false;
        this.isNova = opts.isNova || false;
        this.isCrit = opts.isCrit || false;
        this.area = opts.area || 1;
        this.speed = opts.speed || 1;
        this.payloads = opts.payloads || [];
        this.moveMode = opts.moveMode || (this.type === 'player' ? 'wasd' : 'ballistic');
        this.moveSpeed = opts.moveSpeed || (this.type === 'player' ? 4 : 8);
    }
}

export const state = {
    entities: [
        new Entity({ 
            id: 'player_1', type: 'player', isSelf: true, 
            x: window.innerWidth / 2, y: window.innerHeight / 2, 
            hp: 100, maxHp: 100, radius: 15, color: '#00f2ff' 
        })
    ],
    debug: { 
        isInvincible: true 
    },
    nodes: [],
    inventory: [], // 实例化的节点
    conns: [], // { fromId, fromPort, toId, toPort }
    isPaused: false,
    frame: 0
};

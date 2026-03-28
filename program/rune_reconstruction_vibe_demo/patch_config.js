const fs = require('fs');
let content = fs.readFileSync('src/js/config.js', 'utf8');

// Update n_self to in: 1, out: 0
content = content.replace(
    /\{ id: 'n_self', type: 'ENTITY', name: '自身', desc: '实体锚点。发出实体的上下文，或作为目标赋予实体新逻辑。', in: 1, out: 1 \},/,
    "{ id: 'n_self', type: 'ENTITY', name: '自身', desc: '实体锚点。赋予连接至此的效果实体属性。', in: 1, out: 0 },"
);

// Update all TRIGGERs to in: 0, out: 1
content = content.replace(
    /\{ id: '(t_\w+)', type: 'TRIGGER', name: '([^']+)', desc: '([^']+)', in: 1, out: 1 \}/g,
    "{ id: '$1', type: 'TRIGGER', name: '$2', desc: '$3', in: 0, out: 1 }"
);

// Update INITIAL_NODES positions
content = content.replace(/export const INITIAL_NODES = \[([\s\S]*?)\];/, `export const INITIAL_NODES = [
    { protoIdx: 1, instId: 'init-t', x: 50, y: 150 }, // t_pulsar
    { protoIdx: 6, instId: 'init-a', x: 250, y: 150 }, // o_aim
    { protoIdx: 20, instId: 'init-e', x: 450, y: 150 }, // e_photon
    { protoIdx: 0, instId: 'init-self', x: 650, y: 150 } // n_self
];`);

// Update INITIAL_CONNS
content = content.replace(/export const INITIAL_CONNS = \[([\s\S]*?)\];/, `export const INITIAL_CONNS = [
    { fromId: 'init-t', fromPort: 0, toId: 'init-a', toPort: 0 },
    { fromId: 'init-a', fromPort: 0, toId: 'init-e', toPort: 0 },
    { fromId: 'init-e', fromPort: 0, toId: 'init-self', toPort: 0 }
];`);

fs.writeFileSync('src/js/config.js', content, 'utf8');

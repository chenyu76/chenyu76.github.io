const fs = require('fs');
let content = fs.readFileSync('src/js/config.js', 'utf8');

content = content.replace(
    /export const INITIAL_CONNS = \[\n\s*\{ fromId: 'init-t', fromPort: 0, toId: 'init-a', toPort: 0 \},\n\s*\{ fromId: 'init-a', fromPort: 0, toId: 'init-e', toPort: 0 \}\n\];/,
    `export const INITIAL_CONNS = [
    { fromId: 'init-t', fromPort: 0, toId: 'init-a', toPort: 0 },
    { fromId: 'init-a', fromPort: 0, toId: 'init-e', toPort: 0 },
    { fromId: 'init-e', fromPort: 0, toId: 'init-self', toPort: 0 }
];`
);

fs.writeFileSync('src/js/config.js', content, 'utf8');

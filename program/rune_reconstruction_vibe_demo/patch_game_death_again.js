const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /const nextPayloads = \[\.\.\.e\.payloads\];/,
    `const nextPayloads = [...e.payloads];`
); // just checking it's there

fs.writeFileSync('src/js/game.js', content, 'utf8');

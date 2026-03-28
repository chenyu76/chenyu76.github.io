const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /const spells = resolveEntityEvent\(p, 't_pulsar'\);/,
    `const spells = resolveEntityEvent(p, 't_pulsar', {}, true);`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

// Replace new Entity( ... ) calls to include payloads and isSelf
content = content.replace(
    /gravity: s\.gravity, \n\s*\}\);/g,
    `gravity: s.gravity, isSelf: s.connectsToSelf, payloads: s.payloads || []\n                });`
);

content = content.replace(
    /area: 1 \}\);/g,
    `area: 1, isSelf: s.connectsToSelf, payloads: s.payloads || [] });`
);

content = content.replace(
    /gravity: false, \n\s*\}\);/g,
    `gravity: false, isSelf: s.connectsToSelf, payloads: s.payloads || []\n                });`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

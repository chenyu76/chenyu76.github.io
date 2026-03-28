const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /area: s\.area \* 3\.0, gravity: true, \n\s*\}\);/,
    `area: s.area * 3.0, gravity: true, isSelf: s.connectsToSelf, payloads: s.payloads || []\n                });`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

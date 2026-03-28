const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /if \(keys\.w\) e\.y -= 4; if \(keys\.s\) e\.y \+= 4;/,
    `if (keys.w || keys.arrowup) e.y -= 4; if (keys.s || keys.arrowdown) e.y += 4;`
);

content = content.replace(
    /if \(keys\.a\) e\.x -= 4; if \(keys\.d\) e\.x \+= 4;/,
    `if (keys.a || keys.arrowleft) e.x -= 4; if (keys.d || keys.arrowright) e.x += 4;`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

// replace gravity to pull slower
content = content.replace(
    /if \(gd > 0 && gd < 200\) \{ b\.x \+= \(a\.x - b\.x\)\/gd \* 3; b\.y \+= \(a\.y - b\.y\)\/gd \* 3; \}/g,
    'if (gd > 0 && gd < 200) { b.x += (a.x - b.x)/gd * 0.5; b.y += (a.y - b.y)/gd * 0.5; }'
);
content = content.replace(
    /if \(gd > 0 && gd < 200\) \{ a\.x \+= \(b\.x - a\.x\)\/gd \* 3; a\.y \+= \(b\.y - a\.y\)\/gd \* 3; \}/g,
    'if (gd > 0 && gd < 200) { a.x += (b.x - a.x)/gd * 0.5; a.y += (b.y - a.y)/gd * 0.5; }'
);

// fix mine color explosion
content = content.replace(
    /if \(a\.type === 'mine'\) \{ a\.area \*= 2; a\.damage = 0; a\.life = 10; \}/g,
    "if (a.type === 'mine') { a.area *= 2; a.damage = 0; a.life = 10; a.color = 'rgba(255, 51, 0, 0.4)'; }"
);
content = content.replace(
    /if \(b\.type === 'mine'\) \{ b\.area \*= 2; b\.damage = 0; b\.life = 10; \}/g,
    "if (b.type === 'mine') { b.area *= 2; b.damage = 0; b.life = 10; b.color = 'rgba(255, 51, 0, 0.4)'; }"
);

// constrain collision loop
content = content.replace(
    /\/\/ Collisions\n            for \(let i = 0; i < state\.entities\.length; i\+\+\) \{/g,
    "// Collisions\n            for (let i = 0; i < entitiesCount; i++) {"
);
content = content.replace(
    /for \(let j = i \+ 1; j < state\.entities\.length; j\+\+\) \{/g,
    "for (let j = i + 1; j < entitiesCount; j++) {"
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

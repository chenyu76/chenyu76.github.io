const fs = require('fs');
let content = fs.readFileSync('src/js/game.js', 'utf8');

content = content.replace(
    /const pool = \[\.\.\.RUNE_LIB\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\)\.slice\(0, 3\);/,
    `const pool = [...RUNE_LIB].filter(r => r.id !== 'n_self').sort(() => 0.5 - Math.random()).slice(0, 5);`
);

fs.writeFileSync('src/js/game.js', content, 'utf8');

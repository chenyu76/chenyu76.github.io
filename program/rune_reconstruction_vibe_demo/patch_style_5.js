const fs = require('fs');
let content = fs.readFileSync('src/css/style.css', 'utf8');

content = content.replace(
    /\.choice-container \{ display: flex; gap: 30px; \}/,
    `.choice-container { display: flex; gap: 30px; flex-wrap: wrap; justify-content: center; max-width: 1400px; }`
);

// also let's make choice-card slightly narrower if needed to fit 5 on standard screens
content = content.replace(
    /\.choice-card \{\n\s*width: 240px; background: #1a1a24; border: 2px solid #333; padding: 30px; border-radius: 12px;/,
    `.choice-card {\n    width: 200px; background: #1a1a24; border: 2px solid #333; padding: 20px; border-radius: 12px;`
);

fs.writeFileSync('src/css/style.css', content, 'utf8');

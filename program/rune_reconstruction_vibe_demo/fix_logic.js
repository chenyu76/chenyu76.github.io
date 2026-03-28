const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

// I'll just find the exact block and replace it correctly.
content = content.replace(/    \}\);\n    \}\);\n\n    function traverse/g, "    });\n\n    function traverse");

fs.writeFileSync('src/js/logic.js', content, 'utf8');

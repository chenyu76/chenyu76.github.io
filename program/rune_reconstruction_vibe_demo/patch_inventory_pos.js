const fs = require('fs');
let content = fs.readFileSync('src/js/editor.js', 'utf8');

content = content.replace(
    /inst\.x = 200 \+ Math\.random\(\) \* 100;\n\s*inst\.y = 200 \+ Math\.random\(\) \* 100;/,
    `const rect = editorCanvas.getBoundingClientRect();
            inst.x = (-rect.left + window.innerWidth / 2) / zoom - 70 + Math.random() * 50;
            inst.y = (-rect.top + window.innerHeight / 2) / zoom - 30 + Math.random() * 50;`
);

fs.writeFileSync('src/js/editor.js', content, 'utf8');

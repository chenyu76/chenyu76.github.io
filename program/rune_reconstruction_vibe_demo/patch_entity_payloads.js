const fs = require('fs');
let content = fs.readFileSync('src/js/state.js', 'utf8');

content = content.replace(
    /this\.speed = opts\.speed \|\| 1;/,
    `this.speed = opts.speed || 1;
        this.payloads = opts.payloads || [];`
);

fs.writeFileSync('src/js/state.js', content, 'utf8');

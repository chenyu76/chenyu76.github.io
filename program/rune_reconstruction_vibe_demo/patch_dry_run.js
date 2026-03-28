const fs = require('fs');
let content = fs.readFileSync('src/js/logic.js', 'utf8');

content = content.replace(
    /export function resolveEntityEvent\(entity, eventType, extraContext = \{\}\) \{/,
    `export function resolveEntityEvent(entity, eventType, extraContext = {}, isDryRun = false) {`
);

content = content.replace(
    /if \(Date\.now\(\) - lastFire < minInterval\) return; \/\/ Not ready\n            entity\.timers\[startNode\.instId\] = Date\.now\(\);/,
    `if (Date.now() - lastFire < minInterval) {
                if (!isDryRun) return; // For dry runs we still traverse to see stats! Wait, no, we need to bypass timer entirely for dry run
            } else {
                if (!isDryRun) entity.timers[startNode.instId] = Date.now();
            }`
);

content = content.replace(
    /if \(Date\.now\(\) - lastTime < 3000\) return;\n            entity\.timers\[startNode\.instId\] = Date\.now\(\);/,
    `if (Date.now() - lastTime < 3000) {
                if (!isDryRun) return;
            } else {
                if (!isDryRun) entity.timers[startNode.instId] = Date.now();
            }`
);

fs.writeFileSync('src/js/logic.js', content, 'utf8');

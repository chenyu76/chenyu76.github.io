export function format(n) {
    return n < 1e6 ? Math.floor(n).toLocaleString() : n.toExponential(2).replace('e+', 'E+');
}

export function getDmgColor(d) {
    const accent = varColor('--accent');
    const operator = varColor('--operator');
    const effect = varColor('--effect');
    
    if (d < 1000) return '#fff';
    if (d < 1e6) return operator;
    if (d < 1e12) return effect;
    return '#fff';
}

export function varColor(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function popDmg(x, y, dmg, isCrit = false) {
    const d = document.createElement('div');
    d.className = 'dmg-popup' + (isCrit ? ' crit' : '');
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    d.style.color = isCrit ? '#ff0' : getDmgColor(dmg);
    d.style.fontSize = isCrit ? '20px' : '14px';
    d.style.fontWeight = isCrit ? '900' : 'normal';
    d.innerText = (isCrit ? '💥 ' : '') + format(dmg);
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1000);
}

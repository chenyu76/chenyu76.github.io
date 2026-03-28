import { state } from './state.js';
import { varColor } from './utils.js';

const editorMain = document.getElementById('editor-main');
const editorCanvas = document.getElementById('editor-canvas');
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;

editorMain.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(0.2, zoom * zoomFactor), 3);
    
    // Zoom around mouse
    const rect = editorMain.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    
    zoom = newZoom;
    editorCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
});

editorMain.addEventListener('mousedown', (e) => {
    if (e.target === editorMain || e.target === editorCanvas || e.target.id === 'connections-svg') {
        isPanning = true;
    }
});
window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX += e.movementX;
        panY += e.movementY;
        editorCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
});
window.addEventListener('mouseup', () => {
    isPanning = false;
});
const svgLayer = document.getElementById('connections-svg');

let tooltip = document.getElementById('node-tooltip');
if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'node-tooltip';
    document.body.appendChild(tooltip);
}

let drawing = null; // { fromId, fromPort, x, y, curX, curY }

export function createNodeUI(inst) {
    const div = document.createElement('div');
    div.className = 'node';
    div.id = 'node-' + inst.instId;
    div.dataset.type = inst.type;
    div.style.left = inst.x + 'px';
    div.style.top = inst.y + 'px';
    
    // 构建端口 HTML
    let inPorts = '';
    for (let i = 0; i < inst.in; i++) {
        const label = (inst.inLabels && inst.inLabels[i]) ? inst.inLabels[i] : `IN ${i + 1}`;
        inPorts += `<div class="port port-in" data-port="${i}"><div class="port-label">${label}</div></div>`;
    }
    let outPorts = '';
    for (let i = 0; i < inst.out; i++) {
        const label = (inst.outLabels && inst.outLabels[i]) ? inst.outLabels[i] : `OUT ${i + 1}`;
        outPorts += `<div class="port port-out" data-port="${i}"><div class="port-label">${label}</div></div>`;
    }

    div.innerHTML = `
        <div class="node-name">${inst.name}</div>
        <div class="ports-container">
            <div class="port-column">${inPorts}</div>
            <div class="port-column">${outPorts}</div>
        </div>
    `;

    // Tooltip logic
    div.onmouseenter = () => {
        const inText = (inst.inLabels && inst.inLabels.length > 0) ? inst.inLabels.join(' / ') : `IN x${inst.in}`;
        const outText = (inst.outLabels && inst.outLabels.length > 0) ? inst.outLabels.join(' / ') : `OUT x${inst.out}`;
        tooltip.innerHTML = `
            <div class="tt-title">${inst.name}</div>
            <div class="tt-type ${inst.type}">${inst.type} NODE</div>
            <div class="tt-desc">${inst.desc}</div>
            <div class="tt-desc">输入: ${inText}</div>
            <div class="tt-desc">输出: ${outText}</div>
        `;
        tooltip.style.display = 'block';
    };
    div.onmousemove = (e) => {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    };
    div.onmouseleave = () => {
        tooltip.style.display = 'none';
    };

    // 拖拽
    div.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation(); // prevent window context menu from interfering if any
        removeNode(inst);
    };

    div.onmousedown = (e) => {
        if (e.target.classList.contains('port')) return;
        if (e.button === 2) return; // handled by oncontextmenu
        const rect = editorCanvas.getBoundingClientRect();
        const startMouseX = (e.clientX - rect.left) / zoom;
        const startMouseY = (e.clientY - rect.top) / zoom;
        const ox = startMouseX - inst.x;
        const oy = startMouseY - inst.y;

        document.onmousemove = (me) => {
            const currentMouseX = (me.clientX - rect.left) / zoom;
            const currentMouseY = (me.clientY - rect.top) / zoom;
            inst.x = currentMouseX - ox;
            inst.y = currentMouseY - oy;
            div.style.left = inst.x + 'px';
            div.style.top = inst.y + 'px';
            renderConnections();
        };
        document.onmouseup = () => document.onmousemove = null;
    };

    // 端口连线
    div.querySelectorAll('.port-out').forEach(port => {
        port.onmousedown = (e) => {
            e.stopPropagation();
            startDrawing(inst, parseInt(port.dataset.port), e);
        };
    });

    div.querySelectorAll('.port-in').forEach(port => {
        port.onmouseup = (e) => {
            if (drawing) finalizeConn(inst, parseInt(port.dataset.port));
        };
    });

    editorCanvas.appendChild(div);
}

function startDrawing(inst, portIdx, e) {
    const existing = state.conns.find(c => c.fromId === inst.instId && c.fromPort === portIdx);
    if (existing) state.conns.splice(state.conns.indexOf(existing), 1);

    const rect = editorCanvas.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / zoom;
    const startY = (e.clientY - rect.top) / zoom;
    drawing = { fromId: inst.instId, fromPort: portIdx, x: startX, y: startY, curX: startX, curY: startY };

    document.onmousemove = (me) => {
        const curRect = editorCanvas.getBoundingClientRect();
        drawing.curX = (me.clientX - curRect.left) / zoom;
        drawing.curY = (me.clientY - curRect.top) / zoom;
        renderConnections();
    };
    document.onmouseup = () => { drawing = null; document.onmousemove = null; renderConnections(); };
}

function finalizeConn(toInst, toPortIdx) {
    const existing = state.conns.find(c => c.toId === toInst.instId && c.toPort === toPortIdx);
    if (existing) state.conns.splice(state.conns.indexOf(existing), 1);

    state.conns.push({ fromId: drawing.fromId, fromPort: drawing.fromPort, toId: toInst.instId, toPort: toPortIdx });
    drawing = null;
    renderConnections();
}

export function renderConnections() {
    svgLayer.innerHTML = '';
    state.conns.forEach((c, idx) => {
        const f = state.nodes.find(n => n.instId === c.fromId);
        const t = state.nodes.find(n => n.instId === c.toId);
        if(!f || !t) return;

        const x1 = f.x + 140, y1 = f.y + (f.out > 1 ? (c.fromPort+1)*(45/(f.out+1))+15 : 30);
        const x2 = t.x, y2 = t.y + (t.in > 1 ? (c.toPort+1)*(45/(t.in+1))+15 : 30);
        
        drawCurve(x1, y1, x2, y2, '#555', idx);
    });

    if (drawing) {
        const f = state.nodes.find(n => n.instId === drawing.fromId);
        const x1 = f.x + 140, y1 = f.y + (f.out > 1 ? (drawing.fromPort+1)*(45/(f.out+1))+15 : 30);
        drawCurve(x1, y1, drawing.curX, drawing.curY, varColor('--accent'), -1);
    }

    // 更新端口状态
    document.querySelectorAll('.port').forEach(p => p.classList.remove('occupied'));
    state.conns.forEach(c => {
        const f = document.querySelector(`#node-${c.fromId} .port-out[data-port="${c.fromPort}"]`);
        if(f) f.classList.add('occupied');
        const t = document.querySelector(`#node-${c.toId} .port-in[data-port="${c.toPort}"]`);
        if(t) t.classList.add('occupied');
    });
}

function drawCurve(x1, y1, x2, y2, color, connIdx) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${x1} ${y1} C ${x1 + 60} ${y1}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
    path.setAttribute('d', d);
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.dataset.idx = connIdx;
    
    if (connIdx !== -1) {
        path.style.cursor = 'pointer';
        path.style.pointerEvents = 'auto';
        path.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.conns.splice(connIdx, 1);
            renderConnections();
        });
        path.addEventListener('mouseover', () => {
            path.setAttribute('stroke', '#ff3366');
            path.setAttribute('stroke-width', '6');
        });
        path.addEventListener('mouseout', () => {
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '3');
        });
    }
    
    svgLayer.appendChild(path);
}

function removeNode(inst) {
    if (inst.id === 'n_self') return; // Cannot delete self node
    if (!state.inventory) state.inventory = [];
    state.inventory.push(inst);
    renderInventory();

    state.nodes = state.nodes.filter(n => n !== inst);
    state.conns = state.conns.filter(c => c.fromId !== inst.instId && c.toId !== inst.instId);
    document.getElementById('node-' + inst.instId).remove();
    renderConnections();
}

export function openEditor() {
    renderInventory();

    document.getElementById('node-editor').style.display = 'flex';
    renderConnections();
}


export function renderInventory() {
    const list = document.getElementById('inventory-list');
    if (!list) return;
    list.innerHTML = '';
    
    state.inventory.forEach((inst, idx) => {
        const div = document.createElement('div');
        div.style.background = '#1a1a24';
        div.style.border = '1px solid #444';
        div.style.padding = '10px';
        div.style.borderRadius = '4px';
        div.style.cursor = 'pointer';
        div.style.transition = 'all 0.2s';
        
        div.innerHTML = `<div style="font-size: 11px; color: ${inst.type === 'TRIGGER' ? '#00ff88' : inst.type === 'OPERATOR' ? '#ffcc00' : inst.type === 'MOVEMENT' ? '#66a3ff' : '#ff3366'}">${inst.type}</div>
                       <div style="font-weight: bold; margin-top: 5px;">${inst.name}</div>`;
        
        div.onmouseover = () => div.style.borderColor = 'var(--accent)';
        div.onmouseout = () => div.style.borderColor = '#444';
        
        div.onclick = () => {
            // Restore from inventory
            state.inventory.splice(idx, 1);
            
            // Place at center of screen loosely
            const rect = editorCanvas.getBoundingClientRect();
            inst.x = (-rect.left + window.innerWidth / 2) / zoom - 70 + Math.random() * 50;
            inst.y = (-rect.top + window.innerHeight / 2) / zoom - 30 + Math.random() * 50;
            
            state.nodes.push(inst);
            createNodeUI(inst);
            renderInventory();
        };
        
        list.appendChild(div);
    });
}

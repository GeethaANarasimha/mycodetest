/* ============================================================
   APZOK — 2D WALL DESIGNER ENGINE (WITH SPLIT & JOINT WALLS)
============================================================ */

// ---------------- DOM ELEMENTS ----------------
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
const doorTypeSelect = document.getElementById('doorType');
const wallThicknessFeetInput = document.getElementById('wallThicknessFeet');
const wallThicknessInchesInput = document.getElementById('wallThicknessInches');
const lineWidthInput = document.getElementById('lineWidth');
const lineColorInput = document.getElementById('lineColor');
const fillColorInput = document.getElementById('fillColor');
const gridSizeInput = document.getElementById('gridSize');
const snapToGridCheckbox = document.getElementById('snapToGrid');
const showDimensionsCheckbox = document.getElementById('showDimensions');
const toggleGridButton = document.getElementById('toggleGrid');
const coordinatesDisplay = document.querySelector('.coordinates');
const toolInfoDisplay = document.querySelector('.tool-info');

// Create context menu element
const contextMenu = document.createElement('div');
contextMenu.id = 'contextMenu';
contextMenu.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    display: none;
    z-index: 1000;
    min-width: 180px;
    font-family: Arial;
`;
document.body.appendChild(contextMenu);

// ---------------- CONSTANTS ----------------
const scale = 20; // 20px = 1ft
const NODE_RADIUS = 6;
const NODE_HIT_RADIUS = 10;
const ALIGN_HINT_COLOR = '#e74c3c';
const MAX_HISTORY = 50;
const INTERSECTION_TOLERANCE = 5;
const DEFAULT_WALL_COLOR = '#2c3e50';
const DEFAULT_DOOR_LINE = '#8b5a2b';
const DEFAULT_DOOR_FILL = '#e6c9a8';
const DEFAULT_WINDOW_LINE = '#3b83bd';
const DEFAULT_WINDOW_FILL = '#ffffff';

// ---------------- STATE ----------------
let currentTool = 'wall';
let isDrawing = false;
let startX, startY;
let currentX, currentY;

let gridSize = parseInt(gridSizeInput.value, 10);
let snapToGrid = snapToGridCheckbox.checked;
let showGrid = true;
let showDimensions = showDimensionsCheckbox.checked;

let nodes = [];
let walls = [];
let nextNodeId = 1;
let nextWallId = 1;

let objects = [];

let selectedWalls = new Set(); // MULTIPLE wall selection
let rightClickedWall = null;

// WALL CHAINING
let isWallDrawing = false;
let wallChain = [];
let wallPreviewX = null;
let wallPreviewY = null;
let alignmentHint = null;

// node drag
let selectedNode = null;
let isDraggingNode = false;
let dragDir = null;
let dragOriginNodePos = null;
let dragOriginMousePos = null;

// dblclick suppression
let ignoreNextClick = false;

// object selection + select-all mode
let selectedObjectIndices = new Set();
let selectAllMode = false;
let draggingObjectIndex = null;
let objectDragOffset = null;
let objectDragUndoApplied = false;

// Prevent paste mode from being cancelled when switching tools programmatically
let suppressPasteCancel = false;

// Track last interaction points for immediate paste placement
let lastContextMenuCanvasX = null;
let lastContextMenuCanvasY = null;
let lastPointerCanvasX = null;
let lastPointerCanvasY = null;

// undo / redo
let undoStack = [];
let redoStack = [];

// CUT/COPY/PASTE CLIPBOARD
let clipboard = {
    walls: [],
    objects: [],
    nodes: [],
    referenceX: 0,
    referenceY: 0
};
let isPasteMode = false;
let pasteTargetX = null;
let pasteTargetY = null;

// ============================================================
// CONTEXT MENU FUNCTIONS
// ============================================================

function showContextMenu(x, y, wall = null) {
    rightClickedWall = wall;
    
    const hasSelection = selectedWalls.size > 0 || selectedObjectIndices.size > 0;
    
    contextMenu.innerHTML = `
        <div style="padding: 8px 12px; background: #f8f9fa; border-bottom: 1px solid #eee; font-weight: bold;">
            ${wall ? 'Wall Options' : 'Designer Options'}
        </div>
        ${wall ? `
            <div class="context-item" data-action="split" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Split Wall
            </div>
            <div class="context-item" data-action="joint" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Joint Walls
            </div>
        ` : ''}
        ${hasSelection ? `
            <div class="context-item" data-action="cut" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Cut (Ctrl+X)
            </div>
            <div class="context-item" data-action="copy" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Copy (Ctrl+C)
            </div>
        ` : ''}
        ${clipboard.walls.length > 0 || clipboard.objects.length > 0 ? `
            <div class="context-item" data-action="paste" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Paste (Ctrl+V)
            </div>
        ` : ''}
        <div class="context-item" data-action="undo" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            Undo (Ctrl+Z)
        </div>
        <div class="context-item" data-action="redo" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            Redo (Ctrl+Y)
        </div>
        <div class="context-item" data-action="selectAll" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            Select All (Ctrl+A)
        </div>
        <div class="context-item" data-action="delete" style="padding: 8px 12px; cursor: pointer;">
            Delete Selection (Del)
        </div>
    `;
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
    
    // Add event listeners to menu items
    const items = contextMenu.querySelectorAll('.context-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const action = item.getAttribute('data-action');
            handleContextMenuAction(action);
        });
    });
}

function handleContextMenuAction(action) {
    switch(action) {
        case 'split':
            if (rightClickedWall) {
                splitWallAtCenter(rightClickedWall);
            }
            break;
        case 'joint':
            jointSelectedWalls();
            break;
        case 'cut':
            cutSelection();
            break;
        case 'copy':
            copySelection();
            break;
        case 'paste':
            startPasteMode(lastContextMenuCanvasX, lastContextMenuCanvasY);
            break;
        case 'undo':
            undo();
            break;
        case 'redo':
            redo();
            break;
        case 'selectAll':
            selectAllEntities();
            break;
        case 'delete':
            deleteSelection();
            break;
    }
    hideContextMenu();
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
    rightClickedWall = null;
}

// ============================================================
// CUT/COPY/PASTE FUNCTIONS
// ============================================================

function copySelection() {
    if (selectedWalls.size === 0 && selectedObjectIndices.size === 0) {
        alert('Please select items to copy');
        return;
    }
    
    // Clear clipboard
    clipboard = {
        walls: [],
        objects: [],
        nodes: [],
        referenceX: 0,
        referenceY: 0
    };
    
    // Collect selected walls and their nodes
    const selectedWallIds = new Set();
    const selectedNodeIds = new Set();
    
    // Copy selected walls
    selectedWalls.forEach(wall => {
        selectedWallIds.add(wall.id);
        
        // Clone the wall
        const wallCopy = JSON.parse(JSON.stringify(wall));
        clipboard.walls.push(wallCopy);
        
        // Collect nodes
        selectedNodeIds.add(wall.startNodeId);
        selectedNodeIds.add(wall.endNodeId);
    });
    
    // Copy nodes for selected walls
    selectedNodeIds.forEach(nodeId => {
        const node = getNodeById(nodeId);
        if (node) {
            const nodeCopy = JSON.parse(JSON.stringify(node));
            clipboard.nodes.push(nodeCopy);
        }
    });
    
    // Copy selected objects
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (obj) {
            const objCopy = JSON.parse(JSON.stringify(obj));
            clipboard.objects.push(objCopy);
        }
    });
    
    // Calculate reference point (center of selection)
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    // Find bounds from walls
    clipboard.walls.forEach(wall => {
        const startNode = clipboard.nodes.find(n => n.id === wall.startNodeId);
        const endNode = clipboard.nodes.find(n => n.id === wall.endNodeId);
        
        if (startNode) {
            minX = Math.min(minX, startNode.x);
            minY = Math.min(minY, startNode.y);
            maxX = Math.max(maxX, startNode.x);
            maxY = Math.max(maxY, startNode.y);
        }
        if (endNode) {
            minX = Math.min(minX, endNode.x);
            minY = Math.min(minY, endNode.y);
            maxX = Math.max(maxX, endNode.x);
            maxY = Math.max(maxY, endNode.y);
        }
    });
    
    // Find bounds from objects
    clipboard.objects.forEach(obj => {
        minX = Math.min(minX, obj.x);
        minY = Math.min(minY, obj.y);
        maxX = Math.max(maxX, obj.x + obj.width);
        maxY = Math.max(maxY, obj.y + obj.height);
    });
    
    // Calculate reference point (center)
    if (minX !== Infinity && maxX !== -Infinity) {
        clipboard.referenceX = (minX + maxX) / 2;
        clipboard.referenceY = (minY + maxY) / 2;
    }
    
    console.log('Copied:', {
        walls: clipboard.walls.length,
        objects: clipboard.objects.length,
        nodes: clipboard.nodes.length,
        reference: { x: clipboard.referenceX, y: clipboard.referenceY }
    });
}

function cutSelection() {
    if (selectedWalls.size === 0 && selectedObjectIndices.size === 0) {
        alert('Please select items to cut');
        return;
    }
    
    // First copy
    copySelection();
    
    // Then delete
    deleteSelection();
}

function startPasteMode(targetX = null, targetY = null) {
    if (clipboard.walls.length === 0 && clipboard.objects.length === 0) {
        alert('Clipboard is empty');
        return;
    }

    // Switch to select tool for better visual feedback without cancelling paste mode
    suppressPasteCancel = true;
    const selectBtn = document.querySelector('.tool-btn[data-tool="select"]');
    if (selectBtn && !selectBtn.classList.contains('active')) {
        selectBtn.click();
    }
    suppressPasteCancel = false;

    isPasteMode = true;
    pasteTargetX = null;
    pasteTargetY = null;

    // Clear current selection
    selectedWalls.clear();
    selectedObjectIndices.clear();

    // Update tool info
    updateToolInfo();

    // If a target point is already known (e.g., context-menu location or last pointer), paste immediately
    const immediateX = targetX !== null ? targetX : lastContextMenuCanvasX ?? lastPointerCanvasX;
    const immediateY = targetY !== null ? targetY : lastContextMenuCanvasY ?? lastPointerCanvasY;

    if (immediateX !== null && immediateY !== null) {
        setPastePoint(immediateX, immediateY);
    } else {
        console.log('Paste mode activated. Right-click or left-click to set paste point.');
    }
}

function setPastePoint(x, y) {
    if (!isPasteMode) return;
    
    // Snap to grid/inch
    ({ x, y } = snapPointToInch(x, y));
    
    pasteTargetX = x;
    pasteTargetY = y;
    
    console.log('Paste point set at:', pasteTargetX, pasteTargetY);
    
    // Now perform the paste
    performPaste();
}

function performPaste() {
    if (!isPasteMode || pasteTargetX === null || pasteTargetY === null) {
        alert('Please set a paste point first (right-click)');
        return;
    }
    
    pushUndoState();
    
    // Calculate offset from reference point to paste location
    const offsetX = pasteTargetX - clipboard.referenceX;
    const offsetY = pasteTargetY - clipboard.referenceY;
    
    // Generate new IDs for pasted items
    const nodeIdMap = new Map();
    const wallIdMap = new Map();
    
    // Paste nodes with new IDs and offset
    clipboard.nodes.forEach(oldNode => {
        const newNode = {
            id: nextNodeId++,
            x: oldNode.x + offsetX,
            y: oldNode.y + offsetY
        };
        nodes.push(newNode);
        nodeIdMap.set(oldNode.id, newNode.id);
    });
    
    // Paste walls with new IDs and updated node references
    clipboard.walls.forEach(oldWall => {
        const newWall = {
            id: nextWallId++,
            startNodeId: nodeIdMap.get(oldWall.startNodeId),
            endNodeId: nodeIdMap.get(oldWall.endNodeId),
            lineColor: oldWall.lineColor,
            outlineWidth: oldWall.outlineWidth,
            thicknessPx: oldWall.thicknessPx
        };
        walls.push(newWall);
        wallIdMap.set(oldWall.id, newWall.id);
        selectedWalls.add(newWall);
    });
    
    // Paste objects with new positions
    clipboard.objects.forEach(oldObj => {
        const newObj = {
            ...JSON.parse(JSON.stringify(oldObj)),
            x: oldObj.x + offsetX,
            y: oldObj.y + offsetY
        };
        const newIndex = objects.push(newObj) - 1;
        selectedObjectIndices.add(newIndex);
    });
    
    // Exit paste mode
    isPasteMode = false;
    pasteTargetX = null;
    pasteTargetY = null;
    
    redrawCanvas();
    updateToolInfo();
    
    console.log('Pasted items at target point');
}

function drawPastePreview() {
    if (!isPasteMode || pasteTargetX === null || pasteTargetY === null) return;
    
    const offsetX = pasteTargetX - clipboard.referenceX;
    const offsetY = pasteTargetY - clipboard.referenceY;
    
    ctx.save();
    ctx.globalAlpha = 0.6;
    
    // Draw preview of walls
    clipboard.walls.forEach(oldWall => {
        const startNode = clipboard.nodes.find(n => n.id === oldWall.startNodeId);
        const endNode = clipboard.nodes.find(n => n.id === oldWall.endNodeId);
        
        if (startNode && endNode) {
            const sx = startNode.x + offsetX;
            const sy = startNode.y + offsetY;
            const ex = endNode.x + offsetX;
            const ey = endNode.y + offsetY;
            
            ctx.lineWidth = oldWall.thicknessPx;
            ctx.strokeStyle = oldWall.lineColor || '#000000';
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }
    });
    
    // Draw preview of objects
    clipboard.objects.forEach(oldObj => {
        const x = oldObj.x + offsetX;
        const y = oldObj.y + offsetY;
        const w = oldObj.width;
        const h = oldObj.height;
        
        ctx.lineWidth = oldObj.lineWidth || 2;
        ctx.strokeStyle = oldObj.lineColor || '#000000';
        ctx.fillStyle = oldObj.fillColor || '#cccccc';
        
        if (oldObj.type === 'door') {
            ctx.strokeRect(x, y, w, h);
            ctx.beginPath();
            ctx.arc(x + w, y + h / 2, w, Math.PI, Math.PI * 1.5);
            ctx.stroke();
        } else if (oldObj.type === 'window') {
            ctx.strokeRect(x, y, w, h);
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w / 2, y + h);
            ctx.moveTo(x, y + h / 2);
            ctx.lineTo(x + w, y + h / 2);
            ctx.stroke();
        } else if (oldObj.type === 'furniture') {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }
    });
    
    // Draw crosshair at paste point
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(pasteTargetX - 20, pasteTargetY);
    ctx.lineTo(pasteTargetX + 20, pasteTargetY);
    ctx.moveTo(pasteTargetX, pasteTargetY - 20);
    ctx.lineTo(pasteTargetX, pasteTargetY + 20);
    ctx.stroke();
    
    ctx.restore();
}

function deleteSelection() {
    if (selectedWalls.size > 0 || selectedObjectIndices.size > 0) {
        pushUndoState();
        if (selectedWalls.size > 0) {
            walls = walls.filter(w => !selectedWalls.has(w));
            selectedWalls.clear();
        }
        if (selectedObjectIndices.size > 0) {
            objects = objects.filter((_, idx) => !selectedObjectIndices.has(idx));
            selectedObjectIndices.clear();
        }
        redrawCanvas();
    }
}

function splitWallAtCenter(wall) {
    if (!wall) return;
    
    pushUndoState();
    
    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    
    if (!n1 || !n2) return;
    
    // Calculate center point
    const centerX = (n1.x + n2.x) / 2;
    const centerY = (n1.y + n2.y) / 2;
    
    // Split wall at center
    splitWallAtPointWithNode(wall, centerX, centerY);
    
    redrawCanvas();
}

function jointSelectedWalls() {
    if (selectedWalls.size < 2) {
        alert('Please select at least 2 walls to join (hold Shift + click)');
        return;
    }

    pushUndoState();
    
    // Get all selected walls
    const wallsArray = Array.from(selectedWalls);
    
    // Check if all selected walls are collinear and connected
    const canJoint = checkWallsForJoining(wallsArray);

    if (!canJoint) {
        alert('Selected walls must be collinear and connected end-to-end');
        return;
    }

    // Sort walls by their position
    const sortedWalls = sortConnectedWalls(wallsArray);
    
    if (sortedWalls.length < 2) {
        alert('Walls are not properly connected');
        return;
    }
    
    // Get the first and last nodes of the chain
    const firstWall = sortedWalls[0];
    const lastWall = sortedWalls[sortedWalls.length - 1];
    
    const firstNode = getNodeById(firstWall.startNodeId);
    const lastNode = getNodeById(lastWall.endNodeId);

    if (!firstNode || !lastNode) {
        alert('Cannot find wall endpoints');
        return;
    }

    // Preserve intermediate junction nodes that are connected to unselected walls
    const nodeSequence = buildWallNodeSequence(sortedWalls);
    const preservedNodeIds = new Set();

    nodeSequence.forEach((node, idx) => {
        if (idx === 0 || idx === nodeSequence.length - 1) {
            preservedNodeIds.add(node.id);
            return;
        }

        const connected = getWallsConnectedToNode(node.id);
        const hasExternalConnection = connected.some(w => !selectedWalls.has(w));

        if (hasExternalConnection) {
            preservedNodeIds.add(node.id);
        }
    });
    
    // Remove all selected walls
    walls = walls.filter(wall => !selectedWalls.has(wall));

    // Rebuild the chain while keeping preserved nodes as junctions
    const rebuildNodes = nodeSequence.filter((node, idx) => {
        return preservedNodeIds.has(node.id) || idx === 0 || idx === nodeSequence.length - 1;
    });

    for (let i = 0; i < rebuildNodes.length - 1; i++) {
        const start = rebuildNodes[i];
        const end = rebuildNodes[i + 1];

        walls.push({
            id: nextWallId++,
            startNodeId: start.id,
            endNodeId: end.id,
            lineColor: firstWall.lineColor,
            outlineWidth: firstWall.outlineWidth,
            thicknessPx: firstWall.thicknessPx
        });
    }

    // Clear selection
    selectedWalls.clear();

    redrawCanvas();
}

function buildWallNodeSequence(sortedWalls) {
    if (sortedWalls.length === 0) return [];

    // Determine orientation using the first two walls if available
    const firstWall = sortedWalls[0];
    const sequence = [];

    let currentStart = getNodeById(firstWall.startNodeId);
    let currentEnd = getNodeById(firstWall.endNodeId);

    if (sortedWalls.length > 1) {
        const secondWall = sortedWalls[1];
        const sharesStart = secondWall.startNodeId === firstWall.startNodeId || secondWall.endNodeId === firstWall.startNodeId;
        const sharesEnd = secondWall.startNodeId === firstWall.endNodeId || secondWall.endNodeId === firstWall.endNodeId;

        if (sharesEnd && !sharesStart) {
            // Keep as is
        } else if (sharesStart && !sharesEnd) {
            // Flip orientation to follow the chain
            [currentStart, currentEnd] = [currentEnd, currentStart];
        }
    }

    sequence.push(currentStart, currentEnd);

    for (let i = 1; i < sortedWalls.length; i++) {
        const wall = sortedWalls[i];
        const lastNode = sequence[sequence.length - 1];
        const nextNodeId = wall.startNodeId === lastNode.id ? wall.endNodeId : wall.startNodeId;
        const nextNode = getNodeById(nextNodeId);

        if (nextNode) {
            sequence.push(nextNode);
        }
    }

    return sequence;
}

function getWallsConnectedToNode(nodeId) {
    return walls.filter(w => w.startNodeId === nodeId || w.endNodeId === nodeId);
}

function checkWallsForJoining(wallsArray) {
    if (wallsArray.length < 2) return false;
    
    // Check if all walls are collinear
    for (let i = 0; i < wallsArray.length; i++) {
        for (let j = i + 1; j < wallsArray.length; j++) {
            if (!areWallsCollinear(wallsArray[i], wallsArray[j])) {
                return false;
            }
        }
    }
    
    // Check if walls form a continuous chain
    const nodeConnections = new Map();
    
    for (const wall of wallsArray) {
        const startId = wall.startNodeId;
        const endId = wall.endNodeId;
        
        nodeConnections.set(startId, (nodeConnections.get(startId) || 0) + 1);
        nodeConnections.set(endId, (nodeConnections.get(endId) || 0) + 1);
    }
    
    // In a proper chain, only 2 nodes should have 1 connection (endpoints)
    // and all others should have 2 connections
    let endpointCount = 0;
    for (const count of nodeConnections.values()) {
        if (count === 1) {
            endpointCount++;
        } else if (count !== 2) {
            return false; // Not a proper chain
        }
    }
    
    return endpointCount === 2; // Should have exactly 2 endpoints
}

function areWallsCollinear(wall1, wall2) {
    const n1 = getNodeById(wall1.startNodeId);
    const n2 = getNodeById(wall1.endNodeId);
    const n3 = getNodeById(wall2.startNodeId);
    const n4 = getNodeById(wall2.endNodeId);
    
    if (!n1 || !n2 || !n3 || !n4) return false;
    
    // Calculate direction vectors
    const v1 = { x: n2.x - n1.x, y: n2.y - n1.y };
    const v2 = { x: n4.x - n3.x, y: n4.y - n3.y };
    
    // Normalize vectors
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    
    if (len1 === 0 || len2 === 0) return false;
    
    const nv1 = { x: v1.x / len1, y: v1.y / len1 };
    const nv2 = { x: v2.x / len2, y: v2.y / len2 };
    
    // Check if vectors are parallel (same or opposite direction)
    const dotProduct = Math.abs(nv1.x * nv2.x + nv1.y * nv2.y);
    return Math.abs(dotProduct - 1) < 0.1; // Allow small tolerance
}

function sortConnectedWalls(wallsArray) {
    if (wallsArray.length === 0) return [];
    
    const wallMap = new Map();
    const nodeToWallMap = new Map();
    
    // Build maps
    for (const wall of wallsArray) {
        wallMap.set(wall.id, wall);
        nodeToWallMap.set(wall.startNodeId, [...(nodeToWallMap.get(wall.startNodeId) || []), wall]);
        nodeToWallMap.set(wall.endNodeId, [...(nodeToWallMap.get(wall.endNodeId) || []), wall]);
    }
    
    // Find a starting wall (one with an endpoint)
    let startWall = null;
    for (const wall of wallsArray) {
        const startConnections = nodeToWallMap.get(wall.startNodeId).length;
        const endConnections = nodeToWallMap.get(wall.endNodeId).length;
        
        if (startConnections === 1 || endConnections === 1) {
            startWall = wall;
            break;
        }
    }
    
    if (!startWall) startWall = wallsArray[0]; // Fallback to first wall
    
    const sorted = [];
    const visited = new Set();
    let currentWall = startWall;
    
    // Determine direction (start with startNode as first endpoint)
    let currentNode = getNodeById(currentWall.startNodeId);
    const startConnections = nodeToWallMap.get(currentWall.startNodeId).length;
    const endConnections = nodeToWallMap.get(currentWall.endNodeId).length;
    
    if (startConnections !== 1) {
        // If start node is not an endpoint, use end node as first
        currentNode = getNodeById(currentWall.endNodeId);
    }
    
    while (currentWall && !visited.has(currentWall.id)) {
        visited.add(currentWall.id);
        sorted.push(currentWall);
        
        // Get the other node of current wall
        const otherNodeId = currentNode.id === currentWall.startNodeId ? 
            currentWall.endNodeId : currentWall.startNodeId;
        
        // Find next wall connected to otherNode
        const connectedWalls = nodeToWallMap.get(otherNodeId) || [];
        const nextWall = connectedWalls.find(w => 
            w.id !== currentWall.id && !visited.has(w.id) && wallMap.has(w.id)
        );
        
        if (nextWall) {
            currentWall = nextWall;
            currentNode = getNodeById(otherNodeId);
        } else {
            break; // End of chain
        }
    }
    
    return sorted;
}

// ============================================================
// WALL INTERSECTION & AUTO-SPLIT FUNCTIONS
// ============================================================

function findLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denominator) < 0.001) {
        return null;
    }
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
    
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1),
            t: t,
            u: u
        };
    }
    
    return null;
}

function findWallAtPoint(x, y, tolerance = 8) {
    for (const wall of walls) {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        
        if (!n1 || !n2) continue;
        
        const distance = distanceToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
        if (distance <= tolerance) {
            return wall;
        }
    }
    return null;
}

function getClosestPointOnWall(x, y, wall) {
    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    
    if (!n1 || !n2) return { x, y };
    
    const A = x - n1.x;
    const B = y - n1.y;
    const C = n2.x - n1.x;
    const D = n2.y - n1.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = 0;
    if (lenSq > 0) t = Math.max(0, Math.min(1, dot / lenSq));
    
    return {
        x: n1.x + t * C,
        y: n1.y + t * D,
        t: t
    };
}

function splitWallAtPointWithNode(wall, splitX, splitY) {
    if (!wall) return null;
    
    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    
    if (!n1 || !n2) return null;
    
    // Check if point is very close to an endpoint
    const distToStart = Math.hypot(splitX - n1.x, splitY - n1.y);
    const distToEnd = Math.hypot(splitX - n2.x, splitY - n2.y);
    
    if (distToStart < INTERSECTION_TOLERANCE) {
        return n1;
    }
    
    if (distToEnd < INTERSECTION_TOLERANCE) {
        return n2;
    }
    
    // Create new node at split point
    const splitNode = findOrCreateNode(splitX, splitY);
    
    // Find wall index
    const wallIndex = walls.findIndex(w => w.id === wall.id);
    if (wallIndex === -1) return splitNode;
    
    // Remove original wall
    walls.splice(wallIndex, 1);
    
    // Add first segment
    const firstSegment = {
        id: nextWallId++,
        startNodeId: n1.id,
        endNodeId: splitNode.id,
        lineColor: wall.lineColor,
        outlineWidth: wall.outlineWidth,
        thicknessPx: wall.thicknessPx
    };

    // Add second segment
    const secondSegment = {
        id: nextWallId++,
        startNodeId: splitNode.id,
        endNodeId: n2.id,
        lineColor: wall.lineColor,
        outlineWidth: wall.outlineWidth,
        thicknessPx: wall.thicknessPx
    };

    walls.push(firstSegment, secondSegment);

    // Track created wall segments for downstream processing
    splitNode.createdWalls = [firstSegment, secondSegment];

    return splitNode;
}

function getWallIntersectionPoints(wallA, wallB) {
    const n1 = getNodeById(wallA.startNodeId);
    const n2 = getNodeById(wallA.endNodeId);
    const n3 = getNodeById(wallB.startNodeId);
    const n4 = getNodeById(wallB.endNodeId);

    if (!n1 || !n2 || !n3 || !n4) return null;

    const result = getSegmentIntersection(n1.x, n1.y, n2.x, n2.y, n3.x, n3.y, n4.x, n4.y);
    if (!result) return null;

    const EPS = 0.02;
    if (result.t1 <= EPS || result.t1 >= 1 - EPS) return null;
    if (result.t2 <= EPS || result.t2 >= 1 - EPS) return null;

    return {
        x: result.x,
        y: result.y,
        tA: result.t1,
        tB: result.t2
    };
}

function getSegmentIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(den) < 1e-6) return null;

    const pre = x1 * y2 - y1 * x2;
    const post = x3 * y4 - y3 * x4;

    const x = (pre * (x3 - x4) - (x1 - x2) * post) / den;
    const y = (pre * (y3 - y4) - (y1 - y2) * post) / den;

    const t1 = (Math.abs(x2 - x1) > Math.abs(y2 - y1)) ? (x - x1) / (x2 - x1) : (y - y1) / (y2 - y1);
    const t2 = (Math.abs(x4 - x3) > Math.abs(y4 - y3)) ? (x - x3) / (x4 - x3) : (y - y3) / (y4 - y3);

    if (t1 < 0 || t1 > 1 || t2 < 0 || t2 > 1) return null;

    return { x, y, t1, t2 };
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let t = 0;
    if (lenSq > 0) t = Math.max(0, Math.min(1, dot / lenSq));
    const projX = x1 + t * C;
    const projY = y1 + t * D;
    return Math.hypot(px - projX, py - projY);
}

function findOrCreateNode(x, y) {
    const SNAP = 5;
    for (const n of nodes) {
        if (Math.hypot(n.x - x, n.y - y) <= SNAP) return n;
    }
    const node = { id: nextNodeId++, x, y };
    nodes.push(node);
    return node;
}

// ============================================================
// HISTORY (UNDO / REDO)
// ============================================================
function cloneState() {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)),
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects)),
        dimensions: JSON.parse(JSON.stringify(window.dimensions || [])),
        clipboard: JSON.parse(JSON.stringify(clipboard)),
        isPasteMode: isPasteMode,
        pasteTargetX: pasteTargetX,
        pasteTargetY: pasteTargetY
    };
}

function restoreState(state) {
    nodes = JSON.parse(JSON.stringify(state.nodes));
    walls = JSON.parse(JSON.stringify(state.walls));
    objects = JSON.parse(JSON.stringify(state.objects));
    
    if (state.dimensions) {
        window.dimensions = JSON.parse(JSON.stringify(state.dimensions));
        window.nextDimensionId = state.dimensions.length > 0 ? Math.max(...state.dimensions.map(d => d.id)) + 1 : 1;
    }

    clipboard = JSON.parse(JSON.stringify(state.clipboard || { walls: [], objects: [], nodes: [], referenceX: 0, referenceY: 0 }));
    isPasteMode = state.isPasteMode || false;
    pasteTargetX = state.pasteTargetX || null;
    pasteTargetY = state.pasteTargetY || null;

    selectedWalls.clear();
    rightClickedWall = null;
    selectedNode = null;
    isDraggingNode = false;
    dragDir = null;
    dragOriginNodePos = null;
    dragOriginMousePos = null;
    isWallDrawing = false;
    wallChain = [];
    wallPreviewX = null;
    wallPreviewY = null;
    alignmentHint = null;
    ignoreNextClick = false;
    selectedObjectIndices.clear();
    selectAllMode = false;
    
    if (typeof window.resetDimensionTool === 'function') {
        window.resetDimensionTool();
    }

    updateToolInfo();
    redrawCanvas();
}

function pushUndoState() {
    undoStack.push(cloneState());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
}

function undo() {
    if (!undoStack.length) return;
    const current = cloneState();
    const prev = undoStack.pop();
    redoStack.push(current);
    restoreState(prev);
}

function redo() {
    if (!redoStack.length) return;
    const current = cloneState();
    const next = redoStack.pop();
    undoStack.push(current);
    restoreState(next);
}

// ============================================================
// INIT
// ============================================================
function init() {
    canvas.setAttribute('tabindex', '0');

    canvas.addEventListener('mousedown', () => {
        canvas.focus();
    });

    wallThicknessFeetInput.value = '0';
    wallThicknessInchesInput.value = '6';

    document.getElementById('lineColorPreview').style.backgroundColor = lineColorInput.value || DEFAULT_WALL_COLOR;
    document.getElementById('fillColorPreview').style.backgroundColor = fillColorInput.value || '#d9d9d9';

    // MODIFIED: Separate event listeners for left and right click
    canvas.addEventListener('mousedown', (e) => {
        // Only process left clicks in mousedown
        if (e.button === 0) {
            handleMouseDown(e);
        }
    });
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseUp);
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    
    // Add right-click context menu - NOW OPENS ANYWHERE
    canvas.addEventListener('contextmenu', handleCanvasContextMenu);
    
    // Hide context menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Close context menu with Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideContextMenu();
            // Also cancel paste mode
            if (isPasteMode) {
                isPasteMode = false;
                pasteTargetX = null;
                pasteTargetY = null;
                updateToolInfo();
                redrawCanvas();
            }
        }
    });

    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            toolButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.getAttribute('data-tool');

            if (currentTool !== 'wall') {
                isWallDrawing = false;
                wallChain = [];
                wallPreviewX = wallPreviewY = null;
                alignmentHint = null;
            }

            if (currentTool !== 'dimension' && typeof window.resetDimensionTool === 'function') {
                window.resetDimensionTool();
            }

            // Cancel paste mode when switching tools (unless triggered programmatically for paste)
            if (isPasteMode && !suppressPasteCancel) {
                isPasteMode = false;
                pasteTargetX = null;
                pasteTargetY = null;
            }

            selectedNode = null;
            isDraggingNode = false;
            stopObjectDrag();
            selectedWalls.clear();
            selectedObjectIndices.clear();
            selectAllMode = false;
            hideContextMenu();
            updateToolInfo();
            redrawCanvas();
        });
    });

    wallThicknessFeetInput.addEventListener('input', redrawCanvas);
    wallThicknessInchesInput.addEventListener('input', redrawCanvas);
    lineWidthInput.addEventListener('input', redrawCanvas);

    lineColorInput.addEventListener('input', () => {
        document.getElementById('lineColorPreview').style.backgroundColor = lineColorInput.value;
        redrawCanvas();
    });
    fillColorInput.addEventListener('input', () => {
        document.getElementById('fillColorPreview').style.backgroundColor = fillColorInput.value;
        redrawCanvas();
    });

    gridSizeInput.addEventListener('input', updateGrid);
    snapToGridCheckbox.addEventListener('change', updateGrid);
    showDimensionsCheckbox.addEventListener('change', () => {
        showDimensions = showDimensionsCheckbox.checked;
        redrawCanvas();
    });

    toggleGridButton.addEventListener('click', () => {
        showGrid = !showGrid;
        redrawCanvas();
    });

    canvas.addEventListener('keydown', handleKeyDown);

    drawGrid();
    updateToolInfo();
}

// ============================================================
// CONTEXT MENU HANDLER - UPDATED TO OPEN ANYWHERE
// ============================================================
function handleCanvasContextMenu(e) {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Remember where the context menu was opened so paste can occur immediately
    lastContextMenuCanvasX = x;
    lastContextMenuCanvasY = y;

    // If in paste mode, set paste point at right-click position
    if (isPasteMode) {
        setPastePoint(x, y);
        // Don't show context menu in paste mode
        return;
    }
    
    // Find if there's a wall at the click position (optional)
    const wall = findWallAtPoint(x, y, 10);
    
    // Show context menu at click position with appropriate options
    showContextMenu(e.clientX, e.clientY, wall);
    
    // If there's a wall under the cursor, optionally select it
    if (wall && currentTool === 'select') {
        if (!selectedWalls.has(wall)) {
            selectedWalls.clear();
            selectedWalls.add(wall);
            redrawCanvas();
        }
    }
}

// ============================================================
// SNAP HELPERS
// ============================================================
function snapToGridPoint(x, y) {
    if (!snapToGrid) return { x, y };
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize
    };
}

function snapPointToInch(x, y) {
    const inchPx = scale / 12;
    return {
        x: Math.round(x / inchPx) * inchPx,
        y: Math.round(y / inchPx) * inchPx
    };
}

function snapToInchAlongDirection(t) {
    const inchPx = scale / 12;
    return Math.round(t / inchPx) * inchPx;
}

function moveSelectedWalls(dx, dy) {
    if (selectedWalls.size === 0) return;

    pushUndoState();

    const affectedNodeIds = new Set();
    selectedWalls.forEach(wall => {
        affectedNodeIds.add(wall.startNodeId);
        affectedNodeIds.add(wall.endNodeId);
    });

    affectedNodeIds.forEach(nodeId => {
        const node = getNodeById(nodeId);
        if (!node) return;
        const { x, y } = snapPointToInch(node.x + dx, node.y + dy);
        node.x = x;
        node.y = y;
    });

    redrawCanvas();
}

function moveSelectedObjects(dx, dy) {
    if (selectedObjectIndices.size === 0) return;

    pushUndoState();

    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;

        const targetX = obj.x + dx;
        const targetY = obj.y + dy;
        const snapped = snapPointToInch(targetX, targetY);
        obj.x = snapped.x;
        obj.y = snapped.y;

        if (obj.type === 'door' && typeof window.snapDoorToNearestWall === 'function') {
            window.snapDoorToNearestWall(obj, walls, scale);
        } else if (obj.type === 'window' && typeof window.snapWindowToNearestWall === 'function') {
            window.snapWindowToNearestWall(obj, walls, scale);
        }
    });

    redrawCanvas();
}

function getThicknessPx() {
    const ft = parseInt(wallThicknessFeetInput.value, 10) || 0;
    const inch = parseInt(wallThicknessInchesInput.value, 10) || 0;
    return (ft + inch / 12) * scale;
}

// ============================================================
// NODES & WALLS
// ============================================================
function getNodeById(id) {
    return nodes.find(n => n.id === id) || null;
}

function getNodeAt(x, y) {
    for (const n of nodes) {
        if (Math.hypot(n.x - x, n.y - y) <= NODE_HIT_RADIUS) return n;
    }
    return null;
}

function createWall(n1, n2) {
    if (!n1 || !n2 || n1.id === n2.id) return;
    const thicknessPx = getThicknessPx() || (0.5 * scale);
    
    const newWall = {
        id: nextWallId++,
        startNodeId: n1.id,
        endNodeId: n2.id,
        lineColor: lineColorInput.value || DEFAULT_WALL_COLOR,
        outlineWidth: parseInt(lineWidthInput.value, 10) || 2,
        thicknessPx
    };

    walls.push(newWall);

    autoSplitWallIntersections(newWall);
    return newWall;
}

function autoSplitWallIntersections(targetWall) {
    const wallStart = getNodeById(targetWall.startNodeId);
    const wallEnd = getNodeById(targetWall.endNodeId);
    if (!wallStart || !wallEnd) return;

    const intersectionsForNewWall = [];
    const intersectionsByWall = new Map();

    for (const wall of walls) {
        if (wall.id === targetWall.id) continue;

        const intersection = getWallIntersectionPoints(targetWall, wall);
        if (!intersection) continue;

        intersectionsForNewWall.push({ x: intersection.x, y: intersection.y, t: intersection.tA });

        const list = intersectionsByWall.get(wall.id) || [];
        list.push({ x: intersection.x, y: intersection.y, t: intersection.tB });
        intersectionsByWall.set(wall.id, list);
    }

    // Split all intersecting existing walls first
    intersectionsByWall.forEach((points, wallId) => {
        points.sort((a, b) => a.t - b.t);
        let candidateWallIds = [wallId];

        for (const point of points) {
            const currentWall = walls.find(w => candidateWallIds.includes(w.id));
            if (!currentWall) break;

            const splitNode = splitWallAtPointWithNode(currentWall, point.x, point.y);
            if (splitNode && splitNode.createdWalls) {
                candidateWallIds = splitNode.createdWalls.map(w => w.id);
            }
        }
    });

    // Now split the newly created wall along all intersections
    intersectionsForNewWall.sort((a, b) => a.t - b.t);
    let newWallCandidates = [targetWall.id];

    for (const point of intersectionsForNewWall) {
        const currentWall = walls.find(w => newWallCandidates.includes(w.id));
        if (!currentWall) break;

        const splitNode = splitWallAtPointWithNode(currentWall, point.x, point.y);
        if (splitNode && splitNode.createdWalls) {
            newWallCandidates = splitNode.createdWalls.map(w => w.id);
        }
    }
}

function getWallAt(x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const w of walls) {
        const n1 = getNodeById(w.startNodeId);
        const n2 = getNodeById(w.endNodeId);
        if (!n1 || !n2) continue;
        const d = distanceToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
        const tol = Math.max(8, w.thicknessPx / 2 + 4);
        if (d <= tol && d < bestDist) {
            bestDist = d;
            best = w;
        }
    }
    return best;
}

// ============================================================
// OBJECT SELECT / HIT TEST
// ============================================================
function getObjectAt(x, y, includeSelectionPadding = false) {
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        const padding = includeSelectionPadding && selectedObjectIndices.has(i) ? 8 : 0;
        if (
            x >= obj.x - padding && x <= obj.x + obj.width + padding &&
            y >= obj.y - padding && y <= obj.y + obj.height + padding
        ) {
            return i;
        }
    }
    return -1;
}

// ============================================================
// NODE DRAG
// ============================================================
function startNodeDrag(node, mouseX, mouseY) {
    pushUndoState();

    // Find a wall that contains this node
    const attachedWalls = walls.filter(w =>
        w.startNodeId === node.id || w.endNodeId === node.id
    );

    if (attachedWalls.length === 0) return;

    // Prefer a wall that is currently selected so dragging honours the intended segment
    const wall = attachedWalls.find(w => selectedWalls.has(w)) || attachedWalls[0];
    const otherNodeId = node.id === wall.startNodeId ? wall.endNodeId : wall.startNodeId;
    const other = getNodeById(otherNodeId);

    if (!other) return;

    const dx = node.x - other.x;
    const dy = node.y - other.y;
    const len = Math.hypot(dx, dy) || 1;

    dragDir = { x: dx / len, y: dy / len };
    dragOriginNodePos = { x: node.x, y: node.y };
    dragOriginMousePos = { x: mouseX, y: mouseY };
    selectedNode = node;
    isDraggingNode = true;

    selectedWalls.clear();
    selectedObjectIndices.clear();
    selectAllMode = false;
}

function startObjectDrag(index, mouseX, mouseY) {
    const obj = objects[index];
    if (!obj) return;

    draggingObjectIndex = index;
    objectDragOffset = { x: mouseX - obj.x, y: mouseY - obj.y };
    objectDragUndoApplied = false;
}

function stopObjectDrag() {
    draggingObjectIndex = null;
    objectDragOffset = null;
    objectDragUndoApplied = false;
}

// ============================================================
// MOUSE HANDLERS (WITH MULTIPLE WALL SELECTION)
// ============================================================
function handleMouseDown(e) {
    // Hide context menu on any click
    hideContextMenu();
    
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Keep pointer tracking in sync with clicks
    lastPointerCanvasX = x;
    lastPointerCanvasY = y;

    // FIXED: Only process left clicks (button 0)
    // Right clicks are handled by contextmenu event
    if (e.button !== 0) return;

    startX = x;
    startY = y;

    // Handle left click in paste mode (also paste)
    if (isPasteMode) {
        ({ x, y } = snapPointToInch(x, y));
        setPastePoint(x, y);
        return;
    }

    if (currentTool === 'dimension') {
        if (typeof handleDimensionMouseDown === 'function') {
            handleDimensionMouseDown(e);
        }
        return;
    }

    if (currentTool === 'select') {
        // LEFT CLICK ONLY for selection operations
        
        // Check for node handles of selected walls
        for (const wall of selectedWalls) {
            const n1 = getNodeById(wall.startNodeId);
            const n2 = getNodeById(wall.endNodeId);
            
            if (n1 && Math.hypot(x - n1.x, y - n1.y) <= NODE_HIT_RADIUS) {
                startNodeDrag(n1, x, y);
                return;
            }
            if (n2 && Math.hypot(x - n2.x, y - n2.y) <= NODE_HIT_RADIUS) {
                startNodeDrag(n2, x, y);
                return;
            }
        }

        // Check for any node
        const node = getNodeAt(x, y);
        if (node) {
            startNodeDrag(node, x, y);
            redrawCanvas();
            return;
        }

        // Check for object
        const objIndex = getObjectAt(x, y, true);
        if (objIndex !== -1) {
            selectAllMode = false;
            if (e.shiftKey) {
                if (selectedObjectIndices.has(objIndex)) {
                    selectedObjectIndices.delete(objIndex);
                } else {
                    selectedObjectIndices.add(objIndex);
                }
            } else {
                selectedObjectIndices.clear();
                selectedObjectIndices.add(objIndex);
                selectedWalls.clear();
            }
            if (!e.shiftKey) {
                startObjectDrag(objIndex, x, y);
            }
            redrawCanvas();
            return;
        }

        // Check for wall
        const wall = getWallAt(x, y);
        if (wall) {
            if (e.shiftKey) {
                // MULTIPLE SELECTION with Shift key
                if (selectedWalls.has(wall)) {
                    selectedWalls.delete(wall); // Deselect if already selected
                } else {
                    selectedWalls.add(wall); // Add to selection
                }
                selectedNode = null;
            } else {
                // SINGLE SELECTION
                selectedWalls.clear();
                selectedWalls.add(wall);
                selectedNode = null;
            }
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
            return;
        }

        // Click on empty space - clear selection unless Shift is held
        if (!e.shiftKey) {
            selectedWalls.clear();
            selectedNode = null;
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
        }

        return;
    }

    if (currentTool === 'erase') {
        const wall = getWallAt(x, y);
        const objIndex = getObjectAt(x, y);

        if (typeof getDimensionAt === 'function') {
            const dimIndex = getDimensionAt(x, y);
            if (dimIndex !== -1) {
                pushUndoState();
                window.dimensions.splice(dimIndex, 1);
                redrawCanvas();
                return;
            }
        }

        if (wall || objIndex !== -1) {
            pushUndoState();
            if (wall) {
                walls = walls.filter(w => w !== wall);
                selectedWalls.delete(wall);
            }
            if (objIndex !== -1) {
                objects.splice(objIndex, 1);
            }
            selectedObjectIndices.clear();
            redrawCanvas();
        }
        return;
    }

    if (currentTool === 'wall') return;

    ({ x, y } = snapToGridPoint(x, y));
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;
    isDrawing = true;
}

function getDefaultStyleForType(type) {
    const baseLine = lineColorInput.value || DEFAULT_WALL_COLOR;
    const baseFill = fillColorInput.value || '#d9d9d9';

    if (type === 'door') {
        return { lineColor: DEFAULT_DOOR_LINE, fillColor: DEFAULT_DOOR_FILL };
    }

    if (type === 'window') {
        return { lineColor: DEFAULT_WINDOW_LINE, fillColor: DEFAULT_WINDOW_FILL };
    }

    return { lineColor: baseLine, fillColor: baseFill };
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Track last pointer position for quick paste placement
    lastPointerCanvasX = x;
    lastPointerCanvasY = y;

    if (draggingObjectIndex !== null && objectDragOffset) {
        const obj = objects[draggingObjectIndex];
        if (obj) {
            if (!objectDragUndoApplied) {
                pushUndoState();
                objectDragUndoApplied = true;
            }

            ({ x, y } = snapToGridPoint(x - objectDragOffset.x, y - objectDragOffset.y));
            obj.x = x;
            obj.y = y;

            if (obj.type === 'door' && typeof window.snapDoorToNearestWall === 'function') {
                window.snapDoorToNearestWall(obj, walls, scale);
            } else if (obj.type === 'window' && typeof window.snapWindowToNearestWall === 'function') {
                window.snapWindowToNearestWall(obj, walls, scale);
            }

            coordinatesDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}`;
            redrawCanvas();
            return;
        }
    }

    // Update coordinates display
    if (isPasteMode) {
        ({ x, y } = snapPointToInch(x, y));
        coordinatesDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)} | Click to set paste point | ESC to cancel`;
        redrawCanvas();
        return;
    }

    if (currentTool === 'dimension') {
        if (typeof handleDimensionMouseMove === 'function') {
            handleDimensionMouseMove(e);
        }
        return;
    }

    if (isDraggingNode && selectedNode && dragDir && dragOriginMousePos && dragOriginNodePos) {
        const dx = x - dragOriginMousePos.x;
        const dy = y - dragOriginMousePos.y;
        let t = dx * dragDir.x + dy * dragDir.y;
        t = snapToInchAlongDirection(t);

        selectedNode.x = dragOriginNodePos.x + dragDir.x * t;
        selectedNode.y = dragOriginNodePos.y + dragDir.y * t;

        coordinatesDisplay.textContent = `X: ${selectedNode.x.toFixed(1)}, Y: ${selectedNode.y.toFixed(1)}`;
        redrawCanvas();
        return;
    }

    // WALL PREVIEW
    if (currentTool === 'wall' && isWallDrawing && wallChain.length > 0) {
        ({ x, y } = snapPointToInch(x, y));

        const lastNode = wallChain[wallChain.length - 1];
        const sx = lastNode.x;
        const sy = lastNode.y;
        let dx = x - sx;
        let dy = y - sy;

        if (dx === 0 && dy === 0) {
            wallPreviewX = sx;
            wallPreviewY = sy;
            alignmentHint = null;
        } else {
            const angle = Math.atan2(dy, dx);
            const snapStep = Math.PI / 4;
            const snappedAngle = Math.round(angle / snapStep) * snapStep;
            const length = Math.hypot(dx, dy);

            let ex = sx + length * Math.cos(snappedAngle);
            let ey = sy + length * Math.sin(snappedAngle);

            ({ x: ex, y: ey } = snapPointToInch(ex, ey));

            const tol = 8;
            alignmentHint = null;

            for (const node of nodes) {
                if (node.id === lastNode.id) continue;

                const ax = node.x;
                const ay = node.y;
                const alignedX = Math.abs(ex - ax) <= tol;
                const alignedY = Math.abs(ey - ay) <= tol;
                const close = Math.hypot(ex - ax, ey - ay) <= tol;

                if (close) {
                    ex = ax;
                    ey = ay;
                    alignmentHint = { type: 'close', ax, ay, ex, ey };
                    break;
                }

                if (alignedX) {
                    ex = ax;
                    alignmentHint = { type: 'vertical', ax, ay, ex, ey };
                    break;
                }

                if (alignedY) {
                    ey = ay;
                    alignmentHint = { type: 'horizontal', ax, ay, ex, ey };
                    break;
                }
            }

            wallPreviewX = ex;
            wallPreviewY = ey;
        }

        coordinatesDisplay.textContent = `X: ${wallPreviewX.toFixed(1)}, Y: ${wallPreviewY.toFixed(1)}`;
        redrawCanvas();
        drawWallPreview();
        drawAlignmentHint();
        return;
    }

    ({ x, y } = snapToGridPoint(x, y));
    currentX = x;
    currentY = y;
    coordinatesDisplay.textContent = `X: ${x}, Y: ${y}`;

    if (isDrawing) {
        redrawCanvas();
        drawCurrentDragObject();
    }
}

function handleMouseUp() {
    if (draggingObjectIndex !== null) {
        stopObjectDrag();
        redrawCanvas();
        return;
    }
    if (isDraggingNode) {
        isDraggingNode = false;
        selectedNode = null;
        dragDir = null;
        dragOriginMousePos = null;
        dragOriginNodePos = null;
        redrawCanvas();
        return;
    }

    if (!isDrawing) return;
    isDrawing = false;

    if (!['door', 'window', 'furniture'].includes(currentTool)) return;
    if (startX === currentX && startY === currentY) return;

    pushUndoState();

    const styles = getDefaultStyleForType(currentTool);

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    const newObj = {
        type: currentTool,
        x, y,
        width: w,
        height: h,
        lineWidth: parseInt(lineWidthInput.value, 10) || 2,
        lineColor: styles.lineColor,
        fillColor: styles.fillColor,
        rotation: 0,
        flipH: false,
        flipV: false
    };

    if (currentTool === 'door') {
        newObj.doorType = doorTypeSelect ? doorTypeSelect.value : 'normal';
        if (typeof window.initializeDoorObject === 'function') {
            window.initializeDoorObject(newObj, walls, scale);
        }
    } else if (currentTool === 'window') {
        if (typeof window.initializeWindowObject === 'function') {
            window.initializeWindowObject(newObj, walls, scale);
        }
    }

    objects.push(newObj);

    redrawCanvas();
}

// ============================================================
// WALL CHAIN
// ============================================================
function handleCanvasClick(e) {
    if (currentTool !== 'wall') return;

    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }

    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    ({ x, y } = snapPointToInch(x, y));

    if (!isWallDrawing) {
        // FIRST CLICK: Start new wall chain
        
        // Check if we're clicking on an existing wall (for partition)
        const existingWall = findWallAtPoint(x, y, 10);
        let firstNode;
        
        if (existingWall) {
            // We're clicking on an existing wall - auto-split it
            pushUndoState();
            const closestPoint = getClosestPointOnWall(x, y, existingWall);
            firstNode = splitWallAtPointWithNode(existingWall, closestPoint.x, closestPoint.y);
        } else {
            // Not on an existing wall, create new node
            firstNode = findOrCreateNode(x, y);
        }
        
        wallChain = [firstNode];
        isWallDrawing = true;
        wallPreviewX = wallPreviewY = null;
        alignmentHint = null;
        selectedWalls.clear();
        selectedObjectIndices.clear();
        selectAllMode = false;
        return;
    }

    if (wallPreviewX === null || wallPreviewY === null) return;

    pushUndoState();

    // Check if end point is on an existing wall
    const existingWall = findWallAtPoint(wallPreviewX, wallPreviewY, 10);
    let newNode;
    
    if (existingWall) {
        // End point is on an existing wall - auto-split it
        const closestPoint = getClosestPointOnWall(wallPreviewX, wallPreviewY, existingWall);
        newNode = splitWallAtPointWithNode(existingWall, closestPoint.x, closestPoint.y);
    } else {
        // Not on an existing wall, create new node
        newNode = findOrCreateNode(wallPreviewX, wallPreviewY);
    }
    
    // Get the last node in the chain
    const lastNode = wallChain[wallChain.length - 1];
    
    // Create wall from last node to new node
    createWall(lastNode, newNode);
    
    // Add new node to the chain
    wallChain.push(newNode);
    
    wallPreviewX = wallPreviewY = null;
    alignmentHint = null;
    redrawCanvas();
}

function handleCanvasDoubleClick(e) {
    if (currentTool === 'wall' && isWallDrawing) {
        e.preventDefault();
        ignoreNextClick = true;

        // If there's a preview, create the final wall segment
        if (wallPreviewX !== null && wallPreviewY !== null && wallChain.length > 0) {
            pushUndoState();
            
            const lastNode = wallChain[wallChain.length - 1];
            
            // Check if end point is on an existing wall
            const existingWall = findWallAtPoint(wallPreviewX, wallPreviewY, 10);
            let endNode;
            
            if (existingWall) {
                // End point is on an existing wall - auto-split it
                const closestPoint = getClosestPointOnWall(wallPreviewX, wallPreviewY, existingWall);
                endNode = splitWallAtPointWithNode(existingWall, closestPoint.x, closestPoint.y);
            } else {
                // Not on an existing wall, create new node
                endNode = findOrCreateNode(wallPreviewX, wallPreviewY);
            }
            
            createWall(lastNode, endNode);
            wallChain.push(endNode);
        }

        // Reset wall drawing state
        wallPreviewX = null;
        wallPreviewY = null;
        isWallDrawing = false;
        wallChain = [];
        alignmentHint = null;
        redrawCanvas();
    }
}

// ============================================================
// DRAWING (WITH MULTIPLE WALL SELECTION)
// ============================================================
function drawGrid() {
    if (!showGrid) return;
    ctx.beginPath();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#e0e0e0';

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

function drawWalls() {
    for (const w of walls) {
        const n1 = getNodeById(w.startNodeId);
        const n2 = getNodeById(w.endNodeId);
        if (!n1 || !n2) continue;

        ctx.save();
        ctx.lineWidth = w.thicknessPx;
        ctx.strokeStyle = w.lineColor;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        ctx.restore();

        if (showDimensions) drawWallDimension(n1.x, n1.y, n2.x, n2.y, w.thicknessPx);
        
        // Draw selection highlight for selected walls
        if (selectedWalls.has(w)) {
            drawWallSelectionHighlight(n1, n2, w);
        }
    }
    
    // Draw paste preview if in paste mode and paste point is set
    if (isPasteMode && pasteTargetX !== null && pasteTargetY !== null) {
        drawPastePreview();
    }
}

function drawWallSelectionHighlight(n1, n2, wall) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = Math.max(2, wall.thicknessPx / 4);
    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(n1.x, n1.y);
    ctx.lineTo(n2.x, n2.y);
    ctx.stroke();
    
    // Draw handles at both ends
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    
    drawHandleNode(n1, horizontal);
    drawHandleNode(n2, horizontal);
    
    ctx.restore();
}

function drawHandleNode(node, horizontal) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2980b9';
    ctx.stroke();

    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 1.5;
    const arrowLen = 10;
    const head = 4;

    ctx.beginPath();
    if (horizontal) {
        ctx.moveTo(node.x - NODE_RADIUS - 2, node.y);
        ctx.lineTo(node.x - NODE_RADIUS - 2 - arrowLen, node.y);
        ctx.lineTo(node.x - NODE_RADIUS - 2 - arrowLen + head, node.y - head);
        ctx.moveTo(node.x - NODE_RADIUS - 2 - arrowLen, node.y);
        ctx.lineTo(node.x - NODE_RADIUS - 2 - arrowLen + head, node.y + head);

        ctx.moveTo(node.x + NODE_RADIUS + 2, node.y);
        ctx.lineTo(node.x + NODE_RADIUS + 2 + arrowLen, node.y);
        ctx.lineTo(node.x + NODE_RADIUS + 2 + arrowLen - head, node.y - head);
        ctx.moveTo(node.x + NODE_RADIUS + 2 + arrowLen, node.y);
        ctx.lineTo(node.x + NODE_RADIUS + 2 + arrowLen - head, node.y + head);
    } else {
        ctx.moveTo(node.x, node.y - NODE_RADIUS - 2);
        ctx.lineTo(node.x, node.y - NODE_RADIUS - 2 - arrowLen);
        ctx.lineTo(node.x - head, node.y - NODE_RADIUS - 2 - arrowLen + head);
        ctx.moveTo(node.x, node.y - NODE_RADIUS - 2 - arrowLen);
        ctx.lineTo(node.x + head, node.y - NODE_RADIUS - 2 - arrowLen + head);

        ctx.moveTo(node.x, node.y + NODE_RADIUS + 2);
        ctx.lineTo(node.x, node.y + NODE_RADIUS + 2 + arrowLen);
        ctx.lineTo(node.x - head, node.y + NODE_RADIUS + 2 + arrowLen - head);
        ctx.moveTo(node.x, node.y + NODE_RADIUS + 2 + arrowLen);
        ctx.lineTo(node.x + head, node.y + NODE_RADIUS + 2 + arrowLen - head);
    }
    ctx.stroke();
    ctx.restore();
}

function drawAlignmentHint() {
    if (!alignmentHint) return;
    const { ax, ay, ex, ey } = alignmentHint;

    ctx.save();
    ctx.strokeStyle = ALIGN_HINT_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawWallPreview() {
    if (wallChain.length === 0 || wallPreviewX === null || wallPreviewY === null) return;

    const lastNode = wallChain[wallChain.length - 1];
    const sx = lastNode.x;
    const sy = lastNode.y;
    const ex = wallPreviewX;
    const ey = wallPreviewY;
    const thicknessPx = getThicknessPx() || (0.5 * scale);

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = thicknessPx;
    ctx.strokeStyle = lineColorInput.value;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();

    if (showDimensions) drawWallDimension(sx, sy, ex, ey, thicknessPx);
}

function drawWallDimension(x1, y1, x2, y2, thicknessPx) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const totalInches = Math.round((len / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const text = `${feet}'${inches}"`;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = thicknessPx / 2 + 14;
    const tx = midX + nx * offset;
    const ty = midY + ny * offset;

    ctx.save();
    ctx.fillStyle = '#e74c3c';
    ctx.font = '10px Arial';
    ctx.fillText(text, tx - ctx.measureText(text).width / 2, ty - 2);
    ctx.restore();
}

// ============================================================
// DIMENSION TOOL INTEGRATION
// ============================================================
function drawDimensions() {
    if (typeof window.drawDimensions === 'function') {
        window.drawDimensions();
    }
}

// ============================================================
// OBJECTS
// ============================================================
function drawObjects() {
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const { x, y, width, height } = obj;
        const cx = x + width / 2;
        const cy = y + height / 2;
        const rotRad = ((obj.rotation || 0) * Math.PI) / 180;
        const sx = obj.flipH ? -1 : 1;
        const sy = obj.flipV ? -1 : 1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotRad);
        ctx.scale(sx, sy);

        const localX = -width / 2;
        const localY = -height / 2;

        ctx.lineWidth = obj.lineWidth;
        ctx.strokeStyle = obj.lineColor;
        ctx.fillStyle = obj.fillColor;

        if (obj.type === 'door') {
            ctx.fillRect(localX, localY, width, height);
            ctx.strokeRect(localX, localY, width, height);
            ctx.beginPath();
            ctx.arc(localX + width, localY + height / 2, width, Math.PI, Math.PI * 1.5);
            ctx.stroke();
        } else if (obj.type === 'window') {
            ctx.fillRect(localX, localY, width, height);
            ctx.strokeRect(localX, localY, width, height);
            ctx.beginPath();
            ctx.moveTo(localX + width / 2, localY);
            ctx.lineTo(localX + width / 2, localY + height);
            ctx.moveTo(localX, localY + height / 2);
            ctx.lineTo(localX + width, localY + height / 2);
            ctx.stroke();
        } else if (obj.type === 'furniture') {
            ctx.fillRect(localX, localY, width, height);
            ctx.strokeRect(localX, localY, width, height);
        }

        ctx.restore();

        if (selectedObjectIndices.has(i)) {
            ctx.save();
            ctx.strokeStyle = '#2980b9';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            const handleSize = 8;
            const handles = [
                { hx: x, hy: y },
                { hx: x + width / 2 - handleSize / 2, hy: y },
                { hx: x + width - handleSize, hy: y },
                { hx: x, hy: y + height / 2 - handleSize / 2 },
                { hx: x + width - handleSize, hy: y + height / 2 - handleSize / 2 },
                { hx: x, hy: y + height - handleSize },
                { hx: x + width / 2 - handleSize / 2, hy: y + height - handleSize },
                { hx: x + width - handleSize, hy: y + height - handleSize }
            ];

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#2980b9';
            ctx.lineWidth = 1;
            handles.forEach(({ hx, hy }) => {
                ctx.fillRect(hx - 1, hy - 1, handleSize + 2, handleSize + 2);
                ctx.strokeRect(hx - 1, hy - 1, handleSize + 2, handleSize + 2);
            });
            ctx.restore();
        }
    }
}

function drawCurrentDragObject() {
    if (!isDrawing) return;
    if (!['door', 'window', 'furniture'].includes(currentTool)) return;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    const previewStyles = getDefaultStyleForType(currentTool);

    ctx.save();
    ctx.strokeStyle = previewStyles.lineColor;
    ctx.fillStyle = previewStyles.fillColor;
    ctx.lineWidth = parseInt(lineWidthInput.value, 10) || 2;

    if (currentTool === 'door') {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.arc(x + w, y + h / 2, w, Math.PI, Math.PI * 1.5);
        ctx.stroke();
    } else if (currentTool === 'window') {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w / 2, y + h);
        ctx.moveTo(x, y + h / 2);
        ctx.lineTo(x + w, y + h / 2);
        ctx.stroke();
    } else if (currentTool === 'furniture') {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawWalls();
    drawObjects();
    drawDimensions();
}

// ============================================================
// KEYBOARD HANDLING
// ============================================================
function selectAllEntities() {
    selectedObjectIndices = new Set(objects.map((_, i) => i));
    selectedWalls.clear();
    selectedNode = null;
    isDraggingNode = false;
    selectAllMode = true;
    redrawCanvas();
}

function handleKeyDown(e) {
    // Handle Ctrl key combinations
    if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        
        switch(key) {
            case 'x': // Cut
                e.preventDefault();
                cutSelection();
                return;
                
            case 'c': // Copy
                e.preventDefault();
                copySelection();
                return;
                
            case 'v': // Paste
                e.preventDefault();
                startPasteMode();
                return;
                
            case 'z': // Undo
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                return;
                
            case 'y': // Redo
                e.preventDefault();
                redo();
                return;
                
            case 'a': // Select All
                e.preventDefault();
                selectAllEntities();
                return;
        }
    }

    // Arrow keys to nudge selected objects
    if (!e.ctrlKey && !e.metaKey && selectedObjectIndices.size > 0) {
        const inchPx = scale / 12;
        const step = e.shiftKey ? scale : inchPx;
        let dx = 0;
        let dy = 0;

        switch (e.key) {
            case 'ArrowUp':
                dy = -step;
                break;
            case 'ArrowDown':
                dy = step;
                break;
            case 'ArrowLeft':
                dx = -step;
                break;
            case 'ArrowRight':
                dx = step;
                break;
        }

        if (dx !== 0 || dy !== 0) {
            e.preventDefault();
            moveSelectedObjects(dx, dy);
            return;
        }
    }

    // Arrow keys to nudge selected walls
    if (!e.ctrlKey && !e.metaKey && selectedWalls.size > 0) {
        const inchPx = scale / 12;
        const step = e.shiftKey ? scale : inchPx; // Shift for 1ft, otherwise 1in
        let dx = 0;
        let dy = 0;

        switch (e.key) {
            case 'ArrowUp':
                dy = -step;
                break;
            case 'ArrowDown':
                dy = step;
                break;
            case 'ArrowLeft':
                dx = -step;
                break;
            case 'ArrowRight':
                dx = step;
                break;
        }

        if (dx !== 0 || dy !== 0) {
            e.preventDefault();
            moveSelectedWalls(dx, dy);
            return;
        }
    }

    // Escape key
    if (e.key === 'Escape') {
        if (isPasteMode) {
            isPasteMode = false;
            pasteTargetX = null;
            pasteTargetY = null;
            updateToolInfo();
            redrawCanvas();
        } else if (currentTool === 'wall' && isWallDrawing) {
            isWallDrawing = false;
            wallChain = [];
            wallPreviewX = null;
            wallPreviewY = null;
            alignmentHint = null;
            ignoreNextClick = false;
            redrawCanvas();
        } else if (currentTool === 'dimension' && typeof window.isDimensionDrawing !== 'undefined' && window.isDimensionDrawing) {
            if (typeof window.resetDimensionTool === 'function') {
                window.resetDimensionTool();
            }
            redrawCanvas();
        } else {
            selectedWalls.clear();
            selectedNode = null;
            isDraggingNode = false;
            selectedObjectIndices.clear();
            selectAllMode = false;
            hideContextMenu();
            redrawCanvas();
        }
        return;
    }

    // Delete/Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectAllMode) {
            if (nodes.length || walls.length || objects.length || (window.dimensions && window.dimensions.length)) {
                pushUndoState();
                nodes = [];
                walls = [];
                objects = [];
                if (window.dimensions) window.dimensions = [];
            }
            selectedWalls.clear();
            selectedNode = null;
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
        } else {
            const hasSelection = selectedWalls.size > 0 || selectedObjectIndices.size > 0;
            const hasDimensions = window.dimensions && window.dimensions.length > 0;

            if (hasSelection) {
                deleteSelection();
            } else if (hasDimensions) {
                pushUndoState();
                window.dimensions = [];
                redrawCanvas();
            }
        }
        return;
    }

    // Object transformation keys
    if (!e.ctrlKey && !e.metaKey && selectedObjectIndices.size > 0) {
        const key = e.key.toLowerCase();
        if (key === 'h') {
            pushUndoState();
            if (typeof flipSelectedObjectsHorizontal === 'function') {
                flipSelectedObjectsHorizontal(objects, selectedObjectIndices);
            }
            redrawCanvas();
            return;
        }
        if (key === 'v') {
            pushUndoState();
            if (typeof flipSelectedObjectsVertical === 'function') {
                flipSelectedObjectsVertical(objects, selectedObjectIndices);
            }
            redrawCanvas();
            return;
        }
        if (key === 'r') {
            const angle = e.shiftKey ? -15 : 15;
            pushUndoState();
            if (typeof rotateSelectedObjects === 'function') {
                rotateSelectedObjects(objects, selectedObjectIndices, angle);
            }
            redrawCanvas();
            return;
        }
    }
}

// ============================================================
// UI
// ============================================================
function updateToolInfo() {
    let name = '';
    switch (currentTool) {
        case 'wall': name = 'Wall'; break;
        case 'door': name = 'Door'; break;
        case 'window': name = 'Window'; break;
        case 'furniture': name = 'Furniture'; break;
        case 'select': name = 'Select'; break;
        case 'erase': name = 'Eraser'; break;
        case 'dimension': name = 'Dimension'; break;
    }

    if (isPasteMode) {
        name = 'Paste Mode (click to set point)';
    }

    toolInfoDisplay.textContent = `Current Tool: ${name}`;
}

function updateGrid() {
    gridSize = parseInt(gridSizeInput.value, 10) || 20;
    snapToGrid = snapToGridCheckbox.checked;
    redrawCanvas();
}

window.onload = init;
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
const rotateLeftButton = document.getElementById('rotateLeft');
const rotateRightButton = document.getElementById('rotateRight');
const flipHorizontalButton = document.getElementById('flipHorizontal');
const flipVerticalButton = document.getElementById('flipVertical');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const floorTextureModal = document.getElementById('floorTextureModal');
const floorTextureFileInput = document.getElementById('floorTextureFile');
const textureWidthFeetInput = document.getElementById('textureWidthFeet');
const textureWidthInchesInput = document.getElementById('textureWidthInches');
const textureHeightFeetInput = document.getElementById('textureHeightFeet');
const textureHeightInchesInput = document.getElementById('textureHeightInches');
const applyFloorTextureButton = document.getElementById('applyFloorTexture');
const cancelFloorTextureButton = document.getElementById('cancelFloorTexture');

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
const MIN_VIEW_SCALE = 0.5;
const MAX_VIEW_SCALE = 3;
const VIEW_ZOOM_STEP = 1.2;

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
let floors = [];
let nextFloorId = 1;

let objects = [];

// View transform
let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;

let selectedWalls = new Set(); // MULTIPLE wall selection
let rightClickedWall = null;

// Selection box
let isSelectionBoxActive = false;
let selectionBoxStart = null;
let selectionBoxEnd = null;
let selectionBoxAdditive = false;

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
let windowHandleDrag = null;
let selectedFloorIds = new Set();
let floorTextureTargetId = null;

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
    floors: [],
    nodes: [],
    referenceX: 0,
    referenceY: 0
};
let isPasteMode = false;
let pasteTargetX = null;
let pasteTargetY = null;

// View helpers
function getCanvasPixelScale() {
    const rect = canvas.getBoundingClientRect();
    return {
        x: rect.width / canvas.width,
        y: rect.height / canvas.height
    };
}

function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = getCanvasPixelScale();
    const canvasX = (clientX - rect.left) / scale.x;
    const canvasY = (clientY - rect.top) / scale.y;
    return {
        x: (canvasX - viewOffsetX) / viewScale,
        y: (canvasY - viewOffsetY) / viewScale
    };
}

function worldToScreen(x, y) {
    return {
        x: x * viewScale + viewOffsetX,
        y: y * viewScale + viewOffsetY
    };
}

window.getCanvasCoordsFromEvent = screenToWorld;

let isViewPanning = false;
let panOrigin = null;
let panStartOffset = null;

function applyViewZoom(factor, anchor = null) {
    const newScale = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, viewScale * factor));
    if (anchor) {
        // Keep anchor point stable while zooming
        const screenAnchor = worldToScreen(anchor.x, anchor.y);
        viewOffsetX = screenAnchor.x - anchor.x * newScale;
        viewOffsetY = screenAnchor.y - anchor.y * newScale;
    }
    viewScale = newScale;
    redrawCanvas();
}

function panView(deltaX, deltaY) {
    viewOffsetX += deltaX;
    viewOffsetY += deltaY;
    redrawCanvas();
}

function getCanvasCenterWorld() {
    return {
        x: (canvas.width / 2 - viewOffsetX) / viewScale,
        y: (canvas.height / 2 - viewOffsetY) / viewScale
    };
}

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
    if (selectedWalls.size === 0 && selectedObjectIndices.size === 0 && selectedFloorIds.size === 0) {
        alert('Please select items to copy');
        return;
    }

    // Clear clipboard
    clipboard = {
        walls: [],
        objects: [],
        floors: [],
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

    // Copy selected floors (strip non-serializable pattern)
    selectedFloorIds.forEach(floorId => {
        const floor = floors.find(f => f.id === floorId);
        if (!floor) return;
        const floorCopy = JSON.parse(JSON.stringify({
            ...floor,
            texture: floor.texture
                ? { ...floor.texture, pattern: null }
                : undefined
        }));
        clipboard.floors.push(floorCopy);
        (floor.nodeIds || []).forEach(id => selectedNodeIds.add(id));
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

    // Find bounds from floors (via their nodes)
    clipboard.floors.forEach(floor => {
        (floor.nodeIds || []).forEach(nodeId => {
            const node = clipboard.nodes.find(n => n.id === nodeId);
            if (!node) return;
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x);
            maxY = Math.max(maxY, node.y);
        });
    });
    
    // Calculate reference point (center)
    if (minX !== Infinity && maxX !== -Infinity) {
        clipboard.referenceX = (minX + maxX) / 2;
        clipboard.referenceY = (minY + maxY) / 2;
    }

    console.log('Copied:', {
        walls: clipboard.walls.length,
        objects: clipboard.objects.length,
        floors: clipboard.floors.length,
        nodes: clipboard.nodes.length,
        reference: { x: clipboard.referenceX, y: clipboard.referenceY }
    });
}

function cutSelection() {
    if (selectedWalls.size === 0 && selectedObjectIndices.size === 0 && selectedFloorIds.size === 0) {
        alert('Please select items to cut');
        return;
    }
    
    // First copy
    copySelection();
    
    // Then delete
    deleteSelection();
}

function startPasteMode(targetX = null, targetY = null) {
    if (clipboard.walls.length === 0 && clipboard.objects.length === 0 && clipboard.floors.length === 0) {
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
    selectedFloorIds.clear();

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

    // Paste floors with remapped node IDs
    clipboard.floors.forEach(oldFloor => {
        const remappedNodeIds = (oldFloor.nodeIds || []).map(id => nodeIdMap.get(id)).filter(Boolean);
        if (remappedNodeIds.length < 3) return;
        const newFloor = {
            ...JSON.parse(JSON.stringify(oldFloor)),
            id: nextFloorId++,
            nodeIds: remappedNodeIds
        };
        if (newFloor.texture) {
            newFloor.texture.pattern = null;
            if (!newFloor.texture.color && !newFloor.texture.imageSrc) {
                newFloor.texture.color = fillColorInput.value || '#d9d9d9';
            }
        } else {
            newFloor.texture = { type: 'color', color: fillColorInput.value || '#d9d9d9' };
        }
        floors.push(newFloor);
        selectedFloorIds.add(newFloor.id);
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
    if (selectedWalls.size > 0 || selectedObjectIndices.size > 0 || selectedFloorIds.size > 0) {
        pushUndoState();
        if (selectedWalls.size > 0) {
            walls = walls.filter(w => !selectedWalls.has(w));
            selectedWalls.clear();
        }
        if (selectedObjectIndices.size > 0) {
            objects = objects.filter((_, idx) => !selectedObjectIndices.has(idx));
            selectedObjectIndices.clear();
        }
        if (selectedFloorIds.size > 0) {
            floors = floors.filter(f => !selectedFloorIds.has(f.id));
            selectedFloorIds.clear();
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
// FLOOR HELPERS
// ============================================================
function feetInchesToPixels(feet, inches) {
    const totalFeet = (parseFloat(feet) || 0) + (parseFloat(inches) || 0) / 12;
    return Math.max(1, totalFeet * scale);
}

function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 1e-9) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function polygonArea(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return area / 2;
}

function buildWallAdjacency() {
    const adjacency = new Map();
    const add = (fromId, toId) => {
        const fromNode = getNodeById(fromId);
        const toNode = getNodeById(toId);
        if (!fromNode || !toNode) return;
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        if (!adjacency.has(fromId)) adjacency.set(fromId, []);
        adjacency.get(fromId).push({ to: toId, angle });
    };

    walls.forEach(w => {
        add(w.startNodeId, w.endNodeId);
        add(w.endNodeId, w.startNodeId);
    });

    adjacency.forEach(list => list.sort((a, b) => a.angle - b.angle));
    return adjacency;
}

function findWallCycles() {
    const adjacency = buildWallAdjacency();
    const visited = new Set();
    const cycles = [];

    const edgeKey = (a, b) => `${a}-${b}`;

    walls.forEach(wall => {
        [[wall.startNodeId, wall.endNodeId], [wall.endNodeId, wall.startNodeId]].forEach(([a, b]) => {
            const startKey = edgeKey(a, b);
            if (visited.has(startKey)) return;

            const polygonIds = [];
            let prev = a;
            let curr = b;
            let safety = walls.length * 4 || 20;

            while (safety-- > 0) {
                visited.add(edgeKey(prev, curr));
                polygonIds.push(prev);

                const options = adjacency.get(curr) || [];
                if (options.length < 2) return; // open chain

                const incomingIndex = options.findIndex(opt => opt.to === prev);
                if (incomingIndex === -1) return;
                const nextIndex = (incomingIndex - 1 + options.length) % options.length;
                const nextNodeId = options[nextIndex].to;

                prev = curr;
                curr = nextNodeId;

                if (prev === a && curr === b) {
                    polygonIds.push(prev);
                    break;
                }
            }

            if (polygonIds.length < 3) return;

            // Convert to points and normalize
            const polygon = polygonIds.map(id => getNodeById(id)).filter(Boolean);
            const uniqueIds = [...new Set(polygonIds)];
            if (uniqueIds.length < 3 || polygon.length < 3) return;

            const area = polygonArea(polygon);
            if (Math.abs(area) < 1) return;

            // Avoid duplicates by comparing sorted node sets
            const signature = uniqueIds.slice().sort((x, y) => x - y).join('-');
            if (!cycles.some(c => c.signature === signature)) {
                cycles.push({ signature, polygon });
            }
        });
    });

    return cycles.map(c => c.polygon);
}

function findRoomPolygonAtPoint(x, y) {
    const cycles = findWallCycles();
    let best = null;
    cycles.forEach(poly => {
        if (pointInPolygon({ x, y }, poly)) {
            const area = Math.abs(polygonArea(poly));
            if (!best || area < best.area) {
                best = { polygon: poly, area };
            }
        }
    });
    return best ? best.polygon : null;
}

function ensureFloorPattern(floor) {
    if (!floor.texture || !floor.texture.imageSrc) return;
    if (floor.texture.pattern) return;

    const image = new Image();
    image.onload = () => {
        const widthPx = floor.texture.widthPx || image.width;
        const heightPx = floor.texture.heightPx || image.height;
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = Math.max(1, Math.round(widthPx));
        tileCanvas.height = Math.max(1, Math.round(heightPx));
        const tctx = tileCanvas.getContext('2d');
        tctx.drawImage(image, 0, 0, tileCanvas.width, tileCanvas.height);
        floor.texture.pattern = ctx.createPattern(tileCanvas, 'repeat');
        redrawCanvas();
    };
    image.src = floor.texture.imageSrc;
}

function createFloorAtPoint(x, y) {
    const polygon = findRoomPolygonAtPoint(x, y);
    if (!polygon) {
        alert('No closed walls found. Close all sides to create a floor.');
        return null;
    }

    const floor = {
        id: nextFloorId++,
        nodeIds: polygon.map(p => p.id),
        texture: {
            type: 'color',
            color: fillColorInput.value || '#d9d9d9'
        }
    };

    floors.push(floor);
    return floor;
}

function getFloorPoints(floor) {
    return (floor.nodeIds || []).map(id => getNodeById(id)).filter(Boolean);
}

function getFloorAt(x, y) {
    for (let i = floors.length - 1; i >= 0; i--) {
        const floor = floors[i];
        const points = getFloorPoints(floor);
        if (points.length < 3) continue;
        if (pointInPolygon({ x, y }, points)) {
            return floor;
        }
    }
    return null;
}

// ============================================================
// HISTORY (UNDO / REDO)
// ============================================================
function cloneState() {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)),
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects)),
        floors: JSON.parse(JSON.stringify(floors)),
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
    floors = JSON.parse(JSON.stringify(state.floors || []));
    nextFloorId = floors.length ? Math.max(...floors.map(f => f.id || 0)) + 1 : 1;

    if (state.dimensions) {
        window.dimensions = JSON.parse(JSON.stringify(state.dimensions));
        window.nextDimensionId = state.dimensions.length > 0 ? Math.max(...state.dimensions.map(d => d.id)) + 1 : 1;
    }

    clipboard = JSON.parse(JSON.stringify(state.clipboard || { walls: [], objects: [], floors: [], nodes: [], referenceX: 0, referenceY: 0 }));
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
    selectedFloorIds.clear();
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
            closeFloorTextureModal();
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
            selectedFloorIds.clear();
            selectAllMode = false;
            isSelectionBoxActive = false;
            selectionBoxStart = null;
            selectionBoxEnd = null;
            hideContextMenu();
            updateToolInfo();
            redrawCanvas();
        });
    });

    if (applyFloorTextureButton) {
        applyFloorTextureButton.addEventListener('click', applyFloorTexture);
    }
    if (cancelFloorTextureButton) {
        cancelFloorTextureButton.addEventListener('click', closeFloorTextureModal);
    }

    const transformActions = [
        { button: rotateLeftButton, handler: () => rotateSelection(-15) },
        { button: rotateRightButton, handler: () => rotateSelection(15) },
        { button: flipHorizontalButton, handler: () => flipSelection('horizontal') },
        { button: flipVerticalButton, handler: () => flipSelection('vertical') },
    ];

    transformActions.forEach(({ button, handler }) => {
        if (!button) return;
        button.addEventListener('click', handler);
    });

    if (zoomInButton) {
        zoomInButton.addEventListener('click', () => applyViewZoom(VIEW_ZOOM_STEP, getCanvasCenterWorld()));
    }
    if (zoomOutButton) {
        zoomOutButton.addEventListener('click', () => applyViewZoom(1 / VIEW_ZOOM_STEP, getCanvasCenterWorld()));
    }

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

    const { x, y } = screenToWorld(e.clientX, e.clientY);

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

function moveSelectedWalls(dx, dy, { skipUndo = false } = {}) {
    if (selectedWalls.size === 0) return;

    if (!skipUndo) pushUndoState();

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

function moveSelectedObjects(dx, dy, { skipUndo = false } = {}) {
    if (selectedObjectIndices.size === 0) return;

    if (!skipUndo) pushUndoState();

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

function moveSelectedFloors(dx, dy, { skipUndo = false } = {}) {
    if (selectedFloorIds.size === 0) return;

    if (!skipUndo) pushUndoState();

    const affectedNodeIds = new Set();
    selectedFloorIds.forEach(floorId => {
        const floor = floors.find(f => f.id === floorId);
        if (!floor) return;
        (floor.nodeIds || []).forEach(id => affectedNodeIds.add(id));
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
// SELECTION BOX HELPERS
// ============================================================
function getSelectionRect() {
    if (!selectionBoxStart || !selectionBoxEnd) return null;
    const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
    const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
    const width = Math.abs(selectionBoxStart.x - selectionBoxEnd.x);
    const height = Math.abs(selectionBoxStart.y - selectionBoxEnd.y);
    return { x: minX, y: minY, width, height };
}

function drawSelectionBoxOverlay() {
    const rect = getSelectionRect();
    if (!isSelectionBoxActive || !rect) return;

    ctx.save();
    ctx.strokeStyle = '#3498db';
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.fillStyle = 'rgba(52, 152, 219, 0.12)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
}

function rectContainsPoint(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function segmentsIntersect(p1, p2, p3, p4) {
    const d = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (d === 0) return false;

    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function rectIntersectsSegment(rect, x1, y1, x2, y2) {
    if (rectContainsPoint(rect, x1, y1) || rectContainsPoint(rect, x2, y2)) return true;

    const corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
    ];

    const edges = [
        [corners[0], corners[1]],
        [corners[1], corners[2]],
        [corners[2], corners[3]],
        [corners[3], corners[0]]
    ];

    return edges.some(([a, b]) => segmentsIntersect(a, b, { x: x1, y: y1 }, { x: x2, y: y2 }));
}

function finalizeSelectionBox() {
    const rect = getSelectionRect();
    isSelectionBoxActive = false;
    selectionBoxAdditive = false;
    selectionBoxStart = null;
    selectionBoxEnd = null;

    if (!rect || (rect.width < 3 && rect.height < 3)) {
        redrawCanvas();
        return;
    }

    if (!selectionBoxAdditive) {
        selectedWalls.clear();
        selectedObjectIndices.clear();
        selectedNode = null;
        selectAllMode = false;
    }

    walls.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;
        if (rectIntersectsSegment(rect, n1.x, n1.y, n2.x, n2.y)) {
            selectedWalls.add(wall);
        }
    });

    objects.forEach((obj, index) => {
        const objRect = { x: obj.x, y: obj.y, width: obj.width, height: obj.height };
        if (rectsOverlap(rect, objRect)) {
            selectedObjectIndices.add(index);
        }
    });

    redrawCanvas();
}

// ============================================================
// TRANSFORM HELPERS
// ============================================================
function projectPointToWallSegment(px, py, x1, y1, x2, y2) {
    const ax = px - x1;
    const ay = py - y1;
    const bx = x2 - x1;
    const by = y2 - y1;
    const lenSq = bx * bx + by * by || 1;
    const t = Math.max(0, Math.min(1, (ax * bx + ay * by) / lenSq));
    return {
        x: x1 + t * bx,
        y: y1 + t * by,
        t
    };
}

function maintainDoorAttachmentForSelection() {
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!obj || obj.type !== 'door' || !obj.attachedWallId) return;

        const wall = walls.find(w => w.id === obj.attachedWallId);
        if (!wall) return;

        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;

        const projection = projectPointToWallSegment(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2,
            n1.x,
            n1.y,
            n2.x,
            n2.y
        );

        const orientation = Math.abs(n2.x - n1.x) >= Math.abs(n2.y - n1.y) ? 'horizontal' : 'vertical';

        if (typeof sizeDoorToWall === 'function') {
            sizeDoorToWall(obj, { wall, n1, n2, projection, orientation }, scale);
        }
    });
}

function getSelectionNodeIds() {
    const nodeIds = new Set();
    selectedWalls.forEach(wall => {
        nodeIds.add(wall.startNodeId);
        nodeIds.add(wall.endNodeId);
    });
    selectedFloorIds.forEach(floorId => {
        const floor = floors.find(f => f.id === floorId);
        (floor?.nodeIds || []).forEach(id => nodeIds.add(id));
    });
    return nodeIds;
}

function getSelectionCenter() {
    const points = [];
    getSelectionNodeIds().forEach(id => {
        const node = getNodeById(id);
        if (node) points.push({ x: node.x, y: node.y });
    });
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;
        points.push({ x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 });
    });

    if (points.length === 0) return null;

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function rotateSelection(angle) {
    const center = getSelectionCenter();
    if (!center) {
        alert('Please select something to rotate');
        return;
    }

    pushUndoState();

    const angleRad = (angle * Math.PI) / 180;

    // Rotate nodes belonging to selected walls/floors
    getSelectionNodeIds().forEach(id => {
        const node = getNodeById(id);
        if (!node) return;
        const dx = node.x - center.x;
        const dy = node.y - center.y;
        node.x = center.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        node.y = center.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
    });

    // Rotate objects and their orientation
    if (typeof rotateSelectedObjects === 'function') {
        rotateSelectedObjects(objects, selectedObjectIndices, angle);
    }
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const dx = cx - center.x;
        const dy = cy - center.y;
        const newCx = center.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const newCy = center.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad);
        obj.x = newCx - obj.width / 2;
        obj.y = newCy - obj.height / 2;
    });

    maintainDoorAttachmentForSelection();
    redrawCanvas();
}

function flipSelection(direction) {
    const center = getSelectionCenter();
    if (!center) {
        alert('Please select something to flip');
        return;
    }

    pushUndoState();

    // Flip nodes
    getSelectionNodeIds().forEach(id => {
        const node = getNodeById(id);
        if (!node) return;
        if (direction === 'horizontal') {
            node.x = center.x - (node.x - center.x);
        } else {
            node.y = center.y - (node.y - center.y);
        }
    });

    // Flip objects (position + orientation flags)
    if (direction === 'horizontal' && typeof flipSelectedObjectsHorizontal === 'function') {
        flipSelectedObjectsHorizontal(objects, selectedObjectIndices);
    } else if (direction === 'vertical' && typeof flipSelectedObjectsVertical === 'function') {
        flipSelectedObjectsVertical(objects, selectedObjectIndices);
    }
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const newCx = direction === 'horizontal' ? center.x - (cx - center.x) : cx;
        const newCy = direction === 'vertical' ? center.y - (cy - center.y) : cy;
        obj.x = newCx - obj.width / 2;
        obj.y = newCy - obj.height / 2;
    });

    maintainDoorAttachmentForSelection();
    redrawCanvas();
}

// ============================================================
// MOUSE HANDLERS (WITH MULTIPLE WALL SELECTION)
// ============================================================
function handleMouseDown(e) {
    // Hide context menu on any click
    hideContextMenu();

    const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
    let x = worldX;
    let y = worldY;

    // Keep pointer tracking in sync with clicks
    lastPointerCanvasX = x;
    lastPointerCanvasY = y;

    // FIXED: Only process left clicks (button 0)
    // Right clicks are handled by contextmenu event
    if (e.button !== 0) return;

    if (currentTool === 'pan') {
        isViewPanning = true;
        panOrigin = { x: e.clientX, y: e.clientY };
        panStartOffset = { x: viewOffsetX, y: viewOffsetY };
        return;
    }

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

    if (currentTool === 'floor') {
        ({ x, y } = snapPointToInch(x, y));
        pushUndoState();
        const floor = createFloorAtPoint(x, y);
        if (floor) {
            selectedFloorIds = new Set([floor.id]);
            selectedWalls.clear();
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
        }
        return;
    }

    if (currentTool === 'select') {
        const windowHandle = getWindowHandleHit(x, y);
        if (windowHandle) {
            if (windowHandle.type === 'move') {
                selectAllMode = false;
                selectedObjectIndices = new Set([windowHandle.index]);
                startObjectDrag(windowHandle.index, x, y);
            } else {
                const obj = objects[windowHandle.index];
                if (obj) {
                    pushUndoState();
                    windowHandleDrag = {
                        index: windowHandle.index,
                        handle: windowHandle.type,
                        isHorizontal: windowHandle.isHorizontal,
                        startMouse: { x, y },
                        initial: {
                            x: obj.x,
                            y: obj.y,
                            width: obj.width,
                            height: obj.height,
                            lengthPx: obj.lengthPx || Math.max(obj.width, obj.height)
                        }
                    };
                }
            }
            redrawCanvas();
            return;
        }

        const floorHit = getFloorAt(x, y);
        if (floorHit) {
            if (e.shiftKey) {
                if (selectedFloorIds.has(floorHit.id)) {
                    selectedFloorIds.delete(floorHit.id);
                } else {
                    selectedFloorIds.add(floorHit.id);
                }
            } else {
                selectedFloorIds = new Set([floorHit.id]);
                selectedWalls.clear();
                selectedObjectIndices.clear();
            }
            selectAllMode = false;
            redrawCanvas();
            return;
        }

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
            selectedFloorIds.clear();
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
                selectedFloorIds.clear();
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
            selectedFloorIds.clear();
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
            return;
        }

        // Click on empty space - clear selection unless Shift is held
        isSelectionBoxActive = true;
        selectionBoxStart = { x, y };
        selectionBoxEnd = { x, y };
        selectionBoxAdditive = e.shiftKey;

        if (!selectionBoxAdditive) {
            selectedWalls.clear();
            selectedNode = null;
            selectedObjectIndices.clear();
            selectedFloorIds.clear();
            selectAllMode = false;
        }

        redrawCanvas();
        drawSelectionBoxOverlay();
        return;
    }

    if (currentTool === 'erase') {
        const wall = getWallAt(x, y);
        const objIndex = getObjectAt(x, y);
        const floor = getFloorAt(x, y);

        if (typeof getDimensionAt === 'function') {
            const dimIndex = getDimensionAt(x, y);
            if (dimIndex !== -1) {
                pushUndoState();
                window.dimensions.splice(dimIndex, 1);
                redrawCanvas();
                return;
            }
        }

        if (floor || wall || objIndex !== -1) {
            pushUndoState();
            if (floor) {
                floors = floors.filter(f => f !== floor);
                selectedFloorIds.delete(floor.id);
            }
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
    let { x, y } = screenToWorld(e.clientX, e.clientY);

    // Track last pointer position for quick paste placement
    lastPointerCanvasX = x;
    lastPointerCanvasY = y;

    if (isViewPanning && panOrigin && panStartOffset) {
        viewOffsetX = panStartOffset.x + (e.clientX - panOrigin.x);
        viewOffsetY = panStartOffset.y + (e.clientY - panOrigin.y);
        redrawCanvas();
        return;
    }

    if (isSelectionBoxActive) {
        selectionBoxEnd = { x, y };
        coordinatesDisplay.textContent = `Select box: ${Math.abs(selectionBoxEnd.x - selectionBoxStart.x).toFixed(1)} x ${Math.abs(selectionBoxEnd.y - selectionBoxStart.y).toFixed(1)}`;
        redrawCanvas();
        drawSelectionBoxOverlay();
        return;
    }

    if (windowHandleDrag) {
        const obj = objects[windowHandleDrag.index];
        if (obj) {
            const { isHorizontal, handle, initial } = windowHandleDrag;
            ({ x, y } = snapToGridPoint(x, y));
            const minLength = scale * 1.5;

            if (isHorizontal) {
                if (handle === 'start') {
                    let newStart = x;
                    let newWidth = initial.width + (initial.x - newStart);
                    if (newWidth < minLength) {
                        newStart = initial.x + initial.width - minLength;
                        newWidth = minLength;
                    }
                    obj.x = newStart;
                    obj.width = newWidth;
                    obj.lengthPx = newWidth;
                } else if (handle === 'end') {
                    let newWidth = Math.max(minLength, x - initial.x);
                    obj.width = newWidth;
                    obj.lengthPx = newWidth;
                }
            } else {
                if (handle === 'start') {
                    let newStartY = y;
                    let newHeight = initial.height + (initial.y - newStartY);
                    if (newHeight < minLength) {
                        newStartY = initial.y + initial.height - minLength;
                        newHeight = minLength;
                    }
                    obj.y = newStartY;
                    obj.height = newHeight;
                    obj.lengthPx = newHeight;
                } else if (handle === 'end') {
                    let newHeight = Math.max(minLength, y - initial.y);
                    obj.height = newHeight;
                    obj.lengthPx = newHeight;
                }
            }

            if (obj.type === 'window' && typeof window.snapWindowToNearestWall === 'function') {
                window.snapWindowToNearestWall(obj, walls, scale);
            }

            coordinatesDisplay.textContent = `X: ${obj.x.toFixed(1)}, Y: ${obj.y.toFixed(1)}`;
            redrawCanvas();
        }
        return;
    }

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
    if (isViewPanning) {
        isViewPanning = false;
        panOrigin = null;
        panStartOffset = null;
        return;
    }

    if (draggingObjectIndex !== null) {
        stopObjectDrag();
        redrawCanvas();
        return;
    }

    if (windowHandleDrag) {
        windowHandleDrag = null;
        redrawCanvas();
        return;
    }

    if (isSelectionBoxActive) {
        finalizeSelectionBox();
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

    let { x, y } = screenToWorld(e.clientX, e.clientY);
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
    let { x, y } = screenToWorld(e.clientX, e.clientY);

    if (!isWallDrawing) {
        const floor = getFloorAt(x, y);
        if (floor) {
            openFloorTextureModal(floor);
            return;
        }
    }

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
    const visibleStartX = -viewOffsetX / viewScale;
    const visibleStartY = -viewOffsetY / viewScale;
    const visibleEndX = visibleStartX + canvas.width / viewScale;
    const visibleEndY = visibleStartY + canvas.height / viewScale;
    const startX = Math.floor(visibleStartX / gridSize) * gridSize;
    const startY = Math.floor(visibleStartY / gridSize) * gridSize;

    ctx.beginPath();
    ctx.lineWidth = 0.5 / viewScale;
    ctx.strokeStyle = '#e0e0e0';

    for (let x = startX; x <= visibleEndX; x += gridSize) {
        ctx.moveTo(x, visibleStartY);
        ctx.lineTo(x, visibleEndY);
    }
    for (let y = startY; y <= visibleEndY; y += gridSize) {
        ctx.moveTo(visibleStartX, y);
        ctx.lineTo(visibleEndX, y);
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
        const isVerticalDoor = obj.type === 'door' && obj.orientation === 'vertical';
        const drawWidth = isVerticalDoor ? obj.height : obj.width;
        const drawHeight = isVerticalDoor ? obj.width : obj.height;
        const orientationRotation = isVerticalDoor ? Math.PI / 2 : 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotRad + orientationRotation);
        ctx.scale(sx, sy);

        const localX = -drawWidth / 2;
        const localY = -drawHeight / 2;

        ctx.lineWidth = obj.lineWidth;
        ctx.strokeStyle = obj.lineColor;
        ctx.fillStyle = obj.fillColor;

        if (obj.type === 'door') {
            ctx.fillRect(localX, localY, drawWidth, drawHeight);
            ctx.strokeRect(localX, localY, drawWidth, drawHeight);
            ctx.beginPath();
            ctx.arc(localX + drawWidth, localY + drawHeight / 2, drawWidth, Math.PI, Math.PI * 1.5);
            ctx.moveTo(localX + drawWidth, localY + drawHeight / 2);
            ctx.lineTo(localX + drawWidth, localY + drawHeight / 2 - drawWidth);
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

function drawFloors() {
    floors.forEach(floor => {
        const points = getFloorPoints(floor);
        if (points.length < 3) return;

        ensureFloorPattern(floor);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        if (floor.texture && floor.texture.pattern) {
            ctx.fillStyle = floor.texture.pattern;
        } else if (floor.texture && floor.texture.color) {
            ctx.fillStyle = floor.texture.color;
        } else {
            ctx.fillStyle = fillColorInput.value || '#d9d9d9';
        }
        ctx.fill();

        if (selectedFloorIds.has(floor.id)) {
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#16a085';
            ctx.setLineDash([6, 4]);
            ctx.stroke();
        }

        ctx.restore();
    });
}

function getWindowHandles(obj) {
    const handleSize = 10;
    const center = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
    const isHorizontal = obj.orientation === 'horizontal' || obj.width >= obj.height;
    const start = isHorizontal ? { x: obj.x, y: center.y } : { x: center.x, y: obj.y };
    const end = isHorizontal ? { x: obj.x + obj.width, y: center.y } : { x: center.x, y: obj.y + obj.height };

    return { handleSize, center, start, end, isHorizontal };
}

function getWindowHandleHit(x, y) {
    for (const index of selectedObjectIndices) {
        const obj = objects[index];
        if (!obj || obj.type !== 'window') continue;

        const { handleSize, center, start, end, isHorizontal } = getWindowHandles(obj);
        const half = handleSize / 2;
        const inRect = (hx, hy) => x >= hx - half && x <= hx + half && y >= hy - half && y <= hy + half;

        if (inRect(center.x, center.y)) return { index, type: 'move', isHorizontal };
        if (inRect(start.x, start.y)) return { index, type: 'start', isHorizontal };
        if (inRect(end.x, end.y)) return { index, type: 'end', isHorizontal };
    }
    return null;
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
        ctx.moveTo(x + w, y + h / 2);
        ctx.lineTo(x + w, y + h / 2 - w);
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
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffsetX, viewOffsetY);
    drawGrid();
    drawFloors();
    drawWalls();
    drawObjects();
    drawDimensions();
    drawSelectionBoxOverlay();
    ctx.restore();
}

// ============================================================
// KEYBOARD HANDLING
// ============================================================
function selectAllEntities() {
    selectedObjectIndices = new Set(objects.map((_, i) => i));
    selectedWalls = new Set(walls);
    selectedNode = null;
    selectedFloorIds = new Set(floors.map(f => f.id));
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

    // Arrow keys to nudge selected items
    if (!e.ctrlKey && !e.metaKey) {
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
            const hasSelection = selectedObjectIndices.size > 0 || selectedWalls.size > 0 || selectedFloorIds.size > 0;
            if (hasSelection) {
                e.preventDefault();
                pushUndoState();
                moveSelectedObjects(dx, dy, { skipUndo: true });
                moveSelectedWalls(dx, dy, { skipUndo: true });
                moveSelectedFloors(dx, dy, { skipUndo: true });
                maintainDoorAttachmentForSelection();
                redrawCanvas();
                return;
            }
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
            selectedFloorIds.clear();
            selectAllMode = false;
            isSelectionBoxActive = false;
            selectionBoxStart = null;
            selectionBoxEnd = null;
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
            maintainDoorAttachmentForSelection();
            redrawCanvas();
            return;
        }
        if (key === 'v') {
            pushUndoState();
            if (typeof flipSelectedObjectsVertical === 'function') {
                flipSelectedObjectsVertical(objects, selectedObjectIndices);
            }
            maintainDoorAttachmentForSelection();
            redrawCanvas();
            return;
        }
        if (key === 'r') {
            const angle = e.shiftKey ? -15 : 15;
            pushUndoState();
            if (typeof rotateSelectedObjects === 'function') {
                rotateSelectedObjects(objects, selectedObjectIndices, angle);
            }
            maintainDoorAttachmentForSelection();
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
        case 'floor': name = 'Floor'; break;
        case 'select': name = 'Select'; break;
        case 'erase': name = 'Eraser'; break;
        case 'dimension': name = 'Dimension'; break;
    }

    if (isPasteMode) {
        name = 'Paste Mode (click to set point)';
    }

    toolInfoDisplay.textContent = `Current Tool: ${name}`;
}

// ============================================================
// FLOOR TEXTURE MODAL
// ============================================================
function pixelsToFeetInches(px) {
    const totalFeet = (px || scale) / scale;
    const feet = Math.floor(totalFeet);
    const inches = Math.max(0, Math.round((totalFeet - feet) * 12));
    return { feet, inches };
}

function openFloorTextureModal(floor) {
    if (!floorTextureModal) return;
    floorTextureTargetId = floor.id;
    const tex = floor.texture || {};
    const widthDefault = pixelsToFeetInches(tex.widthPx || scale);
    const heightDefault = pixelsToFeetInches(tex.heightPx || scale);

    if (textureWidthFeetInput) textureWidthFeetInput.value = widthDefault.feet;
    if (textureWidthInchesInput) textureWidthInchesInput.value = widthDefault.inches;
    if (textureHeightFeetInput) textureHeightFeetInput.value = heightDefault.feet;
    if (textureHeightInchesInput) textureHeightInchesInput.value = heightDefault.inches;
    if (floorTextureFileInput) floorTextureFileInput.value = '';

    floorTextureModal.classList.remove('hidden');
}

function closeFloorTextureModal() {
    if (!floorTextureModal) return;
    floorTextureTargetId = null;
    if (floorTextureFileInput) floorTextureFileInput.value = '';
    floorTextureModal.classList.add('hidden');
}

function applyFloorTexture() {
    if (!floorTextureTargetId) {
        closeFloorTextureModal();
        return;
    }

    const floor = floors.find(f => f.id === floorTextureTargetId);
    if (!floor) {
        closeFloorTextureModal();
        return;
    }

    const widthPx = feetInchesToPixels(textureWidthFeetInput.value, textureWidthInchesInput.value);
    const heightPx = feetInchesToPixels(textureHeightFeetInput.value, textureHeightInchesInput.value);
    const file = floorTextureFileInput && floorTextureFileInput.files && floorTextureFileInput.files[0];

    const applyImage = (src) => {
        floor.texture = {
            type: 'pattern',
            imageSrc: src,
            widthPx,
            heightPx,
            pattern: null
        };
        ensureFloorPattern(floor);
        redrawCanvas();
        closeFloorTextureModal();
    };

    pushUndoState();

    if (file) {
        const reader = new FileReader();
        reader.onload = () => applyImage(reader.result);
        reader.readAsDataURL(file);
        return;
    }

    if (floor.texture && floor.texture.imageSrc) {
        floor.texture.widthPx = widthPx;
        floor.texture.heightPx = heightPx;
        floor.texture.pattern = null;
        ensureFloorPattern(floor);
        redrawCanvas();
        closeFloorTextureModal();
        return;
    }

    floor.texture = { type: 'color', color: fillColorInput.value || '#d9d9d9' };
    redrawCanvas();
    closeFloorTextureModal();
}

function updateGrid() {
    gridSize = parseInt(gridSizeInput.value, 10) || 20;
    snapToGrid = snapToGridCheckbox.checked;
    redrawCanvas();
}

window.onload = init;

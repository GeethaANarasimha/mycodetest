/* ============================================================
   APZOK — 2D WALL DESIGNER ENGINE (WITH SPLIT & JOINT WALLS)
============================================================ */

// ---------------- DOM ELEMENTS ----------------
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.querySelector('.canvas-container');
const toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
const staircaseToolButton = document.querySelector('.tool-btn[data-tool="staircase"]');
const doorTypeSelect = document.getElementById('doorType');
const wallThicknessFeetInput = document.getElementById('wallThicknessFeet');
const wallThicknessInchesInput = document.getElementById('wallThicknessInches');
const lineWidthInput = document.getElementById('lineWidth');
const lineColorInput = document.getElementById('lineColor');
const textColorInput = document.getElementById('textColor');
const textBoldButton = document.getElementById('textBold');
const textItalicButton = document.getElementById('textItalic');
const textFontIncreaseButton = document.getElementById('textFontIncrease');
const textFontDecreaseButton = document.getElementById('textFontDecrease');
const fillColorInput = document.getElementById('fillColor');
const gridSizeInput = document.getElementById('gridSize');
const snapToGridCheckbox = document.getElementById('snapToGrid');
const showDimensionsCheckbox = document.getElementById('showDimensions');
const toggleGridButton = document.getElementById('toggleGrid');
const coordinatesDisplay = document.querySelector('.coordinates');
const toolInfoDisplay = document.querySelector('.tool-info');
const measurementFontIncreaseButton = document.getElementById('measurementFontIncrease');
const measurementFontDecreaseButton = document.getElementById('measurementFontDecrease');
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
const backgroundImageModal = document.getElementById('backgroundImageModal');
const backgroundImageFileInput = document.getElementById('backgroundImageFile');
const backgroundPreview = document.getElementById('backgroundPreview');
const backgroundPreviewPlaceholder = document.getElementById('backgroundPreviewPlaceholder');
const backgroundPreviewCanvas = document.getElementById('backgroundPreviewCanvas');
const backgroundPreviewCtx = backgroundPreviewCanvas?.getContext('2d');
const backgroundDistanceInput = document.getElementById('backgroundDistance');
const startBackgroundMeasurementButton = document.getElementById('startBackgroundMeasurement');
const cancelBackgroundImageButton = document.getElementById('cancelBackgroundImage');
const backgroundCalibrationBar = document.getElementById('backgroundCalibrationBar');
const backgroundCalibrationText = document.getElementById('backgroundCalibrationText');
const cancelBackgroundMeasurementButton = document.getElementById('cancelBackgroundMeasurement');
const finishBackgroundMeasurementButton = document.getElementById('finishBackgroundMeasurement');
const backgroundMeasurementHint = document.getElementById('backgroundMeasurementHint');
const toggleBackgroundImageButton = document.getElementById('toggleBackgroundImage');
const toggle3DViewButton = document.getElementById('toggle3DView');
const textModal = document.getElementById('textModal');
const textModalInput = document.getElementById('textModalInput');
const textModalConfirm = document.getElementById('textModalConfirm');
const textModalCancel = document.getElementById('textModalCancel');
const staircaseModal = document.getElementById('staircaseModal');
const staircaseModeButtons = document.querySelectorAll('.staircase-mode-btn');
const staircaseStepsSection = document.getElementById('staircaseStepsSection');
const staircaseLandingSection = document.getElementById('staircaseLandingSection');
const staircaseWidthFeetInput = document.getElementById('staircaseWidthFeet');
const staircaseWidthInchesInput = document.getElementById('staircaseWidthInches');
const staircaseRunInchesInput = document.getElementById('staircaseRunInches');
const staircaseStepsInput = document.getElementById('staircaseSteps');
const landingWidthFeetInput = document.getElementById('landingWidthFeet');
const landingWidthInchesInput = document.getElementById('landingWidthInches');
const landingLengthFeetInput = document.getElementById('landingLengthFeet');
const landingLengthInchesInput = document.getElementById('landingLengthInches');
const landingTypeRadios = document.querySelectorAll('input[name="landingType"]');
const squaredLandingHint = document.getElementById('squaredLandingHint');
const staircaseSummary = document.getElementById('staircaseSummary');
const staircaseApplyButton = document.getElementById('staircaseApply');
const staircaseCancelButton = document.getElementById('staircaseCancel');
const saveProjectButton = document.getElementById('saveProject');
const uploadProjectButton = document.getElementById('uploadProject');
const projectFileInput = document.getElementById('projectFileInput');
const threeContainer = document.getElementById('threeContainer');
const threeStatus = document.getElementById('threeStatus');
const horizontalRuler = document.getElementById('horizontalRuler');
const verticalRuler = document.getElementById('verticalRuler');

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
let scale = 20; // 20px = 1ft (can be recalibrated with background image)
const NODE_RADIUS = 6;
const NODE_HIT_RADIUS = 10;
const ALIGN_HINT_COLOR = '#e74c3c';
const MAX_HISTORY = 50;
const INTERSECTION_TOLERANCE = 5;
const DEFAULT_WALL_COLOR = '#000000';
const DEFAULT_3D_WALL_COLOR = '#e0dcdc';
const DEFAULT_DOOR_LINE = '#8b5a2b';
const DEFAULT_DOOR_FILL = '#e6c9a8';
const DEFAULT_WINDOW_LINE = '#3b83bd';
const DEFAULT_WINDOW_FILL = '#ffffff';
const DEFAULT_STAIR_FILL = '#e5e7eb';
const MIN_VIEW_SCALE = 0.5;
const MAX_VIEW_SCALE = 3;
const VIEW_ZOOM_STEP = 1.2;
const WALL_ANGLE_SNAP_DEGREES = 15;
const SAVE_FILE_EXTENSION = '.ipynb';
const SAVE_SECRET = 'apzok-project-key';
const DEFAULT_TREAD_DEPTH_INCHES = 10;
const STAIRCASE_MAGNET_THRESHOLD = 12;
const RULER_SIZE = 28;
const DEFAULT_VIEW_MARGIN_FEET = 3;

// ---------------- STATE ----------------
let currentTool = 'select';
let isDrawing = false;
let startX, startY;
let currentX, currentY;

let gridSize = parseInt(gridSizeInput.value, 10);
let snapToGrid = snapToGridCheckbox.checked;
let showGrid = true;
let showDimensions = showDimensionsCheckbox.checked;
let textFontSize = 18;
let textIsBold = false;
let textIsItalic = false;
let measurementFontSize = 12;

let nodes = [];
let walls = [];
let nextNodeId = 1;
let nextWallId = 1;
let floors = [];
let nextFloorId = 1;
let nextStairGroupId = 1;
let selectedDimensionIndex = null;
let dimensionDrag = null;

let objects = [];

let staircaseSettings = {
    mode: 'steps',
    widthFeet: 3,
    widthInches: 0,
    runInches: DEFAULT_TREAD_DEPTH_INCHES,
    steps: 10,
    landingType: 'rectangular',
    landingWidthFeet: 4,
    landingWidthInches: 0,
    landingLengthFeet: 4,
    landingLengthInches: 0,
    treadDepthInches: DEFAULT_TREAD_DEPTH_INCHES
};

function setSelectedDimension(index) {
    selectedDimensionIndex = index;
    window.selectedDimensionIndex = index;
}

function clearDimensionSelection() {
    setSelectedDimension(null);
    dimensionDrag = null;
}

// Background image + measurement
let backgroundImageData = null; // committed image { image, x, y, width, height }
let backgroundImageDraft = null; // in-progress selection before measurement is applied
let measurementLineNormalized = null; // normalized coordinates relative to preview image
let isBackgroundMeasurementActive = false;
let measurementDragHandle = null;
let measurementDragLast = null;
let measurementDistanceFeet = null;
let isBackgroundImageVisible = true;

const BASE_CANVAS_WIDTH = canvas.width;
const BASE_CANVAS_HEIGHT = canvas.height;

// View transform
let viewScale = 1;
let viewOffsetX = 0;
let viewOffsetY = 0;
let last2DScrollLeft = 0;
let last2DScrollTop = 0;

let selectedWalls = new Set(); // MULTIPLE wall selection
let rightClickedWall = null;

// Selection box
let isSelectionBoxActive = false;
let selectionBoxStart = null;
let selectionBoxEnd = null;
let selectionBoxAdditive = false;

function snapRotation(angle, step = 5) {
    const normalized = ((angle % 360) + 360) % 360;
    return (Math.round(normalized / step) * step) % 360;
}

function snapAngleRadians(angle, stepDegrees = WALL_ANGLE_SNAP_DEGREES) {
    const angleDegrees = (angle * 180) / Math.PI;
    const snappedDegrees = snapRotation(angleDegrees, stepDegrees);
    return (snappedDegrees * Math.PI) / 180;
}

// WALL CHAINING
let isWallDrawing = false;
let wallChain = [];
let wallPreviewX = null;
let wallPreviewY = null;
let alignmentHints = [];

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
let staircaseHandleDrag = null;
let staircaseEditTargetIndex = null;
let groupDragOffsets = null;
let selectedFloorIds = new Set();
let floorTextureTargetId = null;
let isSelectionGrouped = false;

// Prevent paste mode from being cancelled when switching tools programmatically
let suppressPasteCancel = false;

// Track last interaction points for immediate paste placement
let lastContextMenuCanvasX = null;
let lastContextMenuCanvasY = null;
let lastPointerCanvasX = null;
let lastPointerCanvasY = null;
let rightClickedFloorEdge = null;

// Floor polygon lasso
let isFloorLassoActive = false;
let floorLassoPoints = [];
let floorLassoPreview = null;
let floorHoverCorner = null;
let floorDragData = null;

// View mode (2D/3D)
let is3DView = false;
let threeScene = null;
let threeRenderer = null;
let threeCamera = null;
let threeControls = null;
let wallMeshes = [];
let threeContentGroup = null;
let orbitCenterHelper = null;
let threeLibsPromise = null;
let useFallback3DRenderer = false;
let fallback3DCanvas = null;
let fallback3DCtx = null;
let fallback3DAnimationId = null;
let fallback3DCamera = {
    distance: 80,
    theta: Math.PI / 4,
    phi: Math.PI / 4,
    target: { x: 0, y: 5, z: 0 },
    autoRotate: false,
    isDragging: false,
    dragMode: 'orbit',
    lastPointer: null
};
const THREE_WALL_HEIGHT_FEET = 10;
const THREE_FLOOR_THICKNESS_FEET = 5;
const THREE_PLAN_OUTLINE_HEIGHT = 0.05;

// undo / redo
let undoStack = [];
let redoStack = [];
let pendingTextPlacement = null;
let textModalResolver = null;

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
let lastPropertyContext = null;

// Layered drawings
let layerSnapshots = {};
let isProjectLoading = false;

function currentLayerId() {
    return typeof getActiveLayerId === 'function' ? getActiveLayerId() : 'default-layer';
}

function createEmptyLayerSnapshot() {
    return {
        nodes: [],
        walls: [],
        objects: [],
        floors: [],
        dimensions: [],
        clipboard: {
            walls: [],
            objects: [],
            floors: [],
            nodes: [],
            referenceX: 0,
            referenceY: 0
        },
        ids: {
            nextNodeId: 1,
            nextWallId: 1,
            nextFloorId: 1,
            nextStairGroupId: 1
        },
        undoStack: [],
        redoStack: []
    };
}

function ensureLayerSnapshot(layerId) {
    if (!layerSnapshots[layerId]) {
        layerSnapshots[layerId] = createEmptyLayerSnapshot();
    }
    return layerSnapshots[layerId];
}

function cloneLayerStatePayload() {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)),
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects)),
        floors: JSON.parse(JSON.stringify(floors)),
        dimensions: JSON.parse(JSON.stringify(window.dimensions || [])),
        clipboard: JSON.parse(JSON.stringify(clipboard)),
        ids: {
            nextNodeId,
            nextWallId,
            nextFloorId,
            nextStairGroupId
        },
        undoStack: JSON.parse(JSON.stringify(undoStack)),
        redoStack: JSON.parse(JSON.stringify(redoStack))
    };
}

function captureLayerSnapshot(layerId = currentLayerId()) {
    layerSnapshots[layerId] = cloneLayerStatePayload();
}

function resetTransientState() {
    selectedWalls.clear();
    rightClickedWall = null;
    rightClickedFloorEdge = null;
    selectedNode = null;
    isDraggingNode = false;
    dragDir = null;
    dragOriginNodePos = null;
    dragOriginMousePos = null;
    floorDragData = null;
    isWallDrawing = false;
    wallChain = [];
    wallPreviewX = null;
    wallPreviewY = null;
    alignmentHints = [];
    ignoreNextClick = false;
    selectedFloorIds.clear();
    selectedObjectIndices.clear();
    selectAllMode = false;
    resetFloorLasso();
    clearDimensionSelection();

    if (typeof window.resetDimensionTool === 'function') {
        window.resetDimensionTool();
    }
}

function loadLayerSnapshot(layerId = currentLayerId()) {
    const snapshot = ensureLayerSnapshot(layerId);
    nodes = JSON.parse(JSON.stringify(snapshot.nodes));
    walls = JSON.parse(JSON.stringify(snapshot.walls));
    objects = JSON.parse(JSON.stringify(snapshot.objects));
    floors = JSON.parse(JSON.stringify(snapshot.floors));

    if (snapshot.dimensions) {
        window.dimensions = JSON.parse(JSON.stringify(snapshot.dimensions));
        window.nextDimensionId = snapshot.dimensions.length > 0 ? Math.max(...snapshot.dimensions.map(d => d.id)) + 1 : 1;
    }

    clipboard = JSON.parse(JSON.stringify(snapshot.clipboard || clipboard));

    nextNodeId = snapshot.ids?.nextNodeId ?? (nodes.length ? Math.max(...nodes.map(n => n.id || 0)) + 1 : 1);
    nextWallId = snapshot.ids?.nextWallId ?? (walls.length ? Math.max(...walls.map(w => w.id || 0)) + 1 : 1);
    nextFloorId = snapshot.ids?.nextFloorId ?? (floors.length ? Math.max(...floors.map(f => f.id || 0)) + 1 : 1);
    nextStairGroupId = snapshot.ids?.nextStairGroupId ?? nextStairGroupId;

    undoStack = JSON.parse(JSON.stringify(snapshot.undoStack || []));
    redoStack = JSON.parse(JSON.stringify(snapshot.redoStack || []));

    isPasteMode = false;
    pasteTargetX = null;
    pasteTargetY = null;

    resetTransientState();
    redrawCanvas();
}

function exportLayerDrawings() {
    captureLayerSnapshot();
    const exported = {};
    Object.entries(layerSnapshots).forEach(([layerId, snapshot]) => {
        exported[layerId] = {
            nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
            walls: JSON.parse(JSON.stringify(snapshot.walls)),
            objects: JSON.parse(JSON.stringify(snapshot.objects)),
            floors: JSON.parse(JSON.stringify(snapshot.floors)),
            dimensions: JSON.parse(JSON.stringify(snapshot.dimensions || [])),
            ids: JSON.parse(JSON.stringify(snapshot.ids || {}))
        };
    });
    return exported;
}

function importLayerDrawings(layerData) {
    layerSnapshots = {};
    if (!layerData || typeof layerData !== 'object') return;
    Object.entries(layerData).forEach(([layerId, snapshot]) => {
        layerSnapshots[layerId] = {
            ...createEmptyLayerSnapshot(),
            ...snapshot,
            undoStack: [],
            redoStack: []
        };
    });
}

function handleLayerChange(nextLayerId, previousLayerId) {
    if (!nextLayerId) return;
    if (!isProjectLoading && previousLayerId) {
        captureLayerSnapshot(previousLayerId);
    }
    loadLayerSnapshot(nextLayerId);
}

function handleLayerStructureChange(change) {
    if (!change) return;
    if (change.type === 'add' && change.layer?.id) {
        ensureLayerSnapshot(change.layer.id);
        return;
    }

    if (change.type === 'delete' && change.layerId) {
        delete layerSnapshots[change.layerId];
        if (change.nextActiveLayerId) {
            loadLayerSnapshot(change.nextActiveLayerId);
        }
        return;
    }
}

function setupLayering() {
    const activeLayerId = currentLayerId();
    ensureLayerSnapshot(activeLayerId);
    captureLayerSnapshot(activeLayerId);

    if (typeof onLayerChange === 'function') {
        onLayerChange(handleLayerChange);
    }

    if (typeof window.onLayerStructureChange === 'function') {
        window.onLayerStructureChange(handleLayerStructureChange);
    }
}

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
    // Calibrate pointer location against any CSS scaling/zoom so hit-testing stays
    // accurate regardless of the current view scale or device zoom level.
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

function formatFeetLabel(totalFeet) {
    const sign = totalFeet < 0 ? '-' : '';
    const absFeet = Math.abs(totalFeet);
    const wholeFeet = Math.floor(absFeet);
    const inches = Math.round((absFeet - wholeFeet) * 12);
    if (inches === 12) {
        return `${sign}${wholeFeet + 1}ft`;
    }
    if (inches === 0) {
        return `${sign}${wholeFeet}ft`;
    }
    return `${sign}${wholeFeet}ft ${inches}in`;
}

function isMultipleOf(value, step, epsilon = 1e-4) {
    const remainder = Math.abs(value % step);
    return remainder < epsilon || Math.abs(remainder - step) < epsilon;
}

function getCanvasCoordsFromEvent(eventOrX, eventY) {
    if (eventOrX && typeof eventOrX === 'object' && 'clientX' in eventOrX) {
        return screenToWorld(eventOrX.clientX, eventOrX.clientY);
    }
    return screenToWorld(eventOrX, eventY);
}

window.getCanvasCoordsFromEvent = getCanvasCoordsFromEvent;

let isViewPanning = false;
let panOrigin = null;
let panStartOffset = null;

function withViewTransform(drawFn) {
    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffsetX, viewOffsetY);
    drawFn();
    ctx.restore();
}

function applyViewZoom(factor, anchor = null) {
    const newScale = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, viewScale * factor));
    if (anchor) {
        // Keep anchor point stable while zooming
        const screenAnchor = worldToScreen(anchor.x, anchor.y);
        viewOffsetX = screenAnchor.x - anchor.x * newScale;
        viewOffsetY = screenAnchor.y - anchor.y * newScale;
    }
    viewScale = newScale;
    syncCanvasScrollArea();
    redrawCanvas();
}

function panView(deltaX, deltaY) {
    const pixelScale = getCanvasPixelScale();
    viewOffsetX += deltaX / pixelScale.x;
    viewOffsetY += deltaY / pixelScale.y;
    syncCanvasScrollArea();
    redrawCanvas();
}

function syncCanvasScrollArea() {
    if (!canvasContainer) return;
    // Keep the canvas at its base size so panning/scrolling uses view transforms
    // instead of stretching the element itself. This avoids the grid appearing
    // to scale when using the mouse wheel to pan vertically.
    canvas.style.minWidth = `${BASE_CANVAS_WIDTH}px`;
    canvas.style.minHeight = `${BASE_CANVAS_HEIGHT}px`;
}

function resetViewToOrigin() {
    const marginPx = DEFAULT_VIEW_MARGIN_FEET * scale * viewScale;
    viewOffsetX = marginPx;
    viewOffsetY = marginPx;

    if (canvasContainer) {
        // Make sure the visible corner aligns with the rulers instead of keeping
        // any previous scroll position.
        canvasContainer.scrollLeft = 0;
        canvasContainer.scrollTop = 0;
    }
}

function ensureDefaultViewIfMissing(state) {
    const hasOffsets = Number.isFinite(state?.view?.offsetX) && Number.isFinite(state?.view?.offsetY);
    if (!hasOffsets) {
        resetViewToOrigin();
    }
}

function drawRulerBackground(ctx, width, height, isVertical = false) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    if (isVertical) {
        ctx.moveTo(width - 0.5, 0);
        ctx.lineTo(width - 0.5, height);
    } else {
        ctx.moveTo(0, height - 0.5);
        ctx.lineTo(width, height - 0.5);
    }
    ctx.stroke();
}

function drawHorizontalRuler() {
    if (!horizontalRuler || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const containerRect = canvasContainer?.getBoundingClientRect();
    if (containerRect) {
        // Keep the ruler origin aligned with the visible canvas origin even
        // when the container is scrolled. Using the raw offsets (including
        // negative values) lets the ruler track the canvas position instead of
        // sticking to the container edge.
        const offsetLeft = rect.left - containerRect.left;
        const offsetTop = rect.top - containerRect.top;
        horizontalRuler.style.left = `${offsetLeft}px`;
        horizontalRuler.style.top = `${offsetTop}px`;
    }
    const dpr = window.devicePixelRatio || 1;
    horizontalRuler.width = rect.width * dpr;
    horizontalRuler.height = RULER_SIZE * dpr;
    horizontalRuler.style.width = `${rect.width}px`;
    horizontalRuler.style.height = `${RULER_SIZE}px`;
    const rCtx = horizontalRuler.getContext('2d');
    rCtx.save();
    rCtx.scale(dpr, dpr);
    drawRulerBackground(rCtx, rect.width, RULER_SIZE, false);

    const canvasScaleX = rect.width / canvas.width;
    const screenPxPerFoot = Math.max(1, scale * viewScale * canvasScaleX);
    const startFeet = (-viewOffsetX / viewScale) / scale;
    const visibleFeet = rect.width / screenPxPerFoot;

    const inchSpacing = screenPxPerFoot / 12;
    if (inchSpacing >= 6) {
        const firstInch = Math.floor(startFeet * 12);
        const lastInch = Math.ceil((startFeet + visibleFeet) * 12);
        rCtx.strokeStyle = '#e2e8f0';
        for (let i = firstInch; i <= lastInch; i++) {
            const feetValue = i / 12;
            const x = ((feetValue * scale) * viewScale + viewOffsetX) * canvasScaleX;
            rCtx.beginPath();
            rCtx.moveTo(x + 0.5, RULER_SIZE - 10);
            rCtx.lineTo(x + 0.5, RULER_SIZE);
            rCtx.stroke();
        }
    }

    const firstFootTick = Math.floor(startFeet);
    const lastFootTick = Math.ceil(startFeet + visibleFeet);
    const showFootTicks = screenPxPerFoot >= 2;
    rCtx.strokeStyle = '#94a3b8';
    if (showFootTicks) {
        for (let feetValue = firstFootTick; feetValue <= lastFootTick; feetValue += 1) {
            const x = ((feetValue * scale) * viewScale + viewOffsetX) * canvasScaleX;
            const isZero = Math.abs(feetValue) < 1e-4;
            const isLabelTick = isMultipleOf(feetValue, 5);
            const tickHeight = isZero ? RULER_SIZE : (isLabelTick ? 14 : 8);
            rCtx.strokeStyle = isZero ? '#ef4444' : '#94a3b8';
            rCtx.beginPath();
            rCtx.moveTo(x + 0.5, RULER_SIZE - tickHeight);
            rCtx.lineTo(x + 0.5, RULER_SIZE);
            rCtx.stroke();
        }
    }

    const showLabels = screenPxPerFoot * 5 >= 32;
    if (showLabels) {
        rCtx.fillStyle = '#334155';
        rCtx.font = '11px Arial';
        for (let feetValue = Math.ceil(startFeet / 5) * 5; feetValue <= startFeet + visibleFeet; feetValue += 5) {
            const x = ((feetValue * scale) * viewScale + viewOffsetX) * canvasScaleX;
            const isZero = Math.abs(feetValue) < 1e-4;
            const label = formatFeetLabel(feetValue);
            rCtx.save();
            rCtx.translate(x + 4, 12);
            rCtx.fillStyle = isZero ? '#b91c1c' : '#334155';
            rCtx.fillText(label, 0, 0);
            rCtx.restore();
        }
    }
    rCtx.restore();
}

function drawVerticalRuler() {
    if (!verticalRuler || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const containerRect = canvasContainer?.getBoundingClientRect();
    if (containerRect) {
        // Keep the ruler origin aligned with the visible canvas origin even
        // when the container is scrolled. Clamping prevents the ruler from
        // sliding outside the viewport (and effectively disappearing) when the
        // user pans or scrolls far from the canvas origin.
        const offsetLeft = rect.left - containerRect.left;
        const offsetTop = rect.top - containerRect.top;
        verticalRuler.style.left = `${Math.max(0, offsetLeft)}px`;
        verticalRuler.style.top = `${Math.max(0, offsetTop)}px`;
    }
    const dpr = window.devicePixelRatio || 1;
    verticalRuler.width = RULER_SIZE * dpr;
    verticalRuler.height = rect.height * dpr;
    verticalRuler.style.width = `${RULER_SIZE}px`;
    verticalRuler.style.height = `${rect.height}px`;
    const rCtx = verticalRuler.getContext('2d');
    rCtx.save();
    rCtx.scale(dpr, dpr);
    drawRulerBackground(rCtx, RULER_SIZE, rect.height, true);

    const canvasScaleY = rect.height / canvas.height;
    const screenPxPerFoot = Math.max(1, scale * viewScale * canvasScaleY);
    const startFeet = (-viewOffsetY / viewScale) / scale;
    const visibleFeet = rect.height / screenPxPerFoot;

    const inchSpacing = screenPxPerFoot / 12;
    if (inchSpacing >= 6) {
        const firstInch = Math.floor(startFeet * 12);
        const lastInch = Math.ceil((startFeet + visibleFeet) * 12);
        rCtx.strokeStyle = '#e2e8f0';
        for (let i = firstInch; i <= lastInch; i++) {
            const feetValue = i / 12;
            const y = ((feetValue * scale) * viewScale + viewOffsetY) * canvasScaleY;
            rCtx.beginPath();
            rCtx.moveTo(RULER_SIZE - 10, y + 0.5);
            rCtx.lineTo(RULER_SIZE, y + 0.5);
            rCtx.stroke();
        }
    }

    const firstFootTick = Math.floor(startFeet);
    const lastFootTick = Math.ceil(startFeet + visibleFeet);
    const showFootTicks = screenPxPerFoot >= 2;
    rCtx.strokeStyle = '#94a3b8';
    if (showFootTicks) {
        for (let feetValue = firstFootTick; feetValue <= lastFootTick; feetValue += 1) {
            const y = ((feetValue * scale) * viewScale + viewOffsetY) * canvasScaleY;
            const isZero = Math.abs(feetValue) < 1e-4;
            const isLabelTick = isMultipleOf(feetValue, 5);
            const tickWidth = isZero ? RULER_SIZE : (isLabelTick ? 14 : 8);
            rCtx.strokeStyle = isZero ? '#ef4444' : '#94a3b8';
            rCtx.beginPath();
            rCtx.moveTo(isZero ? 0 : RULER_SIZE - tickWidth, y + 0.5);
            rCtx.lineTo(RULER_SIZE, y + 0.5);
            rCtx.stroke();
        }
    }

    const showLabels = screenPxPerFoot * 5 >= 32;
    if (showLabels) {
        rCtx.fillStyle = '#334155';
        rCtx.font = '11px Arial';
        for (let feetValue = Math.ceil(startFeet / 5) * 5; feetValue <= startFeet + visibleFeet; feetValue += 5) {
            const y = ((feetValue * scale) * viewScale + viewOffsetY) * canvasScaleY;
            const isZero = Math.abs(feetValue) < 1e-4;
            const label = formatFeetLabel(feetValue);
            rCtx.save();
            rCtx.translate(RULER_SIZE - 4, y + 14);
            rCtx.rotate(-Math.PI / 2);
            rCtx.fillStyle = isZero ? '#b91c1c' : '#334155';
            rCtx.fillText(label, 0, 0);
            rCtx.restore();
        }
    }
    rCtx.restore();
}

function drawRulers() {
    const shouldHide = is3DView;
    if (horizontalRuler) horizontalRuler.classList.toggle('hidden', shouldHide);
    if (verticalRuler) verticalRuler.classList.toggle('hidden', shouldHide);
    if (shouldHide) return;
    drawHorizontalRuler();
    drawVerticalRuler();
}

function fitViewToBackground(data) {
    if (!data || !canvasContainer) return;
    const containerRect = canvasContainer.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return;

    const pixelScale = getCanvasPixelScale();
    const margin = 20;
    const availableWidth = containerRect.width / pixelScale.x - margin * 2;
    const availableHeight = containerRect.height / pixelScale.y - margin * 2;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const scaleForWidth = availableWidth / data.width;
    const scaleForHeight = availableHeight / data.height;
    const targetScale = Math.min(
        MAX_VIEW_SCALE,
        Math.max(MIN_VIEW_SCALE, Math.min(scaleForWidth, scaleForHeight, 1))
    );

    const viewCenterX = availableWidth / 2 + margin;
    const viewCenterY = availableHeight / 2 + margin;
    const backgroundCenterX = data.x + data.width / 2;
    const backgroundCenterY = data.y + data.height / 2;

    viewScale = targetScale;
    viewOffsetX = viewCenterX - backgroundCenterX * viewScale;
    viewOffsetY = viewCenterY - backgroundCenterY * viewScale;

    syncCanvasScrollArea();
    redrawCanvas();
}

function getCanvasCenterWorld() {
    return {
        x: (canvas.width / 2 - viewOffsetX) / viewScale,
        y: (canvas.height / 2 - viewOffsetY) / viewScale
    };
}

// ============================================================
// BACKGROUND IMAGE + MEASUREMENT LINE
// ============================================================
function resetBackgroundModal() {
    if (backgroundImageFileInput) backgroundImageFileInput.value = '';
    if (backgroundPreview) backgroundPreview.style.display = 'none';
    if (backgroundPreview) backgroundPreview.src = '';
    if (backgroundPreviewPlaceholder) backgroundPreviewPlaceholder.style.display = 'block';
    if (startBackgroundMeasurementButton) startBackgroundMeasurementButton.disabled = true;
    measurementDistanceFeet = null;
    if (backgroundDistanceInput) backgroundDistanceInput.value = '';
    backgroundImageDraft = null;
    measurementLineNormalized = null;
    isBackgroundMeasurementActive = false;
    measurementDragHandle = null;
    measurementDragLast = null;
    updateBackgroundMeasurementUI();
}

function openBackgroundImageModal() {
    if (!backgroundImageModal) return;
    backgroundImageModal.classList.remove('hidden');
    const previewData = backgroundImageDraft || backgroundImageData;
    updateBackgroundPreview(previewData);
    if (previewData && startBackgroundMeasurementButton) startBackgroundMeasurementButton.disabled = false;
    if (backgroundDistanceInput) backgroundDistanceInput.value = hasValidMeasurementDistance() ? measurementDistanceFeet : '';
    if (!previewData) {
        resetBackgroundModal();
    }

    updateBackgroundMeasurementUI();
}

function closeBackgroundImageModal() {
    if (!backgroundImageModal) return;
    backgroundImageModal.classList.add('hidden');
}

function createBackgroundImageData(img) {
    const maxWidth = canvas.width * 0.9;
    const maxHeight = canvas.height * 0.9;
    const scaleFactor = Math.min(1, maxWidth / img.width, maxHeight / img.height);
    const width = img.width * scaleFactor;
    const height = img.height * scaleFactor;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    return { image: img, x, y, width, height };
}

function updateBackgroundPreview(previewData) {
    if (!backgroundPreview) return;

    if (previewData) {
        backgroundPreview.src = previewData.image.src;
        backgroundPreview.style.display = 'block';
        if (backgroundPreviewPlaceholder) backgroundPreviewPlaceholder.style.display = 'none';
    } else {
        backgroundPreview.src = '';
        backgroundPreview.style.display = 'none';
        if (backgroundPreviewPlaceholder) backgroundPreviewPlaceholder.style.display = 'block';
    }

    syncPreviewCanvasSize();
    redrawPreviewMeasurementOverlay();
}

function syncPreviewCanvasSize() {
    if (!backgroundPreviewCanvas || !backgroundPreview) return;
    const frameRect = backgroundPreviewCanvas.parentElement?.getBoundingClientRect();
    if (!frameRect) return;

    const frameWidth = frameRect.width;
    const frameHeight = frameRect.height;
    const naturalWidth = backgroundPreview.naturalWidth;
    const naturalHeight = backgroundPreview.naturalHeight;
    if (!frameWidth || !frameHeight || !naturalWidth || !naturalHeight) return;

    // Calculate the rendered image size inside the contain-fit frame so that
    // the measurement overlay matches the visible pixels instead of the full
    // frame (which can include letterboxing for different aspect ratios).
    const scale = Math.min(frameWidth / naturalWidth, frameHeight / naturalHeight);
    const displayWidth = naturalWidth * scale;
    const displayHeight = naturalHeight * scale;
    const offsetX = (frameWidth - displayWidth) / 2;
    const offsetY = (frameHeight - displayHeight) / 2;

    backgroundPreviewCanvas.width = displayWidth;
    backgroundPreviewCanvas.height = displayHeight;
    backgroundPreviewCanvas.style.width = `${displayWidth}px`;
    backgroundPreviewCanvas.style.height = `${displayHeight}px`;
    backgroundPreviewCanvas.style.left = `${offsetX}px`;
    backgroundPreviewCanvas.style.top = `${offsetY}px`;
}

function getPreviewDimensions() {
    if (!backgroundPreviewCanvas || !backgroundPreview) return null;
    if (backgroundPreview.style.display === 'none') return null;
    const width = backgroundPreviewCanvas.width;
    const height = backgroundPreviewCanvas.height;
    if (!width || !height) return null;
    return { width, height };
}

function toNormalized(value, size) {
    return Math.min(1, Math.max(0, value / size));
}

function hasValidMeasurementDistance() {
    return Number.isFinite(measurementDistanceFeet) && measurementDistanceFeet > 0;
}

function getMeasurementLabel() {
    return hasValidMeasurementDistance() ? `${measurementDistanceFeet} ft` : 'distance';
}

function redrawPreviewMeasurementOverlay() {
    if (!backgroundPreviewCtx || !backgroundPreviewCanvas) return;
    const dims = getPreviewDimensions();
    backgroundPreviewCtx.clearRect(0, 0, backgroundPreviewCanvas.width, backgroundPreviewCanvas.height);

    const showOverlay = isBackgroundMeasurementActive && measurementLineNormalized && dims;
    backgroundPreviewCanvas.classList.toggle('active', !!showOverlay);
    if (!showOverlay) return;

    const label = `${getMeasurementLabel()}`;
    const start = {
        x: measurementLineNormalized.start.x * dims.width,
        y: measurementLineNormalized.start.y * dims.height
    };
    const end = {
        x: measurementLineNormalized.end.x * dims.width,
        y: measurementLineNormalized.end.y * dims.height
    };

    backgroundPreviewCtx.save();
    backgroundPreviewCtx.lineWidth = 2;
    backgroundPreviewCtx.strokeStyle = '#0ea5e9';
    backgroundPreviewCtx.fillStyle = '#0ea5e9';

    backgroundPreviewCtx.beginPath();
    backgroundPreviewCtx.moveTo(start.x, start.y);
    backgroundPreviewCtx.lineTo(end.x, end.y);
    backgroundPreviewCtx.stroke();

    const handleHalf = 8;
    [start, end].forEach(point => {
        backgroundPreviewCtx.beginPath();
        backgroundPreviewCtx.moveTo(point.x - handleHalf, point.y);
        backgroundPreviewCtx.lineTo(point.x + handleHalf, point.y);
        backgroundPreviewCtx.moveTo(point.x, point.y - handleHalf);
        backgroundPreviewCtx.lineTo(point.x, point.y + handleHalf);
        backgroundPreviewCtx.stroke();
    });

    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    backgroundPreviewCtx.fillStyle = 'rgba(14, 165, 233, 0.85)';
    backgroundPreviewCtx.strokeStyle = '#fff';
    backgroundPreviewCtx.lineWidth = 1;
    backgroundPreviewCtx.font = '12px Arial';
    const textWidth = backgroundPreviewCtx.measureText(label).width;
    const padding = 6;
    const boxX = midX - textWidth / 2 - padding;
    const boxY = midY - 16;
    const boxWidth = textWidth + padding * 2;
    const boxHeight = 20;

    backgroundPreviewCtx.beginPath();
    backgroundPreviewCtx.rect(boxX, boxY, boxWidth, boxHeight);
    backgroundPreviewCtx.fill();
    backgroundPreviewCtx.stroke();

    backgroundPreviewCtx.fillStyle = '#fff';
    backgroundPreviewCtx.textBaseline = 'middle';
    backgroundPreviewCtx.fillText(label, midX - textWidth / 2, boxY + boxHeight / 2);
    backgroundPreviewCtx.restore();
}

function updateBackgroundMeasurementUI() {
    if (backgroundImageModal) {
        backgroundImageModal.classList.toggle('measurement-mode', isBackgroundMeasurementActive);
    }

    const previewData = backgroundImageDraft || backgroundImageData;
    updateBackgroundPreview(previewData);

    if (backgroundMeasurementHint) {
        const hasDistance = hasValidMeasurementDistance();
        backgroundMeasurementHint.classList.toggle('hidden', !isBackgroundMeasurementActive || !hasDistance);
        if (isBackgroundMeasurementActive && hasDistance) {
            backgroundMeasurementHint.textContent = `Drag the measurement line on the preview to match ${getMeasurementLabel()}, then press Finish.`;
        }
    }

    if (finishBackgroundMeasurementButton) {
        finishBackgroundMeasurementButton.classList.toggle('hidden', !isBackgroundMeasurementActive);
        finishBackgroundMeasurementButton.disabled = !measurementLineNormalized || !hasValidMeasurementDistance();
    }

    if (startBackgroundMeasurementButton) {
        startBackgroundMeasurementButton.textContent = isBackgroundMeasurementActive ? 'Reset Measurement' : 'Next';
        const hasImage = !!(backgroundImageDraft || backgroundImageData);
        if (!isBackgroundMeasurementActive) {
            startBackgroundMeasurementButton.disabled = !hasImage || !hasValidMeasurementDistance();
        }
    }

    redrawPreviewMeasurementOverlay();
}

function updateMeasurementPreview() {
    if (backgroundDistanceInput) {
        backgroundDistanceInput.value = hasValidMeasurementDistance() ? measurementDistanceFeet : '';
    }

    updateBackgroundMeasurementUI();
}

function setMeasurementDistance(feetValue, { resetLine = false } = {}) {
    const parsed = parseFloat(feetValue);
    const isValid = Number.isFinite(parsed) && parsed > 0;
    measurementDistanceFeet = isValid ? parsed : null;
    if (backgroundDistanceInput) {
        backgroundDistanceInput.value = isValid ? parsed : '';
    }

    if (resetLine) {
        measurementLineNormalized = null;
        ensureMeasurementLine();
    }

    if (backgroundCalibrationText) {
        const label = getMeasurementLabel();
        backgroundCalibrationText.textContent = hasValidMeasurementDistance()
            ? `Use the preview overlay to match ${label} on your image.`
            : 'Enter a known distance to calibrate the preview overlay.';
    }

    if (backgroundMeasurementHint && isBackgroundMeasurementActive && hasValidMeasurementDistance()) {
        backgroundMeasurementHint.textContent = `Drag the measurement line on the preview to match ${getMeasurementLabel()}, then press Finish.`;
    }

    if (finishBackgroundMeasurementButton) {
        finishBackgroundMeasurementButton.disabled = !measurementLineNormalized || !hasValidMeasurementDistance();
    }

    updateBackgroundMeasurementUI();
    redrawPreviewMeasurementOverlay();
}

function syncBackgroundControls() {
    if (!toggleBackgroundImageButton) return;
    if (backgroundImageData) {
        toggleBackgroundImageButton.classList.remove('hidden');
        toggleBackgroundImageButton.textContent = isBackgroundImageVisible ? 'Hide Background Image' : 'Show Background Image';
    } else {
        toggleBackgroundImageButton.classList.add('hidden');
    }
}

function handleBackgroundFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
        resetBackgroundModal();
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Only image formats are supported for the background.');
        resetBackgroundModal();
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.onload = () => {
            backgroundImageDraft = createBackgroundImageData(img);
            measurementLineNormalized = null;
            updateBackgroundPreview(backgroundImageDraft);
            if (startBackgroundMeasurementButton) startBackgroundMeasurementButton.disabled = !hasValidMeasurementDistance();
            isBackgroundImageVisible = false;
            syncBackgroundControls();
            updateBackgroundMeasurementUI();
            redrawCanvas();
        };
        img.src = reader.result;
    };
    reader.readAsDataURL(file);
}

function ensureMeasurementLine() {
    const activeBackground = backgroundImageDraft || backgroundImageData;
    if (!activeBackground) return null;
    if (measurementLineNormalized) return measurementLineNormalized;

    measurementLineNormalized = {
        start: { x: 0.25, y: 0.85 },
        end: { x: 0.75, y: 0.85 }
    };
    return measurementLineNormalized;
}

function startBackgroundMeasurement() {
    const activeBackground = backgroundImageDraft || backgroundImageData;
    if (!activeBackground) {
        alert('Please upload an image first.');
        return;
    }

    setMeasurementDistance(backgroundDistanceInput?.value, { resetLine: true });
    if (!hasValidMeasurementDistance()) {
        alert('Please enter a known distance in feet before measuring.');
        updateBackgroundMeasurementUI();
        return;
    }
    ensureMeasurementLine();
    isBackgroundMeasurementActive = true;
    measurementDragHandle = null;
    measurementDragLast = null;
    if (backgroundCalibrationBar) backgroundCalibrationBar.classList.remove('hidden');
    isBackgroundImageVisible = false;
    updateBackgroundMeasurementUI();
    updateToolInfo();
    redrawPreviewMeasurementOverlay();
}

function cancelBackgroundMeasurement() {
    isBackgroundMeasurementActive = false;
    measurementDragHandle = null;
    measurementDragLast = null;
    measurementLineNormalized = null;
    if (backgroundCalibrationBar) backgroundCalibrationBar.classList.add('hidden');
    updateBackgroundMeasurementUI();
    updateToolInfo();
    redrawPreviewMeasurementOverlay();
}

function applyBackgroundMeasurement(closeModal = false) {
    if (!measurementLineNormalized) return false;
    const activeBackground = backgroundImageDraft || backgroundImageData;
    if (!activeBackground) return false;
    const dx = (measurementLineNormalized.end.x - measurementLineNormalized.start.x) * activeBackground.width;
    const dy = (measurementLineNormalized.end.y - measurementLineNormalized.start.y) * activeBackground.height;
    const pixelDistance = Math.hypot(dx, dy);
    if (!pixelDistance) {
        alert('Place the measurement line to calculate scale.');
        return false;
    }

    if (!hasValidMeasurementDistance()) {
        alert('Enter a valid distance in feet to calculate scale.');
        return false;
    }

    const newScale = pixelDistance / measurementDistanceFeet;
    scale = newScale;
    gridSize = newScale;
    if (gridSizeInput) gridSizeInput.value = Math.round(gridSize);
    showGrid = true;
    backgroundImageData = activeBackground;
    backgroundImageDraft = null;
    measurementLineNormalized = null;
    isBackgroundMeasurementActive = false;
    measurementDragHandle = null;
    measurementDragLast = null;
    if (backgroundCalibrationBar) backgroundCalibrationBar.classList.add('hidden');
    isBackgroundImageVisible = true;
    updateBackgroundMeasurementUI();
    syncBackgroundControls();
    updateToolInfo();
    redrawPreviewMeasurementOverlay();
    redrawCanvas();
    fitViewToBackground(backgroundImageData);
    if (closeModal) closeBackgroundImageModal();
    return true;
}

function finishBackgroundMeasurement() {
    setMeasurementDistance(backgroundDistanceInput?.value);
    const applied = applyBackgroundMeasurement(true);
    if (!applied && finishBackgroundMeasurementButton) {
        finishBackgroundMeasurementButton.disabled = !measurementLineNormalized;
    }
}

function startMeasurementDragOnPreview(x, y) {
    if (!measurementLineNormalized) return false;
    const dims = getPreviewDimensions();
    if (!dims) return false;
    const radius = 10;

    const start = {
        x: measurementLineNormalized.start.x * dims.width,
        y: measurementLineNormalized.start.y * dims.height
    };
    const end = {
        x: measurementLineNormalized.end.x * dims.width,
        y: measurementLineNormalized.end.y * dims.height
    };

    const hitStart = Math.hypot(x - start.x, y - start.y) <= radius;
    const hitEnd = Math.hypot(x - end.x, y - end.y) <= radius;
    if (hitStart) {
        measurementDragHandle = 'start';
    } else if (hitEnd) {
        measurementDragHandle = 'end';
    } else {
        const distToLine = distanceToSegment(x, y, start.x, start.y, end.x, end.y);
        if (distToLine <= 8) {
            measurementDragHandle = 'line';
        } else {
            const halfLength = (measurementDistanceFeet || 10) * dims.width / 8;
            measurementLineNormalized.start = {
                x: toNormalized(x - halfLength, dims.width),
                y: toNormalized(y, dims.height)
            };
            measurementLineNormalized.end = {
                x: toNormalized(x + halfLength, dims.width),
                y: toNormalized(y, dims.height)
            };
            measurementDragHandle = 'line';
        }
    }

    measurementDragLast = { x, y };
    return true;
}

function updateMeasurementDragOnPreview(x, y) {
    if (!measurementLineNormalized || !measurementDragHandle) return;
    const dims = getPreviewDimensions();
    if (!dims) return;

    if (measurementDragHandle === 'start') {
        measurementLineNormalized.start = { x: toNormalized(x, dims.width), y: toNormalized(y, dims.height) };
    } else if (measurementDragHandle === 'end') {
        measurementLineNormalized.end = { x: toNormalized(x, dims.width), y: toNormalized(y, dims.height) };
    } else if (measurementDragHandle === 'line' && measurementDragLast) {
        const dx = x - measurementDragLast.x;
        const dy = y - measurementDragLast.y;
        const start = {
            x: measurementLineNormalized.start.x * dims.width + dx,
            y: measurementLineNormalized.start.y * dims.height + dy
        };
        const end = {
            x: measurementLineNormalized.end.x * dims.width + dx,
            y: measurementLineNormalized.end.y * dims.height + dy
        };
        measurementLineNormalized.start = { x: toNormalized(start.x, dims.width), y: toNormalized(start.y, dims.height) };
        measurementLineNormalized.end = { x: toNormalized(end.x, dims.width), y: toNormalized(end.y, dims.height) };
    }

    measurementDragLast = { x, y };
    redrawPreviewMeasurementOverlay();
    if (finishBackgroundMeasurementButton) finishBackgroundMeasurementButton.disabled = !measurementLineNormalized || !hasValidMeasurementDistance();
}

function finalizeMeasurementDragOnPreview() {
    measurementDragHandle = null;
    measurementDragLast = null;
}

function getPreviewPointerPosition(event) {
    if (!backgroundPreviewCanvas) return null;
    const rect = backgroundPreviewCanvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function toggleBackgroundImageVisibility() {
    if (!backgroundImageData) return;
    isBackgroundImageVisible = !isBackgroundImageVisible;
    syncBackgroundControls();
    redrawCanvas();
}

function deleteBackgroundImage() {
    if (!backgroundImageData) return;
    backgroundImageData = null;
    backgroundImageDraft = null;
    measurementLineNormalized = null;
    isBackgroundMeasurementActive = false;
    isBackgroundImageVisible = true;
    measurementDragHandle = null;
    measurementDragLast = null;
    if (backgroundCalibrationBar) backgroundCalibrationBar.classList.add('hidden');
    resetBackgroundModal();
    closeBackgroundImageModal();
    syncBackgroundControls();
    updateBackgroundMeasurementUI();
    redrawCanvas();
}

function isStairObject(obj) {
    return obj?.type === 'staircase';
}

function getStairGroupOffsets(index) {
    const source = objects[index];
    if (!isStairObject(source) || !source.stairGroupId) return null;

    const offsets = [];
    objects.forEach((candidate, candidateIndex) => {
        if (
            candidateIndex !== index &&
            isStairObject(candidate) &&
            candidate.stairGroupId === source.stairGroupId
        ) {
            offsets.push({
                index: candidateIndex,
                offsetX: candidate.x - source.x,
                offsetY: candidate.y - source.y
            });
        }
    });
    return offsets.length > 0 ? offsets : null;
}

function expandSelectionWithGroups() {
    const additions = [];
    selectedObjectIndices.forEach(index => {
        const obj = objects[index];
        if (!isStairObject(obj) || !obj.stairGroupId) return;

        objects.forEach((candidate, candidateIndex) => {
            if (
                isStairObject(candidate) &&
                candidate.stairGroupId === obj.stairGroupId
            ) {
                additions.push(candidateIndex);
            }
        });
    });

    additions.forEach(idx => selectedObjectIndices.add(idx));
}

function hasAnySelection() {
    return selectedWalls.size > 0 || selectedObjectIndices.size > 0 || selectedFloorIds.size > 0;
}

function getSceneCenter() {
    const points = [];

    nodes.forEach(node => {
        points.push({ x: node.x, y: node.y });
    });

    objects.forEach(obj => {
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

function getGroupedSelectionCenter() {
    const center = getSelectionCenter();
    if (center) return center;
    if (isSelectionGrouped || selectAllMode) return getSceneCenter();
    return null;
}

function groupSelectionElements({ silent = false } = {}) {
    if (!hasAnySelection()) {
        if (!silent) alert('Select one or more elements to group.');
        return false;
    }

    isSelectionGrouped = true;
    return true;
}

function ungroupSelectionElements() {
    isSelectionGrouped = false;
}

function clearSelectionGroupingIfEmpty() {
    if (!hasAnySelection()) {
        ungroupSelectionElements();
    }
}

function getSelectedStairIndices() {
    return Array.from(selectedObjectIndices).filter(index => isStairObject(objects[index]));
}

function getSharedStairGroupId(indices) {
    if (!indices || indices.length === 0) return null;
    const ids = new Set();
    indices.forEach(index => {
        const id = objects[index]?.stairGroupId;
        if (id) ids.add(id);
    });
    return ids.size === 1 ? ids.values().next().value : null;
}

function groupSelectedStaircases() {
    const stairIndices = getSelectedStairIndices();
    if (stairIndices.length < 2) {
        alert('Select two or more stair elements to group.');
        return;
    }

    const sharedGroup = getSharedStairGroupId(stairIndices);
    if (sharedGroup) return;

    const groupId = nextStairGroupId++;
    stairIndices.forEach(index => {
        const obj = objects[index];
        if (!isStairObject(obj)) return;
        obj.stairGroupId = groupId;
    });

    expandSelectionWithGroups();
    redrawCanvas();
}

function ungroupSelectedStaircases() {
    const stairIndices = getSelectedStairIndices();
    const sharedGroup = getSharedStairGroupId(stairIndices);
    if (!sharedGroup) return;

    stairIndices.forEach(index => {
        const obj = objects[index];
        if (isStairObject(obj) && obj.stairGroupId === sharedGroup) {
            delete obj.stairGroupId;
        }
    });

    redrawCanvas();
}

// ============================================================
// CONTEXT MENU FUNCTIONS
// ============================================================

function showContextMenu(x, y, { wall = null, floorEdge = null } = {}) {
    rightClickedWall = wall;
    rightClickedFloorEdge = floorEdge;

    const hasSelection = selectedWalls.size > 0 || selectedObjectIndices.size > 0;
    const hasBackgroundImage = !!backgroundImageData;
    const stairIndices = getSelectedStairIndices();
    const sharedStairGroup = getSharedStairGroupId(stairIndices);
    const canGroupStairs = stairIndices.length >= 2 && !sharedStairGroup;
    const canUngroupStairs = stairIndices.length > 0 && !!sharedStairGroup;
    const backgroundVisibilityLabel = isBackgroundImageVisible ? 'Hide Background Image' : 'Show Background Image';
    const backgroundMenu = hasBackgroundImage ? `
        <div class="context-item" data-action="toggleBackgroundVisibility" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            ${backgroundVisibilityLabel}
        </div>
        ${isBackgroundImageVisible ? `
            <div class="context-item" data-action="deleteBackground" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Delete Background Image
            </div>
        ` : ''}
    ` : '';

    const backgroundAddItem = hasBackgroundImage ? '' : `
        <div class="context-item" data-action="background" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            Add Background Image
        </div>
    `;

    const floorMenu = floorEdge ? `
        <div class="context-item" data-action="addFloorPoint" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            Add Floor Point
        </div>
    ` : '';

    contextMenu.innerHTML = `
        <div style="padding: 8px 12px; background: #f8f9fa; border-bottom: 1px solid #eee; font-weight: bold;">
            ${wall ? 'Wall Options' : 'Designer Options'}
        </div>
        ${floorMenu}
        ${backgroundAddItem}
        ${backgroundMenu}
        ${canGroupStairs ? `
            <div class="context-item" data-action="groupStairs" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Group Stair Elements
            </div>
        ` : ''}
        ${canUngroupStairs ? `
            <div class="context-item" data-action="ungroupStairs" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
                Ungroup Stair Elements
            </div>
        ` : ''}
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
        case 'groupStairs':
            groupSelectedStaircases();
            break;
        case 'ungroupStairs':
            ungroupSelectedStaircases();
            break;
        case 'addFloorPoint':
            if (rightClickedFloorEdge) {
                pushUndoState();
                const targetFloor = floors.find(f => f.id === rightClickedFloorEdge.floor.id) || rightClickedFloorEdge.floor;
                insertFloorPointAtEdge({ ...rightClickedFloorEdge, floor: targetFloor });
                if (targetFloor) {
                    selectedFloorIds = new Set([targetFloor.id]);
                }
                redrawCanvas();
            }
            break;
        case 'background':
            openBackgroundImageModal();
            break;
        case 'toggleBackgroundVisibility':
            toggleBackgroundImageVisibility();
            break;
        case 'deleteBackground':
            deleteBackgroundImage();
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
    rightClickedFloorEdge = null;
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
    const stairGroupMap = new Map();
    
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

        if (isStairObject(newObj) && newObj.stairGroupId) {
            if (!stairGroupMap.has(newObj.stairGroupId)) {
                stairGroupMap.set(newObj.stairGroupId, nextStairGroupId++);
            }
            newObj.stairGroupId = stairGroupMap.get(newObj.stairGroupId);
        }

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
            ctx.lineCap = 'square';
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
        } else if (oldObj.type === 'staircase') {
            drawStaircaseGraphic({
                ...oldObj,
                x,
                y,
                width: w,
                height: h
            }, x, y, w, h);
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

        cleanupOrphanNodes();
        alignmentHints = [];
        redrawCanvas();
    }
}

function cleanupOrphanNodes() {
    const usedNodeIds = new Set();

    walls.forEach(wall => {
        usedNodeIds.add(wall.startNodeId);
        usedNodeIds.add(wall.endNodeId);
    });

    wallChain.forEach(node => {
        if (node?.id) usedNodeIds.add(node.id);
    });

    nodes = nodes.filter(node => usedNodeIds.has(node.id));

    if (selectedNode && !usedNodeIds.has(selectedNode.id)) {
        selectedNode = null;
    }

    alignmentHints = [];
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

    cleanupOrphanNodes();

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

function resetFloorLasso() {
    isFloorLassoActive = false;
    floorLassoPoints = [];
    floorLassoPreview = null;
    floorHoverCorner = null;
}

function startFloorLasso(point) {
    isFloorLassoActive = true;
    floorLassoPoints = [point];
    floorLassoPreview = null;
}

function addFloorLassoPoint(point) {
    if (!isFloorLassoActive) {
        startFloorLasso(point);
        return;
    }

    const lastPoint = floorLassoPoints[floorLassoPoints.length - 1];
    if (lastPoint && Math.hypot(lastPoint.x - point.x, lastPoint.y - point.y) < 0.1) {
        return;
    }

    floorLassoPoints.push(point);
    floorLassoPreview = null;
}

function finalizeFloorLasso(finalPoint = null) {
    const polygonPoints = floorLassoPoints.slice();
    if (finalPoint) {
        polygonPoints.push(finalPoint);
    }

    if (polygonPoints.length < 3) {
        resetFloorLasso();
        redrawCanvas();
        return null;
    }

    const polygon = polygonPoints.map(p => ({ x: p.x, y: p.y }));
    if (Math.abs(polygonArea(polygon)) < 1) {
        resetFloorLasso();
        redrawCanvas();
        return null;
    }

    pushUndoState();

    const nodeIds = polygonPoints.map(p => {
        if (p.nodeId) {
            const node = getNodeById(p.nodeId);
            if (node) return node.id;
        }
        const node = findOrCreateNode(p.x, p.y);
        return node.id;
    });

    const floor = {
        id: nextFloorId++,
        nodeIds,
        texture: {
            type: 'color',
            color: fillColorInput.value || '#d9d9d9'
        }
    };

    floors.push(floor);
    selectedFloorIds = new Set([floor.id]);
    selectedWalls.clear();
    selectedObjectIndices.clear();
    selectAllMode = false;

    resetFloorLasso();
    redrawCanvas();

    return floor;
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
    if (!best) return null;

    const polygon = best.polygon;
    const centroid = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    centroid.x /= polygon.length;
    centroid.y /= polygon.length;

    const orderedPolygon = polygon.slice().sort((a, b) => {
        const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
        const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
        return angleA - angleB;
    });

    return orderedPolygon;
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

function getFloorsUsingNode(nodeId) {
    return floors.filter(floor => (floor.nodeIds || []).includes(nodeId));
}

function projectPointToSegment(px, py, ax, ay, bx, by) {
    const vx = bx - ax;
    const vy = by - ay;
    const lenSq = vx * vx + vy * vy;
    if (lenSq === 0) return { x: ax, y: ay, t: 0 };
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / lenSq));
    return {
        x: ax + vx * t,
        y: ay + vy * t,
        t
    };
}

function findFloorEdgeAt(x, y, tolerance = 8) {
    let closest = null;
    for (const floor of floors) {
        const points = getFloorPoints(floor);
        if (points.length < 2) continue;
        for (let i = 0; i < points.length; i++) {
            const start = points[i];
            const end = points[(i + 1) % points.length];
            const projection = projectPointToSegment(x, y, start.x, start.y, end.x, end.y);
            const dist = Math.hypot(x - projection.x, y - projection.y);
            if (dist <= tolerance && (!closest || dist < closest.distance)) {
                closest = {
                    floor,
                    startIndex: i,
                    distance: dist,
                    point: { x: projection.x, y: projection.y }
                };
            }
        }
    }
    return closest;
}

function insertFloorPointAtEdge(edgeInfo) {
    if (!edgeInfo || !edgeInfo.floor || !edgeInfo.point) return null;
    const insertIndex = (edgeInfo.startIndex + 1) % edgeInfo.floor.nodeIds.length;
    const snapped = snapPointToInch(edgeInfo.point.x, edgeInfo.point.y);
    const node = findOrCreateNode(snapped.x, snapped.y);
    edgeInfo.floor.nodeIds.splice(insertIndex, 0, node.id);
    return node;
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
    alignmentHints = [];
    ignoreNextClick = false;
    selectedFloorIds.clear();
    selectedObjectIndices.clear();
    selectAllMode = false;
    resetFloorLasso();

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
// PROJECT SAVE / LOAD
// ============================================================
function encodeBytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decodeBase64ToBytes(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function xorEncrypt(text, key) {
    const textBytes = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);
    const encrypted = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
        encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return encodeBytesToBase64(encrypted);
}

function xorDecrypt(payload, key) {
    const encrypted = decodeBase64ToBytes(payload);
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
}

function stripFloorPattern(floor) {
    const clone = JSON.parse(JSON.stringify(floor));
    if (clone.texture) {
        clone.texture.pattern = null;
    }
    return clone;
}

function buildProjectState() {
    const background = backgroundImageData ? {
        src: backgroundImageData.image?.src || '',
        x: backgroundImageData.x,
        y: backgroundImageData.y,
        width: backgroundImageData.width,
        height: backgroundImageData.height
    } : null;

    return {
        version: 1,
        nodes: JSON.parse(JSON.stringify(nodes)),
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects)),
        floors: (floors || []).map(stripFloorPattern),
        dimensions: JSON.parse(JSON.stringify(window.dimensions || [])),
        clipboard: JSON.parse(JSON.stringify(clipboard)),
        layerState: typeof getLayerState === 'function' ? getLayerState() : null,
        layerDrawings: exportLayerDrawings(),
        objects: JSON.parse(JSON.stringify(objects)),
        floors: (floors || []).map(stripFloorPattern),
        dimensions: JSON.parse(JSON.stringify(window.dimensions || [])),
        clipboard: JSON.parse(JSON.stringify(clipboard)),
        layerState: typeof getLayerState === 'function' ? getLayerState() : null,
        settings: {
            scale,
            gridSize,
            snapToGrid,
            showDimensions,
            showGrid,
            measurementFontSize,
            textFontSize,
            textIsBold,
            textIsItalic,
            lineWidth: parseInt(lineWidthInput?.value, 10) || 2,
            lineColor: lineColorInput?.value || DEFAULT_WALL_COLOR,
            fillColor: fillColorInput?.value || '#d9d9d9'
        },
        view: { scale: viewScale, offsetX: viewOffsetX, offsetY: viewOffsetY },
        ids: { nextNodeId, nextWallId, nextFloorId, nextStairGroupId },
        background,
        measurementDistanceFeet,
        backgroundImageVisible: isBackgroundImageVisible
    };
}

function hydrateBackgroundFromState(background) {
    if (!background || !background.src) {
        backgroundImageData = null;
        syncBackgroundControls();
        redrawCanvas();
        return;
    }

    const img = new Image();
    img.onload = () => {
        backgroundImageData = {
            image: img,
            x: background.x,
            y: background.y,
            width: background.width,
            height: background.height
        };
        syncBackgroundControls();
        redrawCanvas();
    };
    img.src = background.src;
}

function applyProjectState(state) {
     isProjectLoading = true;

     importLayerDrawings(state.layerDrawings);

     const hasLayerDrawings = state.layerDrawings && Object.keys(state.layerDrawings).length > 0;

     if (hasLayerDrawings && typeof applyLayerState === 'function') {
         applyLayerState(state.layerState);
         loadLayerSnapshot(currentLayerId());
     } else {
         nodes = JSON.parse(JSON.stringify(state.nodes || []));
         walls = JSON.parse(JSON.stringify(state.walls || []));
         objects = JSON.parse(JSON.stringify(state.objects || []));
         floors = (state.floors || []).map(stripFloorPattern);

         if (state.dimensions) {
             window.dimensions = JSON.parse(JSON.stringify(state.dimensions));
             window.nextDimensionId = state.dimensions.length > 0 ? Math.max(...state.dimensions.map(d => d.id)) + 1 : 1;
         }

         clipboard = JSON.parse(JSON.stringify(state.clipboard || { walls: [], objects: [], floors: [], nodes: [], referenceX: 0, referenceY: 0 }));
         isPasteMode = false;
         pasteTargetX = null;
         pasteTargetY = null;

         if (typeof applyLayerState === 'function') {
             applyLayerState(state.layerState);
         }

         captureLayerSnapshot();
     }

     const settings = state.settings || {};
     scale = settings.scale ?? scale;
     gridSize = settings.gridSize ?? gridSize;
     snapToGrid = settings.snapToGrid ?? snapToGrid;
     showGrid = settings.showGrid ?? showGrid;
     showDimensions = settings.showDimensions ?? showDimensions;
     measurementFontSize = settings.measurementFontSize ?? measurementFontSize;
     textFontSize = settings.textFontSize ?? textFontSize;
     textIsBold = settings.textIsBold ?? textIsBold;
     textIsItalic = settings.textIsItalic ?? textIsItalic;
     measurementDistanceFeet = state.measurementDistanceFeet ?? measurementDistanceFeet;
     isBackgroundImageVisible = state.backgroundImageVisible ?? isBackgroundImageVisible;

     viewScale = state.view?.scale ?? viewScale;
     viewOffsetX = state.view?.offsetX ?? viewOffsetX;
     viewOffsetY = state.view?.offsetY ?? viewOffsetY;
     ensureDefaultViewIfMissing(state);

     if (!hasLayerDrawings) {
         nextNodeId = state.ids?.nextNodeId ?? (nodes.length ? Math.max(...nodes.map(n => n.id || 0)) + 1 : 1);
         nextWallId = state.ids?.nextWallId ?? (walls.length ? Math.max(...walls.map(w => w.id || 0)) + 1 : 1);
         nextFloorId = state.ids?.nextFloorId ?? (floors.length ? Math.max(...floors.map(f => f.id || 0)) + 1 : 1);
         const existingGroupMax = objects.length ? Math.max(...objects.map(o => o?.stairGroupId || 0)) : 0;
         nextStairGroupId = state.ids?.nextStairGroupId ?? existingGroupMax + 1;
     }

     if (gridSizeInput) gridSizeInput.value = Math.round(gridSize);
     if (snapToGridCheckbox) snapToGridCheckbox.checked = snapToGrid;
     if (showDimensionsCheckbox) showDimensionsCheckbox.checked = showDimensions;
     if (lineWidthInput && Number.isFinite(settings.lineWidth)) lineWidthInput.value = settings.lineWidth;
     if (lineColorInput && settings.lineColor) lineColorInput.value = settings.lineColor;
     if (fillColorInput && settings.fillColor) fillColorInput.value = settings.fillColor;

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
     alignmentHints = [];
     ignoreNextClick = false;
     selectedFloorIds.clear();
     selectedObjectIndices.clear();
     selectAllMode = false;
     resetFloorLasso();

     hydrateBackgroundFromState(state.background);
     floors.forEach(ensureFloorPattern);

     updateGrid();
     syncCanvasScrollArea();
     updateTextStyleButtons();
     updateMeasurementPreview();
     updateToolInfo();
     updatePropertiesPanel();
     redrawCanvas();

     isProjectLoading = false;
 }

function saveProjectToFile() {
    try {
        const state = buildProjectState();
        const encrypted = xorEncrypt(JSON.stringify(state), SAVE_SECRET);
        const blob = new Blob([encrypted], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `apzok-project${SAVE_FILE_EXTENSION}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to save project', error);
        alert('Failed to save project. Please try again.');
    }
}

function handleProjectFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(SAVE_FILE_EXTENSION)) {
        alert('Please select a valid .ipynb project file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const decrypted = xorDecrypt(reader.result, SAVE_SECRET);
            const state = JSON.parse(decrypted);
            applyProjectState(state);
        } catch (error) {
            console.error('Failed to load project', error);
            alert('Could not load project. Ensure you selected a valid .ipynb file.');
        }
    };
    reader.readAsText(file);
}

// ============================================================
// INIT
// ============================================================
function init() {
    canvas.setAttribute('tabindex', '0');

    canvas.addEventListener('mousedown', (event) => {
        // Prevent the browser from scrolling the layout when the canvas gains
        // focus (some browsers try to scroll the focused element into view).
        if (typeof canvas.focus === 'function') {
            canvas.focus({ preventScroll: true });
        } else {
            canvas.focus();
        }
    });

    wallThicknessFeetInput.value = '0';
    wallThicknessInchesInput.value = '6';

    document.getElementById('lineColorPreview').style.backgroundColor = lineColorInput.value || DEFAULT_WALL_COLOR;
    document.getElementById('fillColorPreview').style.backgroundColor = fillColorInput.value || '#d9d9d9';

    if (typeof initLayerTools === 'function') {
        initLayerTools();
    }

    setupLayering();

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
            resetFloorLasso();
            closeFloorTextureModal();
            closeBackgroundImageModal();
            cancelBackgroundMeasurement();
            closeTextModal();
            closeStaircaseModal();
        }
    });

    if (staircaseToolButton) {
        staircaseToolButton.addEventListener('click', () => {
            // Make sure the settings dialog appears even if other listeners short-circuit
            staircaseEditTargetIndex = null;
            openStaircaseModal();
        });
    }

    toolButtons.forEach(button => {
        button.addEventListener('click', () => {
            toolButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentTool = button.getAttribute('data-tool');

            resetFloorLasso();

            if (currentTool !== 'wall') {
                isWallDrawing = false;
                wallChain = [];
                wallPreviewX = wallPreviewY = null;
                alignmentHints = [];
            }

            if (currentTool !== 'dimension' && typeof window.resetDimensionTool === 'function') {
                window.resetDimensionTool();
            }

            if (currentTool === 'staircase') {
                staircaseEditTargetIndex = null;
                openStaircaseModal();
            } else {
                closeStaircaseModal();
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

    if (backgroundImageFileInput) {
        backgroundImageFileInput.addEventListener('change', handleBackgroundFileChange);
    }
    if (startBackgroundMeasurementButton) {
        startBackgroundMeasurementButton.addEventListener('click', startBackgroundMeasurement);
    }
    if (cancelBackgroundImageButton) {
        cancelBackgroundImageButton.addEventListener('click', () => {
            resetBackgroundModal();
            closeBackgroundImageModal();
        });
    }
    if (finishBackgroundMeasurementButton) {
        finishBackgroundMeasurementButton.addEventListener('click', finishBackgroundMeasurement);
    }
    if (cancelBackgroundMeasurementButton) {
        cancelBackgroundMeasurementButton.addEventListener('click', cancelBackgroundMeasurement);
    }

    if (saveProjectButton) {
        saveProjectButton.addEventListener('click', saveProjectToFile);
    }
    if (uploadProjectButton && projectFileInput) {
        uploadProjectButton.addEventListener('click', () => projectFileInput.click());
        projectFileInput.addEventListener('change', (event) => {
            handleProjectFileUpload(event);
            projectFileInput.value = '';
        });
    }

    if (textModalConfirm) {
        textModalConfirm.addEventListener('click', submitTextModal);
    }
    if (textModalCancel) {
        textModalCancel.addEventListener('click', closeTextModal);
    }
    if (staircaseApplyButton) {
        staircaseApplyButton.addEventListener('click', applyStaircaseSettings);
    }
    if (staircaseCancelButton) {
        staircaseCancelButton.addEventListener('click', () => {
            closeStaircaseModal();
            // Revert to select tool if user cancels before drawing
            if (currentTool === 'staircase') {
                currentTool = 'select';
                toolButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tool') === 'select'));
                updateToolInfo();
            }
        });
    }
    [
        staircaseWidthFeetInput,
        staircaseWidthInchesInput,
        staircaseRunInchesInput,
        staircaseStepsInput,
        landingWidthFeetInput,
        landingWidthInchesInput,
        landingLengthFeetInput,
        landingLengthInchesInput
    ].forEach(input => {
        if (input) {
            input.addEventListener('input', updateStaircaseSummary);
            input.addEventListener('change', updateStaircaseSummary);
        }
    });

    staircaseModeButtons?.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.dataset.staircaseMode;
            syncStaircaseModeUI(mode);
            syncLandingTypeUI(getSelectedLandingType());
            updateStaircaseSummary();
        });
    });

    landingTypeRadios?.forEach(radio => {
        radio.addEventListener('change', () => {
            syncLandingTypeUI(radio.value);
            updateStaircaseSummary();
        });
    });
    if (textModalInput) {
        textModalInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitTextModal();
            }
            if (event.key === 'Escape') {
                closeTextModal();
            }
        });
    }

    if (backgroundPreview) {
        backgroundPreview.addEventListener('load', () => {
            syncPreviewCanvasSize();
            redrawPreviewMeasurementOverlay();
        });
    }

    if (backgroundPreviewCanvas) {
        backgroundPreviewCanvas.addEventListener('mousedown', (event) => {
            if (!isBackgroundMeasurementActive) return;
            ensureMeasurementLine();
            const pos = getPreviewPointerPosition(event);
            if (!pos) return;
            if (startMeasurementDragOnPreview(pos.x, pos.y)) {
                redrawPreviewMeasurementOverlay();
            }
        });

        backgroundPreviewCanvas.addEventListener('mousemove', (event) => {
            if (!isBackgroundMeasurementActive || !measurementDragHandle) return;
            const pos = getPreviewPointerPosition(event);
            if (!pos) return;
            updateMeasurementDragOnPreview(pos.x, pos.y);
        });

        window.addEventListener('mouseup', () => {
            if (!measurementDragHandle) return;
            finalizeMeasurementDragOnPreview();
        });
    }

    const transformActions = [
        { button: rotateLeftButton, handler: () => rotateSelection(-5) },
        { button: rotateRightButton, handler: () => rotateSelection(5) },
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

    if (canvasContainer) {
        canvasContainer.addEventListener('wheel', (e) => {
            if (e.ctrlKey) return; // allow browser zoom shortcuts
            e.preventDefault();
            const wantsHorizontal = e.shiftKey && Math.abs(e.deltaX) < Math.abs(e.deltaY);
            const moveX = wantsHorizontal ? -e.deltaY : -e.deltaX;
            const moveY = wantsHorizontal ? 0 : -e.deltaY;
            panView(moveX, moveY);
        }, { passive: false });
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

    if (textBoldButton) {
        textBoldButton.addEventListener('click', toggleTextBold);
    }
    if (textItalicButton) {
        textItalicButton.addEventListener('click', toggleTextItalic);
    }
    if (textFontIncreaseButton) {
        textFontIncreaseButton.addEventListener('click', () => {
            changeTextFontSize(2);
            updateTextStyleButtons();
        });
    }
    if (textFontDecreaseButton) {
        textFontDecreaseButton.addEventListener('click', () => {
            changeTextFontSize(-2);
            updateTextStyleButtons();
        });
    }

    if (measurementFontIncreaseButton) {
        measurementFontIncreaseButton.addEventListener('click', () => changeMeasurementFontSize(2));
    }
    if (measurementFontDecreaseButton) {
        measurementFontDecreaseButton.addEventListener('click', () => changeMeasurementFontSize(-2));
    }

    if (backgroundDistanceInput) {
        backgroundDistanceInput.addEventListener('input', () => {
            setMeasurementDistance(backgroundDistanceInput.value, { resetLine: true });
            redrawPreviewMeasurementOverlay();
        });
    }

    if (canvasContainer) {
        // Keep rulers aligned with the canvas when the scroll position changes.
        canvasContainer.addEventListener('scroll', drawRulers);
    }

    window.addEventListener('resize', () => {
        syncPreviewCanvasSize();
        redrawPreviewMeasurementOverlay();
        drawRulers();
    });

    toggleGridButton.addEventListener('click', () => {
        showGrid = !showGrid;
        redrawCanvas();
    });

    if (toggleBackgroundImageButton) {
        toggleBackgroundImageButton.addEventListener('click', toggleBackgroundImageVisibility);
    }

    if (toggle3DViewButton) {
        toggle3DViewButton.addEventListener('click', toggleViewMode);
    }

    canvas.addEventListener('keydown', handleKeyDown);

    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tool') === currentTool);
    });

    resetViewToOrigin();
    syncCanvasScrollArea();
    drawGrid();
    syncBackgroundControls();
    updateTextStyleButtons();
    updateMeasurementPreview();
    updateStaircaseSummary();
    updateToolInfo();
    updatePropertiesPanel();
    update3DButtonLabel('Show 3D');
    drawRulers();
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
    const floorEdge = findFloorEdgeAt(x, y);

    // Show context menu at click position with appropriate options
    showContextMenu(e.clientX, e.clientY, { wall, floorEdge });

    if (currentTool === 'select') {
        if (floorEdge) {
            selectedFloorIds = new Set([floorEdge.floor.id]);
            redrawCanvas();
        } else if (wall) {
            if (!selectedWalls.has(wall)) {
                selectedWalls.clear();
                selectedWalls.add(wall);
                redrawCanvas();
            }
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

function getStairSnapCandidates(excludeIndex = null) {
    const candidates = { x: [], y: [] };

    walls.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        [n1, n2].forEach(node => {
            if (!node) return;
            candidates.x.push(node.x);
            candidates.y.push(node.y);
        });
        if (n1 && n2) {
            candidates.x.push((n1.x + n2.x) / 2);
            candidates.y.push((n1.y + n2.y) / 2);
        }
    });

    objects.forEach((obj, index) => {
        if (index === excludeIndex || !isStairObject(obj)) return;
        candidates.x.push(obj.x, obj.x + obj.width, obj.x + obj.width / 2);
        candidates.y.push(obj.y, obj.y + obj.height, obj.y + obj.height / 2);
    });

    return candidates;
}

function applyStaircaseMagnet(obj, handle = 'center', objIndex = null) {
    if (!isStairObject(obj)) return;

    const threshold = Math.max(STAIRCASE_MAGNET_THRESHOLD, scale * 0.3);
    const candidates = getStairSnapCandidates(objIndex);
    const edges = {
        left: obj.x,
        right: obj.x + obj.width,
        top: obj.y,
        bottom: obj.y + obj.height
    };

    const findDelta = (value, pool) => {
        let best = null;
        pool.forEach(candidate => {
            const delta = candidate - value;
            if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best))) {
                best = delta;
            }
        });
        return best;
    };

    if (handle === 'left') {
        const snap = findDelta(edges.left, candidates.x);
        if (snap !== null) {
            const newLeft = edges.left + snap;
            const newWidth = edges.right - newLeft;
            if (newWidth >= scale * 0.5) {
                obj.x = newLeft;
                obj.width = newWidth;
            }
        }
        return;
    }

    if (handle === 'right') {
        const snap = findDelta(edges.right, candidates.x);
        if (snap !== null) {
            const newRight = edges.right + snap;
            const newWidth = newRight - edges.left;
            if (newWidth >= scale * 0.5) {
                obj.width = newWidth;
            }
        }
        return;
    }

    if (handle === 'top') {
        const snap = findDelta(edges.top, candidates.y);
        if (snap !== null) {
            const newTop = edges.top + snap;
            const newHeight = edges.bottom - newTop;
            if (newHeight >= scale * 0.5) {
                obj.y = newTop;
                obj.height = newHeight;
            }
        }
        return;
    }

    if (handle === 'bottom') {
        const snap = findDelta(edges.bottom, candidates.y);
        if (snap !== null) {
            const newBottom = edges.bottom + snap;
            const newHeight = newBottom - edges.top;
            if (newHeight >= scale * 0.5) {
                obj.height = newHeight;
            }
        }
        return;
    }

    const leftDelta = findDelta(edges.left, candidates.x);
    const rightDelta = findDelta(edges.right, candidates.x);
    const topDelta = findDelta(edges.top, candidates.y);
    const bottomDelta = findDelta(edges.bottom, candidates.y);

    const chooseDelta = (a, b) => {
        if (a === null) return b;
        if (b === null) return a;
        return Math.abs(a) <= Math.abs(b) ? a : b;
    };

    const dx = chooseDelta(leftDelta, rightDelta);
    const dy = chooseDelta(topDelta, bottomDelta);

    if (dx !== null) obj.x += dx;
    if (dy !== null) obj.y += dy;
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

function moveSelectedDimension(dx, dy, { skipUndo = false } = {}) {
    if (selectedDimensionIndex === null) return;

    const dimension = window.dimensions?.[selectedDimensionIndex];
    if (!dimension) return;

    if (!skipUndo) pushUndoState();

    const start = snapPointToInch(dimension.startX + dx, dimension.startY + dy);
    const end = snapPointToInch(dimension.endX + dx, dimension.endY + dy);

    dimension.startX = start.x;
    dimension.startY = start.y;
    dimension.endX = end.x;
    dimension.endY = end.y;

    if (typeof window.updateDimensionMeasurement === 'function') {
        window.updateDimensionMeasurement(dimension);
    }

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

function startFloorDrag(mouseX, mouseY) {
    if (selectedFloorIds.size === 0) return;
    const nodeIds = new Set();
    selectedFloorIds.forEach(id => {
        const floor = floors.find(f => f.id === id);
        (floor?.nodeIds || []).forEach(nId => nodeIds.add(nId));
    });

    if (nodeIds.size === 0) return;

    const startPositions = new Map();
    nodeIds.forEach(nodeId => {
        const node = getNodeById(nodeId);
        if (node) {
            startPositions.set(nodeId, { x: node.x, y: node.y });
        }
    });

    floorDragData = {
        startMouse: { x: mouseX, y: mouseY },
        nodeIds,
        startPositions,
        undoApplied: false
    };
}

function updateFloorDrag(mouseX, mouseY) {
    if (!floorDragData) return;
    if (!floorDragData.undoApplied) {
        pushUndoState();
        floorDragData.undoApplied = true;
    }
    const dx = mouseX - floorDragData.startMouse.x;
    const dy = mouseY - floorDragData.startMouse.y;

    floorDragData.nodeIds.forEach(nodeId => {
        const node = getNodeById(nodeId);
        const origin = floorDragData.startPositions.get(nodeId);
        if (!node || !origin) return;
        const snapped = snapPointToInch(origin.x + dx, origin.y + dy);
        node.x = snapped.x;
        node.y = snapped.y;
    });
}

function stopFloorDrag() {
    floorDragData = null;
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

function getClosestNodeWithinRadius(x, y, radius = NODE_HIT_RADIUS + 4) {
    let closest = null;
    let bestDist = radius;
    for (const node of nodes) {
        const dist = Math.hypot(node.x - x, node.y - y);
        if (dist <= bestDist) {
            bestDist = dist;
            closest = node;
        }
    }
    return closest;
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

    const belongsToFloor = getFloorsUsingNode(node.id).length > 0;

    if (attachedWalls.length === 0 && !belongsToFloor) return;

    // Prefer a wall that is currently selected so dragging honours the intended segment
    const wall = attachedWalls.find(w => selectedWalls.has(w)) || attachedWalls[0];
    if (wall) {
        const otherNodeId = node.id === wall.startNodeId ? wall.endNodeId : wall.startNodeId;
        const other = getNodeById(otherNodeId);

        if (other) {
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const len = Math.hypot(dx, dy) || 1;

            dragDir = { x: dx / len, y: dy / len };
        } else {
            dragDir = null;
        }
    } else {
        dragDir = null;
    }
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
    groupDragOffsets = getStairGroupOffsets(index);
}

function stopObjectDrag() {
    draggingObjectIndex = null;
    objectDragOffset = null;
    objectDragUndoApplied = false;
    groupDragOffsets = null;
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

    withViewTransform(() => {
        ctx.save();
        ctx.strokeStyle = '#3498db';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        ctx.fillStyle = 'rgba(52, 152, 219, 0.12)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.restore();
    });
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

    expandSelectionWithGroups();

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
    const affectedIndices = new Set(selectedObjectIndices);

    // Include doors that are attached to any selected wall so they move/rotate with the wall
    selectedWalls.forEach(wall => {
        objects.forEach((obj, index) => {
            if (obj?.type === 'door' && obj.attachedWallId === wall.id) {
                affectedIndices.add(index);
            }
        });
    });

    affectedIndices.forEach(index => {
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

        // Keep the door's rotation aligned with the wall direction so it doesn't double-rotate
        obj.rotation = orientation === 'horizontal' ? 0 : 90;
    });
}

function transformDimensionsForSelectedWalls(transformFn) {
    if (!window.dimensions || window.dimensions.length === 0 || selectedWalls.size === 0) return;

    const selectedWallIds = new Set(Array.from(selectedWalls).map(w => w.id));

    window.dimensions.forEach(dim => {
        if (!dim.wallId || !selectedWallIds.has(dim.wallId)) return;

        const start = transformFn(dim.startX, dim.startY);
        const end = transformFn(dim.endX, dim.endY);

        dim.startX = start.x;
        dim.startY = start.y;
        dim.endX = end.x;
        dim.endY = end.y;
    });
}

function normalizeWallDirections(wallsToNormalize) {
    if (!wallsToNormalize || wallsToNormalize.size === 0) return;

    wallsToNormalize.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;

        const isHorizontal = Math.abs(n2.x - n1.x) >= Math.abs(n2.y - n1.y);
        const shouldSwap = isHorizontal ? n1.x > n2.x : n1.y > n2.y;

        if (shouldSwap) {
            [wall.startNodeId, wall.endNodeId] = [wall.endNodeId, wall.startNodeId];
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
    clearSelectionGroupingIfEmpty();
    const center = getGroupedSelectionCenter();
    if (!center) {
        alert('Please select something to rotate');
        return;
    }

    pushUndoState();

    const angleRad = (angle * Math.PI) / 180;

    transformDimensionsForSelectedWalls((x, y) => {
        const dx = x - center.x;
        const dy = y - center.y;
        return {
            x: center.x + dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
            y: center.y + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
        };
    });

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
    clearSelectionGroupingIfEmpty();
    const center = getGroupedSelectionCenter();
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

    transformDimensionsForSelectedWalls((x, y) => {
        if (direction === 'horizontal') {
            return { x: center.x - (x - center.x), y };
        }
        return { x, y: center.y - (y - center.y) };
    });

    normalizeWallDirections(selectedWalls);

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

    if (isBackgroundMeasurementActive) {
        return;
    }

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
        // Dimension clicks are handled on the click event to avoid interference with selection logic
        return;
    }

    if (currentTool === 'floor') {
        ({ x, y } = snapPointToInch(x, y));
        const snapNode = getClosestNodeWithinRadius(x, y);

        if (isFloorLassoActive || snapNode) {
            const point = snapNode ? { x: snapNode.x, y: snapNode.y, nodeId: snapNode.id } : { x, y };
            addFloorLassoPoint(point);
            redrawCanvas();
            return;
        }

        const polygon = findRoomPolygonAtPoint(x, y);
        if (polygon && !isFloorLassoActive) {
            pushUndoState();
            const floor = createFloorAtPoint(x, y);
            if (floor) {
                selectedFloorIds = new Set([floor.id]);
                selectedWalls.clear();
                selectedObjectIndices.clear();
                selectAllMode = false;
                ungroupSelectionElements();
                redrawCanvas();
            }
            return;
        }

        addFloorLassoPoint({ x, y });
        redrawCanvas();
        return;
    }

    if (currentTool === 'text') {
        ({ x, y } = snapPointToInch(x, y));
        pendingTextPlacement = { x, y };
        openTextModal({
            defaultValue: 'New label',
            confirmLabel: 'Add Text',
            onSubmit: handleTextPlacement
        });
        return;
    }

    if (currentTool === 'select') {
        const staircaseHandle = getStaircaseHandleHit(x, y);
        if (staircaseHandle) {
            const obj = objects[staircaseHandle.index];
            if (obj) {
                pushUndoState();
                const center = { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 };
                staircaseHandleDrag = {
                    index: staircaseHandle.index,
                    handle: staircaseHandle.handle,
                    initial: { x: obj.x, y: obj.y, width: obj.width, height: obj.height, rotation: obj.rotation || 0 },
                    center,
                    startAngle: Math.atan2(y - center.y, x - center.x),
                    undoApplied: true,
                    groupOffsets: getStairGroupOffsets(staircaseHandle.index)
                };
                selectAllMode = false;
                selectedObjectIndices = new Set([staircaseHandle.index]);
                expandSelectionWithGroups();
                redrawCanvas();
            }
            return;
        }

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

        const dimensionHit = getDimensionHandleHit(x, y);
        if (dimensionHit) {
            selectAllMode = false;
            selectedWalls.clear();
            selectedObjectIndices.clear();
            selectedFloorIds.clear();
            selectedNode = null;
            setSelectedDimension(dimensionHit.index);

            if (dimensionHit.handle) {
                startDimensionDrag(dimensionHit.index, dimensionHit.handle, x, y);
            }

            redrawCanvas();
            return;
        }

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
            clearDimensionSelection();
            const floorsWithNode = getFloorsUsingNode(node.id);
            if (floorsWithNode.length > 0) {
                if (e.shiftKey) {
                    floorsWithNode.forEach(floor => selectedFloorIds.add(floor.id));
                } else {
                    selectedFloorIds = new Set(floorsWithNode.map(floor => floor.id));
                }
            } else {
                selectedFloorIds.clear();
            }
            startNodeDrag(node, x, y);
            redrawCanvas();
            return;
        }

        // Check for object
        const objIndex = getObjectAt(x, y, true);
        if (objIndex !== -1) {
            clearDimensionSelection();
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
                ungroupSelectionElements();
            }
            expandSelectionWithGroups();
            if (!e.shiftKey) {
                startObjectDrag(objIndex, x, y);
            }
            redrawCanvas();
            return;
        }

        // Check for wall
        const wall = getWallAt(x, y);
        if (wall) {
            clearDimensionSelection();
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
                ungroupSelectionElements();
            }
            selectedFloorIds.clear();
            selectedObjectIndices.clear();
            selectAllMode = false;
            redrawCanvas();
            return;
        }

        const floorHit = getFloorAt(x, y);
        if (floorHit) {
            clearDimensionSelection();
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
                ungroupSelectionElements();
                startFloorDrag(x, y);
            }
            selectAllMode = false;
            redrawCanvas();
            return;
        }

        // LEFT CLICK ONLY for selection operations

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
            ungroupSelectionElements();
            clearDimensionSelection();
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
                if (selectedDimensionIndex === dimIndex) {
                    clearDimensionSelection();
                }
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
                cleanupOrphanNodes();
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

    if (type === 'staircase') {
        return { lineColor: baseLine, fillColor: DEFAULT_STAIR_FILL };
    }

    if (type === 'text') {
        const textColor = textColorInput?.value || '#000000';
        return { lineColor: textColor, fillColor: 'transparent' };
    }

    return { lineColor: baseLine, fillColor: baseFill };
}

function getStairSettings(obj = {}) {
    if (obj.staircase) return obj.staircase;
    return staircaseSettings;
}

function computeStaircaseBounds(startX, startY, currentX, currentY) {
    const mode = staircaseSettings.mode || 'steps';
    if (mode === 'landing') {
        const landingWidthFeet = Math.max(1, feetWithInches(staircaseSettings.landingWidthFeet, staircaseSettings.landingWidthInches) || 1);
        const landingLengthFeet = Math.max(1, feetWithInches(staircaseSettings.landingLengthFeet, staircaseSettings.landingLengthInches) || 1);
        const widthPx = Math.max(landingLengthFeet * scale, 24);
        const heightPx = Math.max(landingWidthFeet * scale, 24);

        const dirX = currentX >= startX ? 1 : -1;
        const dirY = currentY >= startY ? 1 : -1;

        const x = dirX === 1 ? startX : startX - widthPx;
        const y = dirY === 1 ? startY : startY - heightPx;

        return { x, y, width: widthPx, height: heightPx, orientation: 'landing' };
    }

    const widthFeet = Math.max(1, feetWithInches(staircaseSettings.widthFeet, staircaseSettings.widthInches) || 3.5);
    const steps = Math.max(3, staircaseSettings.steps || 10);
    const treadDepthInches = staircaseSettings.runInches || staircaseSettings.treadDepthInches || DEFAULT_TREAD_DEPTH_INCHES;

    const widthPx = Math.max(widthFeet * scale, 24);
    const treadPx = (treadDepthInches / 12) * scale;
    const runPx = treadPx * steps;

    const orientation = Math.abs(currentX - startX) >= Math.abs(currentY - startY)
        ? 'horizontal'
        : 'vertical';

    const dirX = currentX >= startX ? 1 : -1;
    const dirY = currentY >= startY ? 1 : -1;

    const width = orientation === 'horizontal' ? runPx : widthPx;
    const height = orientation === 'horizontal' ? widthPx : runPx;

    const x = dirX === 1 ? startX : startX - width;
    const y = dirY === 1 ? startY : startY - height;

    return { x, y, width, height, orientation };
}

function computeStaircaseSizeFromSettings(settings, orientation = 'horizontal') {
    const mode = settings.mode || 'steps';
    const minPx = 24;

    if (mode === 'landing') {
        const landingWidthFeet = Math.max(1, feetWithInches(settings.landingWidthFeet, settings.landingWidthInches) || 1);
        const landingLengthFeet = Math.max(1, feetWithInches(settings.landingLengthFeet, settings.landingLengthInches) || 1);
        return {
            width: Math.max(landingLengthFeet * scale, minPx),
            height: Math.max(landingWidthFeet * scale, minPx)
        };
    }

    const widthFeet = Math.max(1, feetWithInches(settings.widthFeet, settings.widthInches) || 3.5);
    const steps = Math.max(3, settings.steps || 10);
    const treadDepthInches = settings.runInches || settings.treadDepthInches || DEFAULT_TREAD_DEPTH_INCHES;
    const widthPx = Math.max(widthFeet * scale, minPx);
    const runPx = Math.max((treadDepthInches / 12) * scale * steps, minPx);
    const isHorizontal = orientation === 'horizontal';

    return {
        width: isHorizontal ? runPx : widthPx,
        height: isHorizontal ? widthPx : runPx
    };
}

function measureTextDimensions(text, fontSize = 18, fontWeight = 'normal', fontStyle = 'normal') {
    ctx.save();
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px Arial`.trim();
    const metrics = ctx.measureText(text);
    const width = metrics.width;
    const height = fontSize * 1.2;
    ctx.restore();
    return { width, height };
}

function handleMouseMove(e) {
    let { x, y } = screenToWorld(e.clientX, e.clientY);

    // Track last pointer position for quick paste placement
    lastPointerCanvasX = x;
    lastPointerCanvasY = y;

    if (isBackgroundMeasurementActive) {
        return;
    }

    if (isViewPanning && panOrigin && panStartOffset) {
        const pixelScale = getCanvasPixelScale();
        viewOffsetX = panStartOffset.x + (e.clientX - panOrigin.x) / pixelScale.x;
        viewOffsetY = panStartOffset.y + (e.clientY - panOrigin.y) / pixelScale.y;
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

    if (dimensionDrag) {
        applyDimensionDrag(x, y);
        return;
    }

    if (staircaseHandleDrag) {
        const obj = objects[staircaseHandleDrag.index];
        if (obj) {
            ({ x, y } = snapToGridPoint(x, y));
            const minSize = scale * 0.5;
            const initial = staircaseHandleDrag.initial;
            const dragCenter = staircaseHandleDrag.center;

            switch (staircaseHandleDrag.handle) {
                case 'center': {
                    const dx = x - dragCenter.x;
                    const dy = y - dragCenter.y;
                    obj.x = initial.x + dx;
                    obj.y = initial.y + dy;
                    break;
                }
                case 'left': {
                    const newX = Math.min(x, initial.x + initial.width - minSize);
                    obj.x = newX;
                    obj.width = Math.max(minSize, initial.width + (initial.x - newX));
                    break;
                }
                case 'right': {
                    obj.width = Math.max(minSize, x - initial.x);
                    break;
                }
                case 'top': {
                    const newY = Math.min(y, initial.y + initial.height - minSize);
                    obj.y = newY;
                    obj.height = Math.max(minSize, initial.height + (initial.y - newY));
                    break;
                }
                case 'bottom': {
                    obj.height = Math.max(minSize, y - initial.y);
                    break;
                }
                case 'top-right': {
                    obj.width = Math.max(minSize, x - initial.x);
                    const newY = Math.min(y, initial.y + initial.height - minSize);
                    obj.y = newY;
                    obj.height = Math.max(minSize, initial.height + (initial.y - newY));
                    break;
                }
                case 'bottom-right': {
                    obj.width = Math.max(minSize, x - initial.x);
                    obj.height = Math.max(minSize, y - initial.y);
                    break;
                }
                case 'bottom-left': {
                    const newX = Math.min(x, initial.x + initial.width - minSize);
                    obj.x = newX;
                    obj.width = Math.max(minSize, initial.width + (initial.x - newX));
                    obj.height = Math.max(minSize, y - initial.y);
                    break;
                }
                case 'rotate': {
                    const angle = Math.atan2(y - dragCenter.y, x - dragCenter.x);
                    let newRotation = initial.rotation + ((angle - staircaseHandleDrag.startAngle) * 180) / Math.PI;
                    obj.rotation = snapRotation(newRotation);
                    break;
                }
            }

            if (staircaseHandleDrag.handle !== 'rotate') {
                applyStaircaseMagnet(obj, staircaseHandleDrag.handle, staircaseHandleDrag.index);

                if (staircaseHandleDrag.handle === 'center' && staircaseHandleDrag.groupOffsets) {
                    staircaseHandleDrag.groupOffsets.forEach(({ index, offsetX, offsetY }) => {
                        const member = objects[index];
                        if (!member) return;
                        member.x = obj.x + offsetX;
                        member.y = obj.y + offsetY;
                    });
                }
            }

            coordinatesDisplay.textContent = `X: ${obj.x.toFixed(1)}, Y: ${obj.y.toFixed(1)}`;
            redrawCanvas();
        }
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

    if (floorDragData) {
        updateFloorDrag(x, y);
        const sampleNodeId = floorDragData.nodeIds.values().next().value;
        const sampleNode = sampleNodeId ? getNodeById(sampleNodeId) : null;
        if (sampleNode) {
            coordinatesDisplay.textContent = `Floor drag: X: ${sampleNode.x.toFixed(1)}, Y: ${sampleNode.y.toFixed(1)}`;
        }
        redrawCanvas();
        return;
    }

    if (draggingObjectIndex !== null && objectDragOffset) {
        const obj = objects[draggingObjectIndex];
        if (obj) {
            if (!objectDragUndoApplied) {
                pushUndoState();
                objectDragUndoApplied = true;
            }

            const snapped = snapToGridPoint(x - objectDragOffset.x, y - objectDragOffset.y);
            obj.x = snapped.x;
            obj.y = snapped.y;

            if (isStairObject(obj)) {
                applyStaircaseMagnet(obj, 'center', draggingObjectIndex);
            }

            if (groupDragOffsets) {
                groupDragOffsets.forEach(({ index, offsetX, offsetY }) => {
                    const member = objects[index];
                    if (!member) return;
                    member.x = obj.x + offsetX;
                    member.y = obj.y + offsetY;
                });
                expandSelectionWithGroups();
            }

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

    if (currentTool === 'floor') {
        ({ x, y } = snapPointToInch(x, y));
        floorHoverCorner = getClosestNodeWithinRadius(x, y);

        if (isFloorLassoActive) {
            floorLassoPreview = floorHoverCorner ? { x: floorHoverCorner.x, y: floorHoverCorner.y, nodeId: floorHoverCorner.id } : { x, y };
            coordinatesDisplay.textContent = `Floor lasso: X: ${floorLassoPreview.x.toFixed(1)}, Y: ${floorLassoPreview.y.toFixed(1)} | Double-click to close`;
        } else {
            floorLassoPreview = null;
            if (floorHoverCorner) {
                coordinatesDisplay.textContent = 'Floor lasso: click the corner highlight to start';
            } else {
                coordinatesDisplay.textContent = `Floor fill: X: ${x.toFixed(1)}, Y: ${y.toFixed(1)}`;
            }
        }

        redrawCanvas();
        return;
    }

    if (isDraggingNode && selectedNode && dragOriginMousePos && dragOriginNodePos) {
        const dx = x - dragOriginMousePos.x;
        const dy = y - dragOriginMousePos.y;

        if (dragDir) {
            let t = dx * dragDir.x + dy * dragDir.y;
            t = snapToInchAlongDirection(t);

            selectedNode.x = dragOriginNodePos.x + dragDir.x * t;
            selectedNode.y = dragOriginNodePos.y + dragDir.y * t;
        } else {
            const snapped = snapPointToInch(dragOriginNodePos.x + dx, dragOriginNodePos.y + dy);
            selectedNode.x = snapped.x;
            selectedNode.y = snapped.y;
        }

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
            alignmentHints = [];
        } else {
            let ex = x;
            let ey = y;

            ({ x: ex, y: ey } = snapPointToInch(ex, ey));

            // Use a tighter tolerance so 1" length changes still render before snapping
            // to nearby nodes or alignment guides.
            const tol = Math.max(scale / 24, 1); // ~0.5 inch tolerance, minimum 1px
            alignmentHints = [];

            let snappedNode = null;

            for (const node of nodes) {
                if (node.id === lastNode.id) continue;

                const dist = Math.hypot(ex - node.x, ey - node.y);
                if (!snappedNode && dist <= tol) {
                    snappedNode = node;
                    continue;
                }

            }

            if (snappedNode) {
                ex = snappedNode.x;
                ey = snappedNode.y;
            } else {
                const len = Math.hypot(ex - sx, ey - sy);
                if (len > 0) {
                    const snappedAngle = snapAngleRadians(Math.atan2(ey - sy, ex - sx));
                    const snappedEx = sx + Math.cos(snappedAngle) * len;
                    const snappedEy = sy + Math.sin(snappedAngle) * len;

                    alignmentHints.push({ type: 'angle', ax: sx, ay: sy, ex: snappedEx, ey: snappedEy });

                    ex = snappedEx;
                    ey = snappedEy;
                }
            }

            // Track best alignment candidates so we can snap precisely when near reference lines
            let bestAlignX = null;
            let bestAlignY = null;

            for (const node of nodes) {
                if (node.id === lastNode.id) continue;

                const close = Math.hypot(ex - node.x, ey - node.y) <= tol;
                const dxToNode = Math.abs(ex - node.x);
                const dyToNode = Math.abs(ey - node.y);
                const alignedX = dxToNode <= tol;
                const alignedY = dyToNode <= tol;

                if (close) {
                    alignmentHints.push({ type: 'close', ax: node.x, ay: node.y, ex, ey });
                } else {
                    if (alignedX) {
                        alignmentHints.push({ type: 'vertical', ax: node.x, ay: node.y, ex, ey });
                        if (bestAlignX === null || dxToNode < bestAlignX.delta) {
                            bestAlignX = { value: node.x, delta: dxToNode };
                        }
                    }
                    if (alignedY) {
                        alignmentHints.push({ type: 'horizontal', ax: node.x, ay: node.y, ex, ey });
                        if (bestAlignY === null || dyToNode < bestAlignY.delta) {
                            bestAlignY = { value: node.y, delta: dyToNode };
                        }
                    }
                }
            }

            // Snap to the nearest alignment guide so reference lines represent exact alignment
            if (bestAlignX) {
                ex = bestAlignX.value;
            }
            if (bestAlignY) {
                ey = bestAlignY.value;
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

    if (isBackgroundMeasurementActive) {
        finalizeMeasurementDragOnPreview();
        return;
    }

    if (dimensionDrag) {
        dimensionDrag = null;
        redrawCanvas();
        return;
    }

    if (draggingObjectIndex !== null) {
        stopObjectDrag();
        redrawCanvas();
        return;
    }

    if (staircaseHandleDrag) {
        staircaseHandleDrag = null;
        redrawCanvas();
        return;
    }

    if (windowHandleDrag) {
        windowHandleDrag = null;
        redrawCanvas();
        return;
    }

    if (floorDragData) {
        stopFloorDrag();
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

    if (!['door', 'window', 'furniture', 'staircase'].includes(currentTool)) return;
    if (startX === currentX && startY === currentY) return;

    pushUndoState();

    const styles = getDefaultStyleForType(currentTool);

    let x = Math.min(startX, currentX);
    let y = Math.min(startY, currentY);
    let w = Math.abs(currentX - startX);
    let h = Math.abs(currentY - startY);
    let orientation = Math.abs(currentX - startX) >= Math.abs(currentY - startY) ? 'horizontal' : 'vertical';

    if (currentTool === 'staircase') {
        const bounds = computeStaircaseBounds(startX, startY, currentX, currentY);
        x = bounds.x;
        y = bounds.y;
        w = bounds.width;
        h = bounds.height;
        orientation = bounds.orientation;
    }

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
        flipV: false,
        orientation
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
    } else if (currentTool === 'staircase') {
        newObj.staircase = { ...staircaseSettings };
    }

    objects.push(newObj);

    redrawCanvas();
}

// ============================================================
// WALL CHAIN
// ============================================================
function handleCanvasClick(e) {
    if (currentTool === 'dimension') {
        if (isBackgroundMeasurementActive) return;
        if (typeof e.button !== 'undefined' && e.button !== 0) return;
        if (typeof handleDimensionMouseDown === 'function') {
            handleDimensionMouseDown(e);
        }
        return;
    }

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
        alignmentHints = [];
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
    alignmentHints = [];
    redrawCanvas();
}

function getDimensionHandleHit(x, y) {
    if (!window.dimensions || window.dimensions.length === 0) return null;

    const handleRadius = 8;

    for (let i = window.dimensions.length - 1; i >= 0; i--) {
        const dim = window.dimensions[i];

        if (Math.hypot(x - dim.startX, y - dim.startY) <= handleRadius) {
            return { index: i, handle: 'start' };
        }

        if (Math.hypot(x - dim.endX, y - dim.endY) <= handleRadius) {
            return { index: i, handle: 'end' };
        }

        const distance = distanceToSegment(x, y, dim.startX, dim.startY, dim.endX, dim.endY);
        if (distance <= handleRadius) {
            return { index: i, handle: 'line' };
        }
    }

    return null;
}

function startDimensionDrag(index, handle, x, y) {
    const dimension = window.dimensions?.[index];
    if (!dimension) return;

    dimensionDrag = {
        index,
        handle,
        startMouse: { x, y },
        initial: {
            startX: dimension.startX,
            startY: dimension.startY,
            endX: dimension.endX,
            endY: dimension.endY
        },
        undoApplied: false
    };
}

function applyDimensionDrag(x, y) {
    if (!dimensionDrag) return false;

    const dimension = window.dimensions?.[dimensionDrag.index];
    if (!dimension) return false;

    if (!dimensionDrag.undoApplied) {
        pushUndoState();
        dimensionDrag.undoApplied = true;
    }

    const dx = x - dimensionDrag.startMouse.x;
    const dy = y - dimensionDrag.startMouse.y;
    const { initial } = dimensionDrag;

    let newStart = { x: initial.startX, y: initial.startY };
    let newEnd = { x: initial.endX, y: initial.endY };

    if (dimensionDrag.handle === 'start') {
        newStart = snapPointToInch(initial.startX + dx, initial.startY + dy);
    } else if (dimensionDrag.handle === 'end') {
        newEnd = snapPointToInch(initial.endX + dx, initial.endY + dy);
    } else if (dimensionDrag.handle === 'line') {
        const snappedStart = snapPointToInch(initial.startX + dx, initial.startY + dy);
        const offsetX = snappedStart.x - initial.startX;
        const offsetY = snappedStart.y - initial.startY;
        newStart = { x: initial.startX + offsetX, y: initial.startY + offsetY };
        newEnd = { x: initial.endX + offsetX, y: initial.endY + offsetY };
    }

    dimension.startX = newStart.x;
    dimension.startY = newStart.y;
    dimension.endX = newEnd.x;
    dimension.endY = newEnd.y;

    if (typeof window.updateDimensionMeasurement === 'function') {
        window.updateDimensionMeasurement(dimension);
    }

    redrawCanvas();
    return true;
}

function handleCanvasDoubleClick(e) {
    let { x, y } = screenToWorld(e.clientX, e.clientY);

    if (currentTool === 'floor' && isFloorLassoActive) {
        ({ x, y } = snapPointToInch(x, y));
        const snapNode = getClosestNodeWithinRadius(x, y);
        const finalPoint = snapNode ? { x: snapNode.x, y: snapNode.y, nodeId: snapNode.id } : { x, y };
        ignoreNextClick = true;
        finalizeFloorLasso(finalPoint);
        return;
    }

    if (currentTool === 'dimension') {
        if (isBackgroundMeasurementActive) return;
        if (typeof e.button !== 'undefined' && e.button !== 0) return;

        // Prefer space dimensions when hovering a gap on a horizontal wall
        let spaceData = window.hoveredSpaceSegment;
        let wallData = window.hoveredWall;

        if (!wallData && typeof window.findNearestWall === 'function') {
            wallData = window.findNearestWall(x, y, 20);
        }

        if (!spaceData && wallData && typeof window.findAvailableSpacesOnWall === 'function') {
            spaceData = window.findAvailableSpacesOnWall(wallData, x, y);
        }

        let dimensionCreated = false;

        if (spaceData && typeof window.createSpaceDimension === 'function') {
            pushUndoState();
            window.createSpaceDimension(spaceData);
            dimensionCreated = true;
        } else if (wallData && typeof window.createWallDimension === 'function') {
            pushUndoState();
            window.createWallDimension(wallData, { referenceX: x, referenceY: y });
            dimensionCreated = true;
        }

        if (dimensionCreated) {
            if (typeof window.resetDimensionTool === 'function') {
                window.resetDimensionTool();
            }
            redrawCanvas();
        }

        return;
    }

    const dblObjIndex = getObjectAt(x, y, true);
    if (dblObjIndex !== -1) {
        const obj = objects[dblObjIndex];
        if (obj?.type === 'staircase') {
            openStaircaseEditorForObject(dblObjIndex);
            return;
        }
    }

    if (!isWallDrawing) {
        const floor = getFloorAt(x, y);
        if (floor) {
            openFloorTextureModal(floor);
            return;
        }
    }

    if (currentTool === 'wall' && isWallDrawing) {
        e.preventDefault();

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
        alignmentHints = [];
        redrawCanvas();
    }
}

// ============================================================
// DRAWING (WITH MULTIPLE WALL SELECTION)
// ============================================================
function drawBackgroundImage() {
    if (isBackgroundMeasurementActive) return;
    const data = backgroundImageData;
    if (!data || !isBackgroundImageVisible) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(
        data.image,
        data.x,
        data.y,
        data.width,
        data.height
    );
    ctx.restore();
}

function drawBackgroundMeasurementLine() {
    // Measurement line is drawn only inside the preview modal overlay.
}

function drawGrid() {
    if (!showGrid) return;
    ctx.save();
    const hasVisibleBackground = backgroundImageData && isBackgroundImageVisible;
    ctx.globalAlpha = hasVisibleBackground ? 0.5 : 1;
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
    ctx.restore();
}

function drawWalls() {
    const selectedToHighlight = [];

    // First draw all walls so selection handles aren't hidden behind joints
    for (const w of walls) {
        const n1 = getNodeById(w.startNodeId);
        const n2 = getNodeById(w.endNodeId);
        if (!n1 || !n2) continue;

        ctx.save();
        ctx.lineWidth = w.thicknessPx;
        ctx.strokeStyle = w.lineColor;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        ctx.restore();

        if (showDimensions) drawWallDimension(n1.x, n1.y, n2.x, n2.y, w.thicknessPx);

        if (selectedWalls.has(w)) {
            selectedToHighlight.push({ n1, n2, wall: w });
        }
    }

    // Draw selection highlight for selected walls after all walls are rendered
    for (const { n1, n2, wall } of selectedToHighlight) {
        drawWallSelectionHighlight(n1, n2, wall);
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
    if (!alignmentHints || alignmentHints.length === 0) return;

    withViewTransform(() => {
        ctx.save();
        ctx.strokeStyle = ALIGN_HINT_COLOR;
        ctx.lineWidth = 1.5;

        ctx.setLineDash([4, 4]);
        for (const { ax, ay, ex, ey } of alignmentHints) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        }

        ctx.setLineDash([]);
        for (const { ax, ay } of alignmentHints) {
            ctx.beginPath();
            ctx.arc(ax, ay, 6, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    });
}

function drawWallPreview() {
    if (wallChain.length === 0 || wallPreviewX === null || wallPreviewY === null) return;

    const lastNode = wallChain[wallChain.length - 1];
    const sx = lastNode.x;
    const sy = lastNode.y;
    const ex = wallPreviewX;
    const ey = wallPreviewY;
    const thicknessPx = getThicknessPx() || (0.5 * scale);

    withViewTransform(() => {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = thicknessPx;
        ctx.strokeStyle = lineColorInput.value;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.restore();
    });

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

    const angle = Math.atan2(dy, dx);
    let renderAngle = angle;
    if (renderAngle > Math.PI / 2 || renderAngle < -Math.PI / 2) {
        renderAngle += Math.PI;
    }

    withViewTransform(() => {
        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(renderAngle);
        ctx.fillStyle = '#e74c3c';
        ctx.font = `${measurementFontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        const textHeight = measurementFontSize * 1.2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);

        ctx.fillStyle = '#e74c3c';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    });
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
function drawStraightStair(obj, originX, originY, drawWidth, drawHeight) {
    const stair = getStairSettings(obj);
    const steps = Math.max(3, stair.steps || 10);
    const hasLanding = stair.layout === 'landing';
    const landingSize = hasLanding ? Math.min(drawWidth, drawHeight, (stair.landingDepthFeet || 3) * scale) : 0;
    const orientation = obj.orientation || (drawWidth >= drawHeight ? 'horizontal' : 'vertical');
    const runLength = orientation === 'horizontal' ? drawWidth : drawHeight;
    const crossLength = orientation === 'horizontal' ? drawHeight : drawWidth;

    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, drawWidth, drawHeight);
    ctx.clip();

    const drawLine = (offset) => {
        if (orientation === 'horizontal') {
            ctx.moveTo(originX + offset, originY);
            ctx.lineTo(originX + offset, originY + crossLength);
        } else {
            ctx.moveTo(originX, originY + offset);
            ctx.lineTo(originX + crossLength, originY + offset);
        }
    };

    ctx.beginPath();
    if (landingSize > 0) {
        const halfSteps = Math.ceil(steps / 2);
        const runWithoutLanding = Math.max(runLength - landingSize, 10);
        const segment = runWithoutLanding / 2;
        const spacing = segment / halfSteps;
        for (let i = 1; i < halfSteps; i++) {
            drawLine(spacing * i);
        }
        const startSecond = segment + landingSize;
        for (let i = 1; i < halfSteps; i++) {
            drawLine(startSecond + spacing * i);
        }
        if (orientation === 'horizontal') {
            ctx.rect(originX + segment, originY + crossLength / 2 - landingSize / 2, landingSize, landingSize);
        } else {
            ctx.rect(originX + crossLength / 2 - landingSize / 2, originY + segment, landingSize, landingSize);
        }
    } else {
        const spacing = runLength / steps;
        for (let i = 1; i < steps; i++) {
            drawLine(spacing * i);
        }
    }
    ctx.stroke();
    ctx.restore();
}

function drawLShapedStair(obj, originX, originY, drawWidth, drawHeight) {
    const stair = getStairSettings(obj);
    const steps = Math.max(4, stair.steps || 10);
    const stepsFirst = Math.ceil(steps / 2);
    const stepsSecond = steps - stepsFirst;
    const landingSize = Math.min((stair.landingDepthFeet || 3) * scale, Math.min(drawWidth, drawHeight) * 0.45);
    const orientation = obj.orientation || (drawWidth >= drawHeight ? 'horizontal' : 'vertical');

    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, drawWidth, drawHeight);
    ctx.clip();
    ctx.beginPath();

    if (orientation === 'horizontal') {
        const run1 = Math.max(drawWidth - landingSize, landingSize * 1.2);
        const spacing1 = run1 / stepsFirst;
        for (let i = 1; i < stepsFirst; i++) {
            ctx.moveTo(originX + spacing1 * i, originY);
            ctx.lineTo(originX + spacing1 * i, originY + landingSize);
        }

        ctx.rect(originX + run1 - landingSize, originY, landingSize, landingSize);

        const run2 = Math.max(drawHeight - landingSize, landingSize * 1.2);
        const spacing2 = run2 / Math.max(1, stepsSecond);
        for (let i = 1; i < stepsSecond; i++) {
            ctx.moveTo(originX + run1 - landingSize, originY + landingSize + spacing2 * i);
            ctx.lineTo(originX + run1, originY + landingSize + spacing2 * i);
        }
    } else {
        const run1 = Math.max(drawHeight - landingSize, landingSize * 1.2);
        const spacing1 = run1 / stepsFirst;
        for (let i = 1; i < stepsFirst; i++) {
            ctx.moveTo(originX, originY + spacing1 * i);
            ctx.lineTo(originX + landingSize, originY + spacing1 * i);
        }

        ctx.rect(originX, originY + run1 - landingSize, landingSize, landingSize);

        const run2 = Math.max(drawWidth - landingSize, landingSize * 1.2);
        const spacing2 = run2 / Math.max(1, stepsSecond);
        for (let i = 1; i < stepsSecond; i++) {
            ctx.moveTo(originX + landingSize + spacing2 * i, originY + run1 - landingSize);
            ctx.lineTo(originX + landingSize + spacing2 * i, originY + run1);
        }
    }

    ctx.stroke();
    ctx.restore();
}

function drawUShapedStair(obj, originX, originY, drawWidth, drawHeight) {
    const stair = getStairSettings(obj);
    const steps = Math.max(4, stair.steps || 10);
    const stepsFirst = Math.ceil(steps / 2);
    const stepsSecond = steps - stepsFirst;
    const landingSize = Math.min((stair.landingDepthFeet || 3) * scale, drawHeight * 0.35);
    const runSegment = Math.max((drawHeight - landingSize) / 2, 10);

    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, drawWidth, drawHeight);
    ctx.clip();
    ctx.beginPath();

    const spacing1 = runSegment / stepsFirst;
    for (let i = 1; i < stepsFirst; i++) {
        ctx.moveTo(originX, originY + spacing1 * i);
        ctx.lineTo(originX + drawWidth, originY + spacing1 * i);
    }

    ctx.rect(originX, originY + runSegment, drawWidth, landingSize);

    const spacing2 = runSegment / Math.max(1, stepsSecond);
    for (let i = 1; i < stepsSecond; i++) {
        const offset = runSegment + landingSize + spacing2 * i;
        ctx.moveTo(originX, originY + offset);
        ctx.lineTo(originX + drawWidth, originY + offset);
    }

    ctx.stroke();
    ctx.restore();
}

function drawLandingGraphic(obj, originX, originY, drawWidth, drawHeight) {
    const stair = getStairSettings(obj);
    const stroke = obj.lineColor || '#111827';
    const lw = obj.lineWidth || 2;

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;

    if (stair.landingType === 'squared') {
        ctx.beginPath();
        ctx.moveTo(originX + drawWidth, originY + drawHeight);
        ctx.lineTo(originX, originY);
        ctx.stroke();
    }

    ctx.restore();
}

function drawStaircaseGraphic(obj, originX, originY, drawWidth, drawHeight) {
    const stair = getStairSettings(obj);
    const fill = obj.fillColor || DEFAULT_STAIR_FILL;
    const stroke = obj.lineColor || '#111827';
    const lw = obj.lineWidth || 2;
    const mode = stair.mode || 'steps';
    const layout = stair.layout || 'straight';

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.rect(originX, originY, drawWidth, drawHeight);
    ctx.fill();
    ctx.stroke();

    if (mode === 'landing') {
        drawLandingGraphic(obj, originX, originY, drawWidth, drawHeight);
    } else if (layout === 'l-shape') {
        drawLShapedStair(obj, originX, originY, drawWidth, drawHeight);
    } else if (layout === 'u-shape') {
        drawUShapedStair(obj, originX, originY, drawWidth, drawHeight);
    } else {
        drawStraightStair(obj, originX, originY, drawWidth, drawHeight);
    }
    ctx.restore();
}

function getObjectTransformInfo(obj) {
    const isVerticalDoor = obj.type === 'door' && obj.orientation === 'vertical';
    const drawWidth = isVerticalDoor ? obj.height : obj.width;
    const drawHeight = isVerticalDoor ? obj.width : obj.height;
    let orientationRotation = isVerticalDoor ? Math.PI / 2 : 0;
    let angleRad = ((obj.rotation || 0) * Math.PI) / 180;

    if ((obj.type === 'door' || obj.type === 'window') && obj.attachedWallId) {
        const wall = walls.find(w => w.id === obj.attachedWallId);
        const n1 = wall && getNodeById(wall.startNodeId);
        const n2 = wall && getNodeById(wall.endNodeId);

        if (n1 && n2) {
            angleRad = Math.atan2(n2.y - n1.y, n2.x - n1.x);
            orientationRotation = 0; // Angle already matches the wall
        }
    }

    return {
        cx: obj.x + obj.width / 2,
        cy: obj.y + obj.height / 2,
        angle: angleRad + orientationRotation,
        sx: obj.flipH ? -1 : 1,
        sy: obj.flipV ? -1 : 1,
        drawWidth,
        drawHeight
    };
}

function getObjectTransformedCorners(obj) {
    // Text renders around its top-left corner (to keep glyphs readable when flipped),
    // so we mirror that logic here to keep the selection border aligned with the drawn text.
    if (obj.type === 'text') {
        const { cx, cy, angle, sx, sy, drawWidth, drawHeight } = getObjectTransformInfo(obj);
        const localX = -drawWidth / 2;
        const localY = -drawHeight / 2;
        const flippedLocalX = localX * sx;
        const flippedLocalY = localY * sy;

        const rotX = flippedLocalX * Math.cos(angle) - flippedLocalY * Math.sin(angle);
        const rotY = flippedLocalX * Math.sin(angle) + flippedLocalY * Math.cos(angle);
        const anchor = { x: cx + rotX, y: cy + rotY };

        const rotatePoint = (px, py) => ({
            x: anchor.x + px * Math.cos(angle) - py * Math.sin(angle),
            y: anchor.y + px * Math.sin(angle) + py * Math.cos(angle)
        });

        return [
            anchor,
            rotatePoint(drawWidth, 0),
            rotatePoint(drawWidth, drawHeight),
            rotatePoint(0, drawHeight)
        ];
    }

    const { cx, cy, angle, sx, sy, drawWidth, drawHeight } = getObjectTransformInfo(obj);
    const halfW = drawWidth / 2;
    const halfH = drawHeight / 2;

    const locals = [
        { x: -halfW, y: -halfH },
        { x: halfW, y: -halfH },
        { x: halfW, y: halfH },
        { x: -halfW, y: halfH }
    ];

    return locals.map(({ x, y }) => {
        const lx = x * sx;
        const ly = y * sy;
        const rx = lx * Math.cos(angle) - ly * Math.sin(angle);
        const ry = lx * Math.sin(angle) + ly * Math.cos(angle);
        return { x: cx + rx, y: cy + ry };
    });
}

function getObjectHandlePoints(corners) {
    if (!corners || corners.length !== 4) return [];
    const [c0, c1, c2, c3] = corners;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    return [
        c0,
        mid(c0, c1),
        c1,
        mid(c1, c2),
        c2,
        mid(c2, c3),
        c3,
        mid(c3, c0)
    ];
}

function drawObjects() {
    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const { width, height } = obj;
        const { cx, cy, angle, sx, sy, drawWidth, drawHeight } = getObjectTransformInfo(obj);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
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
        } else if (obj.type === 'text') {
            // Keep text readable even when objects are flipped by mirroring
            // the position instead of the glyphs themselves
            const { angle, sx, sy } = getObjectTransformInfo(obj);
            const fontSize = obj.fontSize || 18;
            const fontWeight = obj.fontWeight || 'normal';
            const fontStyle = obj.fontStyle || 'normal';
            const flippedLocalX = localX * sx;
            const flippedLocalY = localY * sy;
            const rotX = flippedLocalX * Math.cos(angle) - flippedLocalY * Math.sin(angle);
            const rotY = flippedLocalX * Math.sin(angle) + flippedLocalY * Math.cos(angle);

            ctx.restore();
            ctx.save();
            ctx.translate(cx + rotX, cy + rotY);
            ctx.rotate(angle);
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px Arial`.trim();
            ctx.textBaseline = 'top';
            ctx.fillStyle = obj.textColor || obj.lineColor || '#000000';
            ctx.fillText(obj.text, 0, 0);
            ctx.restore();
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angle);
            ctx.scale(sx, sy);
        } else if (obj.type === 'staircase') {
            drawStaircaseGraphic(obj, localX, localY, width, height);
        } else if (obj.type === 'furniture') {
            ctx.fillRect(localX, localY, width, height);
            ctx.strokeRect(localX, localY, width, height);
        }

        ctx.restore();

        if (selectedObjectIndices.has(i)) {
            const corners = getObjectTransformedCorners(obj);
            ctx.save();
            ctx.strokeStyle = '#2980b9';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let c = 1; c < corners.length; c++) {
                ctx.lineTo(corners[c].x, corners[c].y);
            }
            ctx.closePath();
            ctx.stroke();

            if (obj.type === 'staircase') {
                const { handleSize, handles } = getStaircaseHandles(obj, corners);
                const half = handleSize / 2;

                handles.forEach(handle => {
                    const stroke = handle.type === 'rotate' ? '#f39c12' : '#2980b9';
                    ctx.fillStyle = '#ffffff';
                    ctx.strokeStyle = stroke;
                    ctx.lineWidth = 1.5;

                    if (handle.type === 'rotate') {
                        ctx.beginPath();
                        ctx.arc(handle.hx, handle.hy, half + 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    } else {
                        ctx.fillRect(handle.hx - half, handle.hy - half, handleSize, handleSize);
                        ctx.strokeRect(handle.hx - half, handle.hy - half, handleSize, handleSize);
                    }
                });
            } else {
                const handleSize = 8;
                const handles = getObjectHandlePoints(corners);

                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#2980b9';
                ctx.lineWidth = 1;
                handles.forEach(({ x: hx, y: hy }) => {
                    ctx.fillRect(hx - 1, hy - 1, handleSize + 2, handleSize + 2);
                    ctx.strokeRect(hx - 1, hy - 1, handleSize + 2, handleSize + 2);
                });
            }
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

        drawFloorVertices(points, selectedFloorIds.has(floor.id));

        ctx.restore();
    });
}

function drawFloorVertices(points, isSelected) {
    ctx.save();
    points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(22, 160, 133, 0.25)' : '#ffffff';
        ctx.strokeStyle = isSelected ? '#16a085' : '#7f8c8d';
        ctx.lineWidth = isSelected ? 2 : 1.25;
        ctx.fill();
        ctx.stroke();
    });
    ctx.restore();
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

function getStaircaseHandles(obj, cachedCorners = null) {
    const handleSize = 12;
    const corners = cachedCorners || getObjectTransformedCorners(obj);
    const [c0, c1, c2, c3] = corners;
    const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const center = mid(c0, c2);

    return {
        handleSize,
        handles: [
            { type: 'rotate', hx: c0.x, hy: c0.y },
            { type: 'top', hx: mid(c0, c1).x, hy: mid(c0, c1).y },
            { type: 'top-right', hx: c1.x, hy: c1.y },
            { type: 'right', hx: mid(c1, c2).x, hy: mid(c1, c2).y },
            { type: 'bottom-right', hx: c2.x, hy: c2.y },
            { type: 'bottom', hx: mid(c2, c3).x, hy: mid(c2, c3).y },
            { type: 'bottom-left', hx: c3.x, hy: c3.y },
            { type: 'left', hx: mid(c3, c0).x, hy: mid(c3, c0).y },
            { type: 'center', hx: center.x, hy: center.y }
        ]
    };
}

function getStaircaseHandleHit(x, y) {
    for (const index of selectedObjectIndices) {
        const obj = objects[index];
        if (!obj || obj.type !== 'staircase') continue;

        const { handleSize, handles } = getStaircaseHandles(obj);
        const half = handleSize / 2;

        for (const handle of handles) {
            if (
                x >= handle.hx - half &&
                x <= handle.hx + half &&
                y >= handle.hy - half &&
                y <= handle.hy + half
            ) {
                return { index, handle: handle.type };
            }
        }
    }
    return null;
}

function promptStaircaseSize(obj) {
    if (!obj || obj.type !== 'staircase') return;

    const currentWidthFeet = obj.width / scale;
    const currentLengthFeet = obj.height / scale;

    const widthInput = prompt('Update staircase/landing width (feet):', currentWidthFeet.toFixed(2));
    if (widthInput === null) return;

    const lengthInput = prompt('Update staircase/landing length (feet):', currentLengthFeet.toFixed(2));
    if (lengthInput === null) return;

    const newWidth = parseFloat(widthInput);
    const newLength = parseFloat(lengthInput);

    if (Number.isNaN(newWidth) || Number.isNaN(newLength)) {
        alert('Please enter valid numbers for width and length.');
        return;
    }

    pushUndoState();

    const minSizePx = scale * 0.5;
    obj.width = Math.max(minSizePx, newWidth * scale);
    obj.height = Math.max(minSizePx, newLength * scale);
    redrawCanvas();
}

function drawCurrentDragObject() {
    if (!isDrawing) return;
    if (!['door', 'window', 'furniture', 'staircase'].includes(currentTool)) return;

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    const previewStyles = getDefaultStyleForType(currentTool);

    withViewTransform(() => {
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
        } else if (currentTool === 'staircase') {
            const bounds = computeStaircaseBounds(startX, startY, currentX, currentY);
            drawStaircaseGraphic({
                type: 'staircase',
                lineColor: previewStyles.lineColor,
                fillColor: previewStyles.fillColor,
                lineWidth: parseInt(lineWidthInput.value, 10) || 2,
                staircase: staircaseSettings,
                orientation: bounds.orientation
            }, bounds.x, bounds.y, bounds.width, bounds.height);
        } else if (currentTool === 'furniture') {
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
        }

        ctx.restore();
    });
}

function drawFloorLassoOverlay() {
    if (currentTool !== 'floor') return;

    ctx.save();

    if (isFloorLassoActive && floorLassoPoints.length > 0) {
        const previewPoints = floorLassoPreview ? floorLassoPoints.concat([floorLassoPreview]) : floorLassoPoints;
        ctx.beginPath();
        ctx.moveTo(previewPoints[0].x, previewPoints[0].y);
        for (let i = 1; i < previewPoints.length; i++) {
            ctx.lineTo(previewPoints[i].x, previewPoints[i].y);
        }
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();

        previewPoints.forEach(pt => {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(52, 152, 219, 0.4)';
            ctx.strokeStyle = '#3498db';
            ctx.setLineDash([]);
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    if (floorHoverCorner) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(52, 152, 219, 0.25)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1;
        ctx.arc(floorHoverCorner.x, floorHoverCorner.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

function redrawCanvas() {
    if (is3DView) {
        refresh3DView();
        return;
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewOffsetX, viewOffsetY);
    drawBackgroundImage();
    drawGrid();
    drawFloors();
    drawWalls();
    drawObjects();
    drawDimensions();
    drawBackgroundMeasurementLine();
    drawSelectionBoxOverlay();
    drawFloorLassoOverlay();
    ctx.restore();

    drawRulers();
    updatePropertiesPanel();
}

// ============================================================
// 3D VIEW (THREE.JS)
// ============================================================
function setThreeStatus(message = '', isError = false) {
    if (!threeStatus) return;
    threeStatus.textContent = message;
    threeStatus.classList.toggle('hidden', !message);
    threeStatus.classList.toggle('error', !!isError);
}

function loadScriptOnce(src) {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
        if (existing.dataset.loaded === 'true' || existing.readyState === 'complete') {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', reject, { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.dataset.loaded = 'false';
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

function ensureThreeLibraries() {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        useFallback3DRenderer = true;
        if (!threeLibsPromise) {
            threeLibsPromise = Promise.resolve(false);
        }
        setThreeStatus('Offline mode: using built-in 3D preview.');
        return threeLibsPromise;
    }

    if (typeof THREE !== 'undefined' && THREE.Scene && THREE.PerspectiveCamera) {
        if (!threeLibsPromise) {
            threeLibsPromise = Promise.resolve(true);
        }
        setThreeStatus('');
        return threeLibsPromise;
    }

    if (!threeLibsPromise) {
        setThreeStatus('Loading 3D engine…');

        const loader = Promise.all([
            loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/three.js/r155/three.min.js'),
            loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/three.js/r155/examples/js/controls/OrbitControls.js')
        ]).then(() => {
            if (typeof THREE === 'undefined') {
                throw new Error('Three.js failed to initialize');
            }
            setThreeStatus('');
            return true;
        });

        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timed out loading Three.js')), 3500);
        });

        threeLibsPromise = Promise.race([loader, timeout]).catch(err => {
            console.warn('Falling back to offline 3D renderer', err);
            setThreeStatus('Using offline 3D preview (Three.js unreachable).');
            useFallback3DRenderer = true;
            return false;
        });
    }

    return threeLibsPromise;
}

function getThreeViewportSize() {
    const width = Math.max(threeContainer?.clientWidth || 0, canvas?.width || 1200, 1);
    const height = Math.max(threeContainer?.clientHeight || 0, canvas?.height || 900, 1);
    return { width, height };
}

function ensureThreeView() {
    if (threeScene || !threeContainer || typeof THREE === 'undefined') return;
    const { width, height } = getThreeViewportSize();

    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color('#f5f5f5');

    threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100000);
    threeCamera.position.set(0, 50, 90);

    threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    threeRenderer.setSize(width, height);
    threeRenderer.setClearColor(threeScene.background, 1);
    if ('outputEncoding' in threeRenderer) {
        threeRenderer.outputEncoding = THREE.sRGBEncoding;
    } else if ('outputColorSpace' in threeRenderer) {
        threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeRenderer.toneMappingExposure = 1.1;
    threeRenderer.shadowMap.enabled = true;
    threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    threeRenderer.physicallyCorrectLights = true;
    threeContainer.appendChild(threeRenderer.domElement);

    if (typeof THREE.OrbitControls === 'function') {
        threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
        threeControls.enableDamping = true;
        threeControls.enablePan = true;
        threeControls.enableZoom = true;
        threeControls.enableRotate = true;
        threeControls.screenSpacePanning = true;
        threeControls.zoomSpeed = 0.6;
        threeControls.rotateSpeed = 0.65;
        threeControls.panSpeed = 0.8;
        threeControls.minDistance = 2;
        threeControls.maxDistance = Infinity;
        threeControls.minPolarAngle = 0.05;
        threeControls.maxPolarAngle = Math.PI - 0.02;
        threeControls.autoRotate = false;
        threeControls.autoRotateSpeed = 0.4;
    }

    // Brighter lighting to keep floor meshes and orbit controls clearly visible
    threeScene.add(new THREE.AmbientLight(0xffffff, 1.9));

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x0b1220, 1.6);
    hemiLight.position.set(0, scale * 6, 0);
    threeScene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(scale * 25, scale * 40, scale * 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = scale * 120;
    threeScene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, scale * 160);
    pointLight.position.set(-scale * 15, scale * 20, -scale * 15);
    pointLight.castShadow = true;
    threeScene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 1.35, scale * 220, Math.PI / 4, 0.18, 1);
    spotLight.position.set(0, scale * 30, 0);
    spotLight.target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(1024, 1024);
    spotLight.shadow.bias = -0.00012;
    threeScene.add(spotLight);
    threeScene.add(spotLight.target);

    threeContentGroup = new THREE.Group();
    threeScene.add(threeContentGroup);

    window.addEventListener('resize', handleThreeResize);

    const renderLoop = () => {
        requestAnimationFrame(renderLoop);
        if (!threeRenderer || !threeScene || !threeCamera) return;
        if (threeControls) threeControls.update();
        threeRenderer.render(threeScene, threeCamera);
    };
    renderLoop();
}

function getPlanBounds() {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;

    const considerPoint = (px, pz) => {
        minX = Math.min(minX, px);
        minZ = Math.min(minZ, pz);
        maxX = Math.max(maxX, px);
        maxZ = Math.max(maxZ, pz);
    };

    if (Array.isArray(nodes)) {
        nodes.forEach(n => considerPoint(toWorldUnits(n.x), toWorldUnits(n.y)));
    }

    if (Array.isArray(floors)) {
        floors.forEach(floor => {
            const points = getFloorPoints(floor);
            points.forEach(p => considerPoint(toWorldUnits(p.x), toWorldUnits(p.y)));
        });
    }

    if (!isFinite(minX) || !isFinite(minZ)) {
        const defaultSize = 10;
        minX = -defaultSize;
        maxX = defaultSize;
        minZ = -defaultSize;
        maxZ = defaultSize;
    }

    return {
        minX,
        maxX,
        minZ,
        maxZ,
        width: maxX - minX,
        depth: maxZ - minZ
    };
}

function buildOrbitBoundingBox() {
    const bounds = getPlanBounds();
    const gridPadding = toWorldUnits(gridSize || 20) * 2;
    const padding = Math.max(bounds.width, bounds.depth, gridPadding * 3) * 0.15 + gridPadding;

    const min = new THREE.Vector3(bounds.minX - padding, 0, bounds.minZ - padding);
    const max = new THREE.Vector3(
        bounds.maxX + padding,
        Math.max(THREE_WALL_HEIGHT_FEET * 1.4, padding * 0.35),
        bounds.maxZ + padding
    );

    return new THREE.Box3(min, max);
}

function ensureFallback3DView() {
    if (!threeContainer) return;

    if (!fallback3DCanvas) {
        fallback3DCanvas = document.createElement('canvas');
        fallback3DCanvas.id = 'fallback3dCanvas';
        fallback3DCanvas.className = 'fallback-3d-canvas';
        fallback3DCtx = fallback3DCanvas.getContext('2d');
        threeContainer.innerHTML = '';
        threeContainer.appendChild(fallback3DCanvas);

        fallback3DCanvas.addEventListener('pointerdown', handleFallbackPointerDown);
        fallback3DCanvas.addEventListener('pointermove', handleFallbackPointerMove);
        fallback3DCanvas.addEventListener('pointerup', handleFallbackPointerUp);
        fallback3DCanvas.addEventListener('pointerleave', handleFallbackPointerUp);
        fallback3DCanvas.addEventListener('wheel', handleFallbackWheel, { passive: false });
        fallback3DCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
        window.addEventListener('resize', resizeFallbackCanvas);
    }

    resizeFallbackCanvas();
    updateFallbackCameraTarget();
    startFallbackAnimation();
}

function resizeFallbackCanvas() {
    if (!fallback3DCanvas || !threeContainer) return;
    const { clientWidth, clientHeight } = threeContainer;
    fallback3DCanvas.width = Math.max(clientWidth, 1);
    fallback3DCanvas.height = Math.max(clientHeight, 1);
}

function getFallbackCameraPosition() {
    const { distance, theta, phi, target } = fallback3DCamera;
    return {
        x: target.x + distance * Math.cos(phi) * Math.cos(theta),
        y: target.y + distance * Math.sin(phi),
        z: target.z + distance * Math.cos(phi) * Math.sin(theta)
    };
}

function projectFallbackPoint(point) {
    if (!fallback3DCtx || !fallback3DCanvas) return null;
    const cameraPos = getFallbackCameraPosition();
    const up = { x: 0, y: 1, z: 0 };
    const target = fallback3DCamera.target;

    const forwardVec = normalizeVector({
        x: target.x - cameraPos.x,
        y: target.y - cameraPos.y,
        z: target.z - cameraPos.z
    });
    const rightVec = normalizeVector(crossVector(forwardVec, up));
    const trueUp = crossVector(rightVec, forwardVec);

    const rel = {
        x: point.x - cameraPos.x,
        y: point.y - cameraPos.y,
        z: point.z - cameraPos.z
    };

    const viewX = dotVector(rel, rightVec);
    const viewY = dotVector(rel, trueUp);
    const viewZ = dotVector(rel, forwardVec);

    const fov = Math.PI / 3;
    const focal = fallback3DCanvas.height / (2 * Math.tan(fov / 2));
    const safeZ = Math.max(viewZ, 0.1);

    return {
        x: fallback3DCanvas.width / 2 + (viewX * focal) / safeZ,
        y: fallback3DCanvas.height / 2 - (viewY * focal) / safeZ,
        depth: viewZ
    };
}

function normalizeVector(v) {
    const len = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dotVector(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function crossVector(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function drawFallbackPolygon(points, { fillStyle = null, strokeStyle = null, lineWidth = 1 } = {}) {
    if (!fallback3DCtx || points.length === 0) return;
    fallback3DCtx.beginPath();
    fallback3DCtx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        fallback3DCtx.lineTo(points[i].x, points[i].y);
    }
    fallback3DCtx.closePath();
    if (fillStyle) {
        fallback3DCtx.fillStyle = fillStyle;
        fallback3DCtx.fill();
    }
    if (strokeStyle) {
        fallback3DCtx.strokeStyle = strokeStyle;
        fallback3DCtx.lineWidth = lineWidth;
        fallback3DCtx.stroke();
    }
}

function drawFallbackGrid() {
    if (!fallback3DCtx) return;
    const spacing = toWorldUnits(gridSize || 20);
    const bounds = getPlanBounds();
    const extent = Math.max(bounds.width, bounds.depth, spacing * 10);
    const half = extent * 1.2;
    const lines = [];

    for (let i = -half; i <= half; i += spacing) {
        lines.push([
            { x: i, y: 0, z: -half },
            { x: i, y: 0, z: half }
        ]);
        lines.push([
            { x: -half, y: 0, z: i },
            { x: half, y: 0, z: i }
        ]);
    }

    fallback3DCtx.lineWidth = 1;
    lines.forEach(([start, end]) => {
        const p1 = projectFallbackPoint(start);
        const p2 = projectFallbackPoint(end);
        if (!p1 || !p2) return;
        const alpha = 0.3 + Math.max(0, Math.min(0.4, (p1.depth + p2.depth) * 0.0006));
        fallback3DCtx.strokeStyle = `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
        fallback3DCtx.beginPath();
        fallback3DCtx.moveTo(p1.x, p1.y);
        fallback3DCtx.lineTo(p2.x, p2.y);
        fallback3DCtx.stroke();
    });
}

function drawFallbackFloors() {
    if (!Array.isArray(floors)) return;
    floors.forEach(floor => {
        const points = getFloorPoints(floor);
        if (points.length < 3) return;
        const projected = points.map(p => projectFallbackPoint({ x: toWorldUnits(p.x), y: 0.02, z: toWorldUnits(p.y) }));
        if (projected.some(p => !p)) return;
        const fill = (floor.texture && floor.texture.color) || fillColorInput.value || '#d9d9d9';
        drawFallbackPolygon(projected, { fillStyle: fill, strokeStyle: '#1f2937', lineWidth: 1 });
    });
}

function drawFallbackWalls() {
    if (!Array.isArray(walls)) return;
    const height = THREE_WALL_HEIGHT_FEET;
    walls.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;

        const p1 = { x: toWorldUnits(n1.x), z: toWorldUnits(n1.y) };
        const p2 = { x: toWorldUnits(n2.x), z: toWorldUnits(n2.y) };
        const thickness = toWorldUnits(wall.thicknessPx || scale * 0.5);
        const dir = normalizeVector({ x: p2.x - p1.x, y: 0, z: p2.z - p1.z });
        const normal = { x: -dir.z * (thickness / 2), y: 0, z: dir.x * (thickness / 2) };

        const corners = [
            { x: p1.x + normal.x, y: 0, z: p1.z + normal.z },
            { x: p2.x + normal.x, y: 0, z: p2.z + normal.z },
            { x: p2.x - normal.x, y: 0, z: p2.z - normal.z },
            { x: p1.x - normal.x, y: 0, z: p1.z - normal.z }
        ];

        const topCorners = corners.map(c => ({ ...c, y: height }));
        const faces = [
            [corners[0], corners[1], corners[2], corners[3]],
            [topCorners[0], topCorners[1], topCorners[2], topCorners[3]],
            [corners[0], corners[1], topCorners[1], topCorners[0]],
            [corners[1], corners[2], topCorners[2], topCorners[1]],
            [corners[2], corners[3], topCorners[3], topCorners[2]],
            [corners[3], corners[0], topCorners[0], topCorners[3]]
        ];

        const color = wall.lineColor || DEFAULT_WALL_COLOR;
        const faceShades = [0.08, 0.14, -0.05, 0.06, -0.08, 0.02];

        const projectedFaces = faces.map((face, index) => {
            const projected = face.map(pt => projectFallbackPoint(pt));
            if (projected.some(p => !p)) return null;

            const avgDepth = projected.reduce((sum, p) => sum + (p.depth || 0), 0) / projected.length;
            return {
                projected,
                shade: faceShades[index] ?? 0,
                depth: avgDepth
            };
        }).filter(Boolean);

        projectedFaces
            .sort((a, b) => (b.depth || 0) - (a.depth || 0))
            .forEach(({ projected, shade }) => {
                drawFallbackPolygon(projected, {
                    fillStyle: shadeColor(color, 0.22 + shade),
                    strokeStyle: '#0c1220',
                    lineWidth: 1.2
                });
            });
    });
}

function shadeColor(hex, amount = 0.1) {
    const col = hex.replace('#', '');
    const num = parseInt(col, 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const r = clamp((num >> 16) + 255 * amount);
    const g = clamp(((num >> 8) & 0xff) + 255 * amount);
    const b = clamp((num & 0xff) + 255 * amount);
    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

function drawFallbackSky() {
    if (!fallback3DCtx || !fallback3DCanvas) return;
    const gradient = fallback3DCtx.createLinearGradient(0, 0, 0, fallback3DCanvas.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    fallback3DCtx.fillStyle = gradient;
    fallback3DCtx.fillRect(0, 0, fallback3DCanvas.width, fallback3DCanvas.height);
}

function renderFallback3DScene() {
    if (!fallback3DCtx || !fallback3DCanvas) return;
    fallback3DCtx.clearRect(0, 0, fallback3DCanvas.width, fallback3DCanvas.height);
    drawFallbackSky();

    drawFallbackGrid();
    drawFallbackFloors();
    drawFallbackWalls();
}

function updateFallbackCameraTarget() {
    let center;
    let largest;

    if (typeof THREE !== 'undefined' && typeof THREE.Box3 === 'function') {
        const orbitBox = buildOrbitBoundingBox();
        const sphere = orbitBox.getBoundingSphere(new THREE.Sphere());
        center = sphere.center || new THREE.Vector3(0, THREE_WALL_HEIGHT_FEET * 0.4, 0);
        largest = Math.max(sphere.radius * 2 || 0, 10);
    } else {
        const bounds = getPlanBounds();
        center = {
            x: (bounds.minX + bounds.maxX) / 2,
            y: THREE_WALL_HEIGHT_FEET * 0.4,
            z: (bounds.minZ + bounds.maxZ) / 2
        };
        largest = Math.max(bounds.width, bounds.depth, 10);
    }

    fallback3DCamera.target = {
        x: center.x,
        y: center.y,
        z: center.z
    };
    fallback3DCamera.distance = Math.max(largest * 1.3, 18);
}

function startFallbackAnimation() {
    if (fallback3DAnimationId) cancelAnimationFrame(fallback3DAnimationId);

    const animate = () => {
        renderFallback3DScene();
        fallback3DAnimationId = requestAnimationFrame(animate);
    };

    animate();
}

function stopFallbackAnimation() {
    if (fallback3DAnimationId) cancelAnimationFrame(fallback3DAnimationId);
    fallback3DAnimationId = null;
}

function handleFallbackPointerDown(e) {
    if (!fallback3DCamera) return;
    fallback3DCamera.isDragging = true;
    fallback3DCamera.lastPointer = { x: e.clientX, y: e.clientY };
    fallback3DCamera.dragMode = (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit';
    fallback3DCamera.autoRotate = false;
    fallback3DCanvas?.setPointerCapture(e.pointerId);
}

function handleFallbackPointerMove(e) {
    if (!fallback3DCamera.isDragging || !fallback3DCamera.lastPointer) return;
    const dx = e.clientX - fallback3DCamera.lastPointer.x;
    const dy = e.clientY - fallback3DCamera.lastPointer.y;
    if (fallback3DCamera.dragMode === 'pan') {
        const panScale = Math.max(0.0015, fallback3DCamera.distance * 0.002);
        const theta = fallback3DCamera.theta;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        fallback3DCamera.target.x -= (dx * panScale * cosTheta) + (dy * panScale * sinTheta * 0.6);
        fallback3DCamera.target.z += (dx * panScale * sinTheta) - (dy * panScale * cosTheta * 0.6);
        fallback3DCamera.target.y += dy * panScale * 0.4;
    } else {
        fallback3DCamera.theta -= dx * 0.005;
        fallback3DCamera.phi = Math.min(Math.PI - 0.1, Math.max(0.12, fallback3DCamera.phi - dy * 0.005));
    }
    fallback3DCamera.lastPointer = { x: e.clientX, y: e.clientY };
    renderFallback3DScene();
}

function handleFallbackPointerUp(e) {
    if (!fallback3DCamera.isDragging) return;
    fallback3DCamera.isDragging = false;
    fallback3DCamera.dragMode = 'orbit';
    fallback3DCamera.lastPointer = null;
    fallback3DCanvas?.releasePointerCapture(e.pointerId);
}

function handleFallbackWheel(e) {
    e.preventDefault();
    const factor = Math.exp(e.deltaY * 0.001);
    fallback3DCamera.distance = Math.max(5, Math.min(320, fallback3DCamera.distance * factor));
    renderFallback3DScene();
}

function handleThreeResize() {
    if (!is3DView || !threeRenderer || !threeCamera || !threeContainer) return;
    const { width, height } = getThreeViewportSize();
    threeCamera.aspect = width / height;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(width, height);
}

function disposeThreeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose && m.dispose());
        } else if (obj.material.dispose) {
            obj.material.dispose();
        }
    }
}

function clearThreeContent() {
    if (!threeContentGroup) return;
    while (threeContentGroup.children.length) {
        const child = threeContentGroup.children.pop();
        disposeThreeObject(child);
    }
    wallMeshes = [];
    orbitCenterHelper = null;
}

function toWorldUnits(pxValue) {
    return pxValue / Math.max(scale || 1, 0.0001);
}

function generateConcreteTexture(size = 256, accent = '#e2e8f0') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const textureCtx = canvas.getContext('2d');

    textureCtx.fillStyle = accent;
    textureCtx.fillRect(0, 0, size, size);

    const noiseDensity = 4200;
    for (let i = 0; i < noiseDensity; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const alpha = Math.random() * 0.18 + 0.06;
        const shade = Math.floor(210 + Math.random() * 25);
        textureCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${alpha})`;
        textureCtx.fillRect(x, y, 1.2, 1.2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.anisotropy = Math.min(8, texture.anisotropy || 4);
    return texture;
}

function createConcreteMaterial(color = DEFAULT_3D_WALL_COLOR) {
    const diffuseTexture = generateConcreteTexture(256, color);
    const bumpTexture = generateConcreteTexture(256, '#cbd5e1');

    return new THREE.MeshPhysicalMaterial({
        color,
        map: diffuseTexture,
        bumpMap: bumpTexture,
        bumpScale: 0.08,
        roughness: 0.9,
        metalness: 0.06,
        clearcoat: 0.08,
        clearcoatRoughness: 0.9,
        flatShading: false,
        transparent: false,
        depthWrite: true,
        depthTest: true
    });
}

function createGroundElements() {
    const bounds = getPlanBounds();
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    const gridSpacing = Math.max(toWorldUnits(gridSize || 20), 1);
    const largestPlanSize = Math.max(bounds.width, bounds.depth, 1);
    const size = Math.max(largestPlanSize + gridSpacing * 4, 40);

    const planeGeometry = new THREE.PlaneGeometry(size, size, 1, 1);
    planeGeometry.rotateX(-Math.PI / 2);
    const planeMaterial = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.95,
        metalness: 0.02,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.set(centerX, -0.05, centerZ);
    plane.userData.isGround = true;
    plane.receiveShadow = true;

    const divisions = Math.max(10, Math.round(size / gridSpacing));
    const grid = new THREE.GridHelper(size, divisions, 0x94a3b8, 0xcbd5e1);
    grid.material.depthWrite = false;
    grid.position.set(centerX, 0.02, centerZ);
    grid.userData.isGround = true;

    return { plane, grid };
}

function createPlanOverlay() {
    if ((!walls || walls.length === 0) && (!floors || floors.length === 0)) return null;

    const group = new THREE.Group();
    group.position.y = THREE_PLAN_OUTLINE_HEIGHT;

    walls.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(toWorldUnits(n1.x), 0, toWorldUnits(n1.y)),
            new THREE.Vector3(toWorldUnits(n2.x), 0, toWorldUnits(n2.y))
        ]);

        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#94a3b8' }));
        group.add(line);
    });

    floors.forEach(floor => {
        const points = getFloorPoints(floor);
        if (!points || points.length < 3) return;
        const loopPoints = points.map(p => new THREE.Vector3(toWorldUnits(p.x), 0, toWorldUnits(p.y)));
        const geometry = new THREE.BufferGeometry().setFromPoints(loopPoints);
        const line = new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color: '#eab308' }));
        group.add(line);
    });

    return group;
}

function createWallMesh(wall, wallHeight) {
    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    if (!n1 || !n2) return null;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const length = toWorldUnits(Math.hypot(dx, dy)) || 1;
    const thickness = toWorldUnits(wall.thicknessPx || (0.5 * scale));

    const geometry = new THREE.BoxGeometry(length, wallHeight, thickness);
    const wallColor = (wall.lineColor && wall.lineColor !== DEFAULT_WALL_COLOR)
        ? wall.lineColor
        : DEFAULT_3D_WALL_COLOR;
    const material = createConcreteMaterial(wallColor);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const midX = toWorldUnits((n1.x + n2.x) / 2);
    const midY = toWorldUnits((n1.y + n2.y) / 2);
    mesh.position.set(midX, wallHeight / 2, midY);
    mesh.rotation.y = -Math.atan2(dy, dx);
    return mesh;
}

function createFloorMesh(floor) {
    const points = getFloorPoints(floor);
    if (points.length < 3) return null;

    const shape = new THREE.Shape();
    shape.moveTo(toWorldUnits(points[0].x), toWorldUnits(points[0].y));
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(toWorldUnits(points[i].x), toWorldUnits(points[i].y));
    }
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: THREE_FLOOR_THICKNESS_FEET, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);

    const color = (floor.texture && floor.texture.color) || fillColorInput.value || '#d9d9d9';
    const material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.05,
        roughness: 0.8,
        side: THREE.DoubleSide,
        transparent: false,
        opacity: 1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createDoorOrWindowMesh(obj, wallHeight) {
    const drawWidth = toWorldUnits(obj.width);
    const drawDepth = toWorldUnits(obj.height);
    const length = Math.max(drawWidth, 0.1);
    const depth = Math.max(drawDepth, 0.1);
    const isWindow = obj.type === 'window';
    const height = isWindow ? wallHeight * 0.5 : wallHeight * 0.9;
    const centerY = isWindow ? wallHeight * 0.6 : height / 2;

    const geometry = new THREE.BoxGeometry(length, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color: isWindow ? '#b7d8ff' : '#c19a6b',
        transparent: false,
        opacity: 1,
        metalness: 0.1,
        roughness: 0.5,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const centerX = toWorldUnits(obj.x + obj.width / 2);
    const centerZ = toWorldUnits(obj.y + obj.height / 2);
    mesh.position.set(centerX, centerY, centerZ);

    if (obj.attachedWallId) {
        const wall = walls.find(w => w.id === obj.attachedWallId);
        const n1 = wall && getNodeById(wall.startNodeId);
        const n2 = wall && getNodeById(wall.endNodeId);
        if (n1 && n2) {
            mesh.rotation.y = -Math.atan2(n2.y - n1.y, n2.x - n1.x);
        }
    } else {
        mesh.rotation.y = obj.orientation === 'vertical' ? Math.PI / 2 : 0;
    }
    return mesh;
}

function createHouseShowcaseModel() {
    if (typeof THREE === 'undefined') return null;

    const group = new THREE.Group();
    group.userData.isShowcase = true;

    const baseWidth = 32;
    const baseDepth = 26;
    const wallHeight = 12;

    const wallMaterial = createConcreteMaterial('#d1d5db');
    const shell = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, wallHeight, baseDepth), wallMaterial);
    shell.castShadow = true;
    shell.receiveShadow = true;
    shell.position.y = wallHeight / 2;
    group.add(shell);

    const roofMaterial = new THREE.MeshPhysicalMaterial({
        color: '#9ca3af',
        metalness: 0.1,
        roughness: 0.35,
        clearcoat: 0.2,
        clearcoatRoughness: 0.8,
        side: THREE.FrontSide,
        transparent: false,
        opacity: 1
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(baseWidth + 0.8, 1.2, baseDepth + 0.8), roofMaterial);
    roof.position.y = wallHeight + 0.6;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(baseWidth + 2, 1, baseDepth + 2), createConcreteMaterial('#cbd5e1'));
    plinth.position.y = 0.5;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(3, 7, 0.6),
        new THREE.MeshPhysicalMaterial({
            color: '#8b5a2b',
            roughness: 0.7,
            metalness: 0.05,
            side: THREE.FrontSide,
            transparent: false,
            opacity: 1
        })
    );
    door.position.set(0, 3.5, (baseDepth / 2) - 0.3);
    door.castShadow = true;
    door.receiveShadow = true;
    group.add(door);

    const windowMaterial = new THREE.MeshPhysicalMaterial({
        color: '#dbeafe',
        transparent: false,
        opacity: 1,
        roughness: 0.1,
        metalness: 0.25,
        side: THREE.FrontSide
    });
    const windowGeometry = new THREE.BoxGeometry(4, 3, 0.4);
    const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial);
    leftWindow.position.set(-(baseWidth / 3), 7, (baseDepth / 2) - 0.5);
    leftWindow.castShadow = true;
    leftWindow.receiveShadow = true;
    group.add(leftWindow);

    const rightWindow = leftWindow.clone();
    rightWindow.position.x = baseWidth / 3;
    group.add(rightWindow);

    group.position.set(0, 0, 0);
    return group;
}

function rebuild3DScene() {
    if (useFallback3DRenderer) {
        ensureFallback3DView();
        renderFallback3DScene();
        return;
    }

    ensureThreeView();
    if (!threeContentGroup) return;

    clearThreeContent();

    const ground = createGroundElements();
    if (ground) {
        threeContentGroup.add(ground.plane);
        threeContentGroup.add(ground.grid);
    }

    const planOverlay = createPlanOverlay();
    if (planOverlay) threeContentGroup.add(planOverlay);

    const wallHeight = THREE_WALL_HEIGHT_FEET;

    floors.forEach(floor => {
        const mesh = createFloorMesh(floor);
        if (mesh) threeContentGroup.add(mesh);
    });

    walls.forEach(wall => {
        const mesh = createWallMesh(wall, wallHeight);
        if (mesh) {
            wallMeshes.push({ id: wall.id, mesh });
            threeContentGroup.add(mesh);
        }
    });

    objects.forEach(obj => {
        if (!['door', 'window'].includes(obj.type)) return;
        const mesh = createDoorOrWindowMesh(obj, wallHeight);
        if (mesh) threeContentGroup.add(mesh);
    });

    updateOrbitHelper();
    fitThreeCamera();
}

function getCameraTargetBoundingBox() {
    const orbitBox = buildOrbitBoundingBox();
    const box = orbitBox.clone();
    let hasSelection = false;

    const isWallIdSelected = (wallId) => {
        if (!selectedWalls || selectedWalls.size === 0) return false;
        for (const wall of selectedWalls) {
            if ((wall && wall.id) === wallId || wall === wallId) return true;
        }
        return false;
    };

    if (selectedWalls && selectedWalls.size) {
        wallMeshes.forEach(({ id, mesh }) => {
            if (isWallIdSelected(id)) {
                hasSelection = true;
                box.expandByObject(mesh);
            }
        });
    }

    if (!hasSelection) {
        wallMeshes.forEach(({ mesh }) => box.expandByObject(mesh));
    }

    if (box.isEmpty() && threeContentGroup) {
        threeContentGroup.children.forEach(child => {
            if (!child.userData?.isGround) {
                box.expandByObject(child);
            }
        });
    }

    return box.isEmpty() ? orbitBox : box;
}

function fitThreeCamera() {
    if (!threeContentGroup || !threeCamera) return;
    const box = getCameraTargetBoundingBox();
    if (!box || box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || scale * 10;

    const distance = Math.max(maxDim * 1.4, scale * 6);
    const direction = new THREE.Vector3(1, 0.8, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(distance));

    threeCamera.position.copy(position);
    threeCamera.near = 0.1;
    threeCamera.far = Math.max(50000, distance * 8);
    threeCamera.updateProjectionMatrix();

    if (threeControls) {
        threeControls.target.copy(center);
        threeControls.update();
    } else {
        threeCamera.lookAt(center);
    }
}

function getOrbitCenter() {
    const orbitBox = buildOrbitBoundingBox();
    return orbitBox.getCenter(new THREE.Vector3());
}

function updateOrbitHelper() {
    if (!threeContentGroup || typeof THREE === 'undefined') return;

    if (orbitCenterHelper && orbitCenterHelper.parent) {
        orbitCenterHelper.parent.remove(orbitCenterHelper);
        disposeThreeObject(orbitCenterHelper);
    }

    const center = getOrbitCenter();
    const helperSize = Math.max(toWorldUnits(gridSize || 20) * 0.45, 0.35);
    const geometry = new THREE.SphereGeometry(helperSize, 18, 12);
    const material = new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#fb923c',
        emissiveIntensity: 0.8,
        metalness: 0.1,
        roughness: 0.3
    });

    orbitCenterHelper = new THREE.Mesh(geometry, material);
    orbitCenterHelper.position.copy(center);
    orbitCenterHelper.userData.isHelper = true;
    threeContentGroup.add(orbitCenterHelper);
}

function switchTo3DView() {
    is3DView = true;
    if (canvasContainer) {
        last2DScrollLeft = canvasContainer.scrollLeft;
        last2DScrollTop = canvasContainer.scrollTop;
    }
    if (canvas) canvas.classList.add('hidden');
    if (threeContainer) threeContainer.classList.remove('hidden');
    setThreeStatus('');
    update3DButtonLabel('Show 2D');
    rebuild3DScene();
    if (!useFallback3DRenderer) {
        handleThreeResize();
    }
}

function switchTo2DView() {
    is3DView = false;
    if (canvas) canvas.classList.remove('hidden');
    if (threeContainer) threeContainer.classList.add('hidden');
    if (canvasContainer) {
        canvasContainer.scrollLeft = last2DScrollLeft;
        canvasContainer.scrollTop = last2DScrollTop;
    }
    stopFallbackAnimation();
    setThreeStatus('');
    update3DButtonLabel('Show 3D');
    redrawCanvas();
}

function toggleViewMode() {
    if (is3DView) {
        switchTo2DView();
    } else {
        viewHousePlanIn3D();
    }
}

async function viewHousePlanIn3D() {
    try {
        const libsReady = await ensureThreeLibraries();
        if (libsReady === false && !useFallback3DRenderer) {
            return;
        }
    } catch (err) {
        console.error('3D view unavailable', err);
        return;
    }

    if (useFallback3DRenderer) {
        ensureFallback3DView();
    } else {
        ensureThreeView();
    }
    switchTo3DView();
}

function refresh3DView() {
    if (!is3DView) return;
    rebuild3DScene();
}

function update3DButtonLabel(text) {
    if (!toggle3DViewButton) return;
    toggle3DViewButton.setAttribute('aria-label', text);
    const label = toggle3DViewButton.querySelector('.tool-label');
    const icon = toggle3DViewButton.querySelector('.tool-icon');
    if (label) label.textContent = text;
    if (icon) icon.textContent = text === 'Show 3D' ? '3D' : '2D';
    if (!label && !icon) {
        toggle3DViewButton.textContent = text;
    }
}

// ============================================================
// KEYBOARD HANDLING
// ============================================================
function selectAllEntities() {
    selectedObjectIndices = new Set(objects.map((_, i) => i));
    selectedWalls = new Set(walls);
    selectedNode = null;
    selectedFloorIds = new Set(floors.map(f => f.id));
    clearDimensionSelection();
    isDraggingNode = false;
    selectAllMode = true;
    expandSelectionWithGroups();
    groupSelectionElements({ silent: true });
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

            case 'g': // Group / Ungroup selection
                e.preventDefault();
                if (e.shiftKey) {
                    ungroupSelectionElements();
                } else {
                    groupSelectionElements();
                }
                redrawCanvas();
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
            const hasSelection =
                selectedObjectIndices.size > 0 ||
                selectedWalls.size > 0 ||
                selectedFloorIds.size > 0 ||
                selectedDimensionIndex !== null;
            if (hasSelection) {
                e.preventDefault();
                pushUndoState();
                moveSelectedObjects(dx, dy, { skipUndo: true });
                moveSelectedWalls(dx, dy, { skipUndo: true });
                moveSelectedFloors(dx, dy, { skipUndo: true });
                moveSelectedDimension(dx, dy, { skipUndo: true });
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
            alignmentHints = [];
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
            ungroupSelectionElements();
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
            const hasSelectedDimension = selectedDimensionIndex !== null;

            if (hasSelection) {
                deleteSelection();
            } else if (hasSelectedDimension && window.dimensions?.[selectedDimensionIndex]) {
                pushUndoState();
                window.dimensions.splice(selectedDimensionIndex, 1);
                clearDimensionSelection();
                redrawCanvas();
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
            rotateSelection(angle);
            return;
        }
    }
}

// ============================================================
// UI
// ============================================================
function getActivePropertyContext() {
    if (selectedObjectIndices.size > 0) {
        const types = new Set();
        selectedObjectIndices.forEach(index => {
            const obj = objects[index];
            if (obj?.type) {
                types.add(obj.type);
            }
        });

        if (types.size === 1) {
            return types.values().next().value;
        }
        return 'mixed';
    }

    if (selectedFloorIds.size > 0) return 'floor';
    if (selectedWalls.size > 0) return 'wall';
    return currentTool || 'select';
}

function updatePropertiesPanel() {
    const context = getActivePropertyContext();
    const normalizedContext = context === 'mixed' ? 'select' : context;
    if (context === lastPropertyContext) return;
    lastPropertyContext = context;

    const groups = document.querySelectorAll('.property-group');
    groups.forEach(group => {
        const contexts = (group.dataset.contexts || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        const shouldShow = contexts.length === 0 || contexts.includes(normalizedContext);
        group.classList.toggle('hidden', !shouldShow);
    });
}

function clampValue(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function recalcTextObjectDimensions(obj) {
    const dims = measureTextDimensions(
        obj.text,
        obj.fontSize || 18,
        obj.fontWeight || 'normal',
        obj.fontStyle || 'normal'
    );
    obj.width = dims.width;
    obj.height = dims.height;
}

function applyTextChangesToSelection(mutator) {
    const indices = Array.from(selectedObjectIndices).filter(i => objects[i]?.type === 'text');
    if (!indices.length) return false;

    pushUndoState();
    indices.forEach(index => {
        const obj = objects[index];
        mutator(obj);
        recalcTextObjectDimensions(obj);
    });
    redrawCanvas();
    return true;
}

function updateTextStyleButtons() {
    if (textBoldButton) textBoldButton.classList.toggle('active', textIsBold);
    if (textItalicButton) textItalicButton.classList.toggle('active', textIsItalic);
}

function updateToolInfo() {
    if (!toolInfoDisplay) return;
    if (isBackgroundMeasurementActive) {
        toolInfoDisplay.textContent = hasValidMeasurementDistance()
            ? `Calibrating background: set ${getMeasurementLabel()} on the preview overlay`
            : 'Calibrating background: enter a known distance to place on the preview overlay';
        return;
    }
    let name = '';
    switch (currentTool) {
        case 'wall': name = 'Wall'; break;
        case 'door': name = 'Door'; break;
        case 'window': name = 'Window'; break;
        case 'furniture': name = 'Furniture'; break;
        case 'staircase': name = 'Staircase'; break;
        case 'floor': name = 'Floor'; break;
        case 'select': name = 'Select'; break;
        case 'erase': name = 'Eraser'; break;
        case 'dimension': name = 'Dimension'; break;
        case 'text': name = 'Text'; break;
    }

    if (isPasteMode) {
        name = 'Paste Mode (click to set point)';
    }

    toolInfoDisplay.textContent = name;
}

function describeLayout(layout) {
    if (!layout) return 'Straight run';
    switch (layout) {
        case 'landing': return 'Straight with landing';
        case 'l-shape': return 'L shape';
        case 'u-shape': return 'U shape';
        default: return 'Straight run';
    }
}

function getSelectedStaircaseMode() {
    const activeBtn = Array.from(staircaseModeButtons || []).find(btn => btn.classList.contains('active'));
    return activeBtn?.dataset?.staircaseMode || staircaseSettings.mode || 'steps';
}

function getSelectedLandingType() {
    const checked = Array.from(landingTypeRadios || []).find(radio => radio.checked);
    return checked?.value || staircaseSettings.landingType || 'rectangular';
}

function getLandingDimensionsFromInputs() {
    const landingWidthFeet = parseFloat(landingWidthFeetInput?.value) || staircaseSettings.landingWidthFeet || 0;
    const landingWidthInches = parseFloat(landingWidthInchesInput?.value) || staircaseSettings.landingWidthInches || 0;
    const landingLengthFeet = parseFloat(landingLengthFeetInput?.value) || staircaseSettings.landingLengthFeet || 0;
    const landingLengthInches = parseFloat(landingLengthInchesInput?.value) || staircaseSettings.landingLengthInches || 0;

    return { landingWidthFeet, landingWidthInches, landingLengthFeet, landingLengthInches };
}

function feetWithInches(feet = 0, inches = 0) {
    return (parseFloat(feet) || 0) + ((parseFloat(inches) || 0) / 12);
}

function syncStaircaseModeUI(mode) {
    if (!mode) return;
    staircaseModeButtons?.forEach(btn => {
        const isActive = btn.dataset.staircaseMode === mode;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (staircaseStepsSection) {
        staircaseStepsSection.classList.toggle('hidden', mode !== 'steps');
    }
    if (staircaseLandingSection) {
        staircaseLandingSection.classList.toggle('hidden', mode !== 'landing');
    }
}

function syncLandingTypeUI(type) {
    landingTypeRadios?.forEach(radio => {
        radio.checked = radio.value === type;
    });
    if (squaredLandingHint) {
        squaredLandingHint.classList.toggle('hidden', type !== 'squared');
    }
}

function syncStaircaseInputsFromSettings() {
    if (staircaseWidthFeetInput) staircaseWidthFeetInput.value = staircaseSettings.widthFeet ?? staircaseWidthFeetInput.value;
    if (staircaseWidthInchesInput) staircaseWidthInchesInput.value = staircaseSettings.widthInches ?? staircaseWidthInchesInput.value;
    if (staircaseRunInchesInput) staircaseRunInchesInput.value = staircaseSettings.runInches ?? staircaseSettings.treadDepthInches ?? DEFAULT_TREAD_DEPTH_INCHES;
    if (staircaseStepsInput) staircaseStepsInput.value = staircaseSettings.steps ?? staircaseStepsInput.value;
    if (landingWidthFeetInput) landingWidthFeetInput.value = staircaseSettings.landingWidthFeet ?? landingWidthFeetInput.value;
    if (landingWidthInchesInput) landingWidthInchesInput.value = staircaseSettings.landingWidthInches ?? landingWidthInchesInput.value;
    if (landingLengthFeetInput) landingLengthFeetInput.value = staircaseSettings.landingLengthFeet ?? landingLengthFeetInput.value;
    if (landingLengthInchesInput) landingLengthInchesInput.value = staircaseSettings.landingLengthInches ?? landingLengthInchesInput.value;
}

function updateStaircaseSummary() {
    if (!staircaseSummary) return;
    const mode = getSelectedStaircaseMode();
    const parts = [];

    if (mode === 'landing') {
        const landingType = getSelectedLandingType();
        const { landingWidthFeet, landingWidthInches, landingLengthFeet, landingLengthInches } = getLandingDimensionsFromInputs();
        const widthFeet = feetWithInches(landingWidthFeet, landingWidthInches);
        const lengthFeet = feetWithInches(landingLengthFeet, landingLengthInches);

        parts.push(`Landing: ${landingType === 'squared' ? 'Squared with diagonal guide' : 'Rectangular'}`);
        parts.push(`Width: ${widthFeet.toFixed(1)} ft`);
        parts.push(`Length: ${lengthFeet.toFixed(1)} ft`);
    } else {
        const widthFeet = feetWithInches(
            parseFloat(staircaseWidthFeetInput?.value) || staircaseSettings.widthFeet,
            parseFloat(staircaseWidthInchesInput?.value) || staircaseSettings.widthInches
        );
        const runInches = parseFloat(staircaseRunInchesInput?.value) || staircaseSettings.runInches || DEFAULT_TREAD_DEPTH_INCHES;
        const steps = parseInt(staircaseStepsInput?.value, 10) || staircaseSettings.steps;

        parts.push('Steps');
        parts.push(`Width: ${widthFeet.toFixed(1)} ft`);
        parts.push(`Run: ${runInches.toFixed(1)} in`);
        parts.push(`Steps: ${steps}`);
    }

    staircaseSummary.textContent = parts.join(' • ');
}

function openStaircaseEditorForObject(index) {
    const target = objects[index];
    if (!target || target.type !== 'staircase') return;
    staircaseEditTargetIndex = index;
    staircaseSettings = { ...staircaseSettings, ...target.staircase };
    openStaircaseModal();
}

function applyStaircaseSettings() {
    staircaseSettings = {
        ...staircaseSettings,
        mode: getSelectedStaircaseMode(),
        widthFeet: parseFloat(staircaseWidthFeetInput?.value) || staircaseSettings.widthFeet,
        widthInches: parseFloat(staircaseWidthInchesInput?.value) || staircaseSettings.widthInches,
        runInches: parseFloat(staircaseRunInchesInput?.value) || staircaseSettings.runInches || DEFAULT_TREAD_DEPTH_INCHES,
        steps: Math.max(3, parseInt(staircaseStepsInput?.value, 10) || staircaseSettings.steps),
        landingType: getSelectedLandingType(),
        ...getLandingDimensionsFromInputs(),
        treadDepthInches: parseFloat(staircaseRunInchesInput?.value) || staircaseSettings.treadDepthInches || DEFAULT_TREAD_DEPTH_INCHES
    };
    updateStaircaseSummary();
    if (staircaseEditTargetIndex !== null) {
        const target = objects[staircaseEditTargetIndex];
        if (target) {
            const center = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
            const size = computeStaircaseSizeFromSettings(staircaseSettings, target.orientation);
            target.width = size.width;
            target.height = size.height;
            target.x = center.x - target.width / 2;
            target.y = center.y - target.height / 2;
            target.staircase = { ...staircaseSettings };
        }
        staircaseEditTargetIndex = null;
        redrawCanvas();
    }
    closeStaircaseModal();
}

function openStaircaseModal() {
    if (!staircaseModal) return;
    staircaseModal.classList.remove('hidden');
    staircaseModal.style.display = 'flex';
    syncStaircaseModeUI(staircaseSettings.mode || 'steps');
    syncLandingTypeUI(staircaseSettings.landingType || 'rectangular');
    syncStaircaseInputsFromSettings();
    updateStaircaseSummary();
}

function closeStaircaseModal() {
    if (!staircaseModal) return;
    staircaseModal.classList.add('hidden');
    staircaseEditTargetIndex = null;
}

function openTextModal({ defaultValue = 'New label', confirmLabel = 'Save', onSubmit } = {}) {
    if (!textModal || !textModalInput || !textModalConfirm) return;
    textModalInput.value = defaultValue;
    textModalConfirm.textContent = confirmLabel;
    textModal.classList.remove('hidden');
    textModalResolver = onSubmit;
    setTimeout(() => textModalInput.focus(), 0);
}

function closeTextModal() {
    if (!textModal) return;
    textModal.classList.add('hidden');
    textModalResolver = null;
    pendingTextPlacement = null;
}

function submitTextModal() {
    if (!textModalResolver || !textModalInput) {
        closeTextModal();
        return;
    }
    const value = textModalInput.value.trim();
    textModalResolver(value);
}

function handleTextPlacement(textValue) {
    const placement = pendingTextPlacement;
    pendingTextPlacement = null;
    if (!placement) {
        closeTextModal();
        return;
    }

    if (!textValue) {
        closeTextModal();
        return;
    }

    pushUndoState();
    const color = textColorInput?.value || '#000000';
    const fontWeight = textIsBold ? 'bold' : 'normal';
    const fontStyle = textIsItalic ? 'italic' : 'normal';
    const { width, height } = measureTextDimensions(textValue, textFontSize, fontWeight, fontStyle);

    const newObj = {
        type: 'text',
        text: textValue,
        x: placement.x,
        y: placement.y,
        width,
        height,
        lineWidth: 0,
        lineColor: color,
        fillColor: 'transparent',
        textColor: color,
        fontSize: textFontSize,
        fontWeight,
        fontStyle,
        rotation: 0,
        flipH: false,
        flipV: false
    };

    objects.push(newObj);
    selectedObjectIndices = new Set([objects.length - 1]);
    selectedWalls.clear();
    selectedFloorIds.clear();
    selectAllMode = false;
    redrawCanvas();
    closeTextModal();
}

function changeTextFontSize(delta) {
    textFontSize = clampValue(textFontSize + delta, 8, 96);
    const applied = applyTextChangesToSelection(obj => {
        obj.fontSize = textFontSize;
    });
    if (!applied) {
        redrawCanvas();
    }
}

function toggleTextBold() {
    textIsBold = !textIsBold;
    const applied = applyTextChangesToSelection(obj => {
        obj.fontWeight = textIsBold ? 'bold' : 'normal';
    });
    if (!applied) {
        redrawCanvas();
    }
    updateTextStyleButtons();
}

function toggleTextItalic() {
    textIsItalic = !textIsItalic;
    const applied = applyTextChangesToSelection(obj => {
        obj.fontStyle = textIsItalic ? 'italic' : 'normal';
    });
    if (!applied) {
        redrawCanvas();
    }
    updateTextStyleButtons();
}

function changeMeasurementFontSize(delta) {
    measurementFontSize = clampValue(measurementFontSize + delta, 8, 48);
    redrawCanvas();
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


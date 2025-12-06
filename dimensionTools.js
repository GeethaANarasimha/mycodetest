// dimensionTools.js
// Single-click wall dimensions with 1px offset and manual dimension mode

// Make these global so they can be called from script.js
window.isDimensionDrawing = false;
window.dimensionStartX = null;
window.dimensionStartY = null;
window.dimensionPreviewX = null;
window.dimensionPreviewY = null;
window.dimensions = [];
window.nextDimensionId = 1;
window.hoveredWall = null;
window.hoveredSpaceSegment = null;
window.dimensionHoverX = null;
window.dimensionHoverY = null;
window.dimensionActiveWall = null;
window.selectedDimensionIndex = null;

// Blue color for dimensions
const DIMENSION_COLOR = '#3498db';
const DIMENSION_TEXT_BG = 'rgba(255, 255, 255, 0.9)';
const WALL_DIMENSION_COLOR = '#2980b9';
const WALL_DIMENSION_OFFSET = 1; // 1px offset from wall

function computeWallAnchorData(wall, startX, startY, endX, endY) {
    if (!wall) return null;

    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    if (!n1 || !n2) return null;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return null;

    const dir = { x: dx / len, y: dy / len };
    const normal = { x: -dir.y, y: dir.x };

    const startVec = { x: startX - n1.x, y: startY - n1.y };
    const endVec = { x: endX - n1.x, y: endY - n1.y };

    const startRatio = (startVec.x * dir.x + startVec.y * dir.y) / len;
    const endRatio = (endVec.x * dir.x + endVec.y * dir.y) / len;

    const startOffset = startVec.x * normal.x + startVec.y * normal.y;
    const endOffset = endVec.x * normal.x + endVec.y * normal.y;
    const offset = (startOffset + endOffset) / 2;

    return { startRatio, endRatio, offset };
}

function updateDimensionsAttachedToWalls() {
    if (!dimensions || dimensions.length === 0) return;

    dimensions.forEach(dim => {
        if (!dim.wallId) return;

        const wall = walls.find(w => w.id === dim.wallId);
        const n1 = wall ? getNodeById(wall.startNodeId) : null;
        const n2 = wall ? getNodeById(wall.endNodeId) : null;
        if (!wall || !n1 || !n2) return;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const len = Math.hypot(dx, dy);
        if (len < 1 || !Number.isFinite(dim.wallStartRatio) || !Number.isFinite(dim.wallEndRatio)) return;

        const dir = { x: dx / len, y: dy / len };
        const normal = { x: -dir.y, y: dir.x };

        const startRatio = clampValue(dim.wallStartRatio, 0, 1);
        const endRatio = clampValue(dim.wallEndRatio, 0, 1);
        const offset = Number.isFinite(dim.wallOffset) ? dim.wallOffset : 0;

        dim.startX = n1.x + dir.x * len * startRatio + normal.x * offset;
        dim.startY = n1.y + dir.y * len * startRatio + normal.y * offset;
        dim.endX = n1.x + dir.x * len * endRatio + normal.x * offset;
        dim.endY = n1.y + dir.y * len * endRatio + normal.y * offset;

        if (typeof window.updateDimensionMeasurement === 'function') {
            window.updateDimensionMeasurement(dim);
        }
    });
}

/**
 * Find the nearest wall to a point with edge detection
 */
window.findNearestWall = function(x, y, maxDistance = 20) {
    let nearestWall = null;
    let minDistance = maxDistance;
    let edgePosition = null;
    
    for (const wall of walls) {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) continue;
        
        const distance = distanceToSegment(x, y, n1.x, n1.y, n2.x, n2.y);
        if (distance < minDistance) {
            minDistance = distance;
            nearestWall = { wall, n1, n2, distance };
            
            // Determine which edge we're closer to
            const wallLength = Math.hypot(n2.x - n1.x, n2.y - n1.y);
            const toStart = Math.hypot(x - n1.x, y - n1.y);
            const toEnd = Math.hypot(x - n2.x, y - n2.y);
            
            if (toStart < 15) edgePosition = 'start';
            else if (toEnd < 15) edgePosition = 'end';
            else edgePosition = 'middle';
        }
    }
    
    if (nearestWall) {
        nearestWall.edgePosition = edgePosition;
    }
    
    return nearestWall;
};

/**
 * Check if wall is horizontal (within tolerance)
 */
window.isWallHorizontal = function(n1, n2, tolerance = 5) {
    return Math.abs(n1.y - n2.y) < tolerance;
};

/**
 * Check if wall is vertical (within tolerance)
 */
window.isWallVertical = function(n1, n2, tolerance = 5) {
    return Math.abs(n1.x - n2.x) < tolerance;
};

/**
 * Get wall orientation
 */
window.getWallOrientation = function(n1, n2) {
    if (isWallHorizontal(n1, n2)) return 'horizontal';
    if (isWallVertical(n1, n2)) return 'vertical';
    return 'diagonal';
};

/**
 * Get wall thickness in pixels
 */
window.getWallThicknessPx = function(wall) {
    return wall.thicknessPx || (0.5 * scale); // Default to 6 inches if not specified
};

/**
 * Handle dimension tool mouse down - SINGLE CLICK for wall dimensions
 */
window.handleDimensionMouseDown = function(e) {
    if (currentTool !== 'dimension') return;

    // Ignore the second click of a double-click so manual mode isn't triggered
    if (e.detail && e.detail > 1) {
        if (typeof window.resetDimensionTool === 'function') {
            window.resetDimensionTool();
        }
        return;
    }

    const { x: rawX, y: rawY } = window.getCanvasCoordsFromEvent(e);
    let x = rawX;
    let y = rawY;
    
    // Manual mode: first click sets the start, second click sets the end
    if (!isDimensionDrawing) {
        startManualDimension(x, y);
    } else {
        endManualDimension(x, y);
    }
};

/**
 * Start manual dimension
 */
function startManualDimension(x, y) {
    ({ x, y } = snapPointToInch(x, y));

    // If the user begins a manual dimension on or near a wall, align the dimension to that wall
    const nearestWall = window.hoveredWall || (typeof window.findNearestWall === 'function' ? window.findNearestWall(x, y, 20) : null);
    if (nearestWall?.n1 && nearestWall?.n2) {
        const projected = projectPointToWallSegment(x, y, nearestWall.n1.x, nearestWall.n1.y, nearestWall.n2.x, nearestWall.n2.y);
        x = projected.x;
        y = projected.y;
        window.dimensionActiveWall = nearestWall;
    } else {
        window.dimensionActiveWall = null;
    }

    dimensionStartX = x;
    dimensionStartY = y;
    isDimensionDrawing = true;
    dimensionPreviewX = x;
    dimensionPreviewY = y;
    
    // Clear other selections
    selectedWall = null;
    selectedNode = null;
    selectedObjectIndices.clear();
    selectAllMode = false;
}

/**
 * End manual dimension
 */
function endManualDimension(x, y) {
    ({ x, y } = snapPointToInch(x, y));

    if (window.dimensionActiveWall?.n1 && window.dimensionActiveWall?.n2) {
        const projected = projectPointToWallSegment(
            x,
            y,
            window.dimensionActiveWall.n1.x,
            window.dimensionActiveWall.n1.y,
            window.dimensionActiveWall.n2.x,
            window.dimensionActiveWall.n2.y
        );
        x = projected.x;
        y = projected.y;
    }

    pushUndoState();
    createManualDimension(dimensionStartX, dimensionStartY, x, y);
    
    // Reset for next dimension
    isDimensionDrawing = false;
    dimensionStartX = null;
    dimensionStartY = null;
    dimensionPreviewX = null;
    dimensionPreviewY = null;
    window.dimensionActiveWall = null;

    redrawCanvas();
}

/**
 * Create wall dimension with 1px offset
 */
window.createWallDimension = function(wallData, options = {}) {
    const { n1, n2 } = wallData;
    const orientation = getWallOrientation(n1, n2);

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;

    const referenceX = options.referenceX ?? null;
    const referenceY = options.referenceY ?? null;
    const offsetSign = referenceX != null && referenceY != null
        ? ((referenceX - midX) * nx + (referenceY - midY) * ny >= 0 ? 1 : -1)
        : 1;

    // Shift from wall edge to centerline so dimensions anchor to the wall center
    const wallThickness = getWallThicknessPx(wallData.wall ?? wallData);
    const centerShift = -offsetSign * (wallThickness / 2);
    const centerN1 = {
        x: n1.x + nx * centerShift,
        y: n1.y + ny * centerShift
    };
    const centerN2 = {
        x: n2.x + nx * centerShift,
        y: n2.y + ny * centerShift
    };

    const length = Math.hypot(centerN2.x - centerN1.x, centerN2.y - centerN1.y);
    const totalInches = Math.round((length / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const text = inches > 0 ? `${feet}'${inches}"` : `${feet}'`;

    let startX, startY, endX, endY;

    if (orientation === 'horizontal') {
        const yPos = centerN1.y + WALL_DIMENSION_OFFSET * offsetSign;
        startX = centerN1.x;
        startY = yPos;
        endX = centerN2.x;
        endY = yPos;
    } else if (orientation === 'vertical') {
        const xPos = centerN1.x + WALL_DIMENSION_OFFSET * offsetSign;
        startX = xPos;
        startY = centerN1.y;
        endX = xPos;
        endY = centerN2.y;
    } else {
        // Diagonal wall - use center with small offset
        const offsetX = (-dy / len) * WALL_DIMENSION_OFFSET * offsetSign;
        const offsetY = (dx / len) * WALL_DIMENSION_OFFSET * offsetSign;

        startX = centerN1.x + offsetX;
        startY = centerN1.y + offsetY;
        endX = centerN2.x + offsetX;
        endY = centerN2.y + offsetY;
    }
    
    const dimension = {
        id: nextDimensionId++,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        text: text,
        lineColor: WALL_DIMENSION_COLOR,
        lineWidth: 2,
        length: length,
        isAuto: true,
        orientation: orientation,
        wallId: wallData.wall.id,
        offsetSign: offsetSign
    };

    const anchorData = computeWallAnchorData(wallData.wall, startX, startY, endX, endY);
    if (anchorData) {
        dimension.wallStartRatio = anchorData.startRatio;
        dimension.wallEndRatio = anchorData.endRatio;
        dimension.wallOffset = anchorData.offset;
    }

    dimensions.push(dimension);
    return dimension;
};

/**
 * Create manual dimension
 */
window.updateDimensionMeasurement = function(dimension) {
    if (!dimension) return;

    const length = Math.hypot(dimension.endX - dimension.startX, dimension.endY - dimension.startY);
    const totalInches = Math.round((length / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    dimension.length = length;
    dimension.text = inches > 0 ? `${feet}'${inches}"` : `${feet}'`;
};

window.createManualDimension = function(startX, startY, endX, endY) {
    const dimension = {
        id: nextDimensionId++,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        lineColor: DIMENSION_COLOR,
        lineWidth: 2,
        isAuto: false
    };

    if (window.dimensionActiveWall?.wall) {
        const anchorData = computeWallAnchorData(window.dimensionActiveWall.wall, startX, startY, endX, endY);
        if (anchorData) {
            dimension.wallId = window.dimensionActiveWall.wall.id;
            dimension.wallStartRatio = anchorData.startRatio;
            dimension.wallEndRatio = anchorData.endRatio;
            dimension.wallOffset = anchorData.offset;
        }
    }

    window.updateDimensionMeasurement(dimension);

    dimensions.push(dimension);
    return dimension;
};

/**
 * Handle dimension tool mouse move
 */
window.handleDimensionMouseMove = function(e) {
    if (currentTool !== 'dimension') return;

    const { x: rawX, y: rawY } = window.getCanvasCoordsFromEvent(e);
    let x = rawX;
    let y = rawY;
    
    // Update hovered wall
    window.hoveredWall = findNearestWall(x, y, 20);
    if (window.hoveredWall) {
        window.hoveredWall.hoverX = x;
        window.hoveredWall.hoverY = y;
    }
    window.dimensionHoverX = x;
    window.dimensionHoverY = y;
    window.hoveredSpaceSegment = hoveredWall ? findAvailableSpacesOnWall(hoveredWall, x, y) : null;
    
    if (!isDimensionDrawing) {
        // Hover mode
        coordinatesDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)} | Click to start measurement`;
    } else {
        // Manual dimension drawing mode
        ({ x, y } = snapPointToInch(x, y));

        if (window.dimensionActiveWall?.n1 && window.dimensionActiveWall?.n2) {
            const projected = projectPointToWallSegment(
                x,
                y,
                window.dimensionActiveWall.n1.x,
                window.dimensionActiveWall.n1.y,
                window.dimensionActiveWall.n2.x,
                window.dimensionActiveWall.n2.y
            );
            x = projected.x;
            y = projected.y;
        }

        dimensionPreviewX = x;
        dimensionPreviewY = y;
        coordinatesDisplay.textContent = `X: ${x.toFixed(1)}, Y: ${y.toFixed(1)} | Click to finish measurement`;
    }
    
    redrawCanvas();
    if (isDimensionDrawing) {
        drawDimensionPreview();
    }
};

/**
 * Draw hover preview for wall dimension
 */
window.drawHoverWallDimension = function(wallData) {
    if (!wallData) return;

    const { n1, n2 } = wallData;
    const orientation = getWallOrientation(n1, n2);
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;
    const len = Math.hypot(dx, dy);
    const nx = len === 0 ? 0 : -dy / len;
    const ny = len === 0 ? 0 : dx / len;

    const referenceX = wallData.hoverX ?? window.dimensionHoverX;
    const referenceY = wallData.hoverY ?? window.dimensionHoverY;
    let offsetSign = 1;

    if (referenceX != null && referenceY != null) {
        const dot = (referenceX - midX) * nx + (referenceY - midY) * ny;
        offsetSign = dot >= 0 ? 1 : -1;
    }

    const wallThickness = getWallThicknessPx(wallData.wall ?? wallData);
    const centerShift = -offsetSign * (wallThickness / 2);
    const centerN1 = {
        x: n1.x + nx * centerShift,
        y: n1.y + ny * centerShift
    };
    const centerN2 = {
        x: n2.x + nx * centerShift,
        y: n2.y + ny * centerShift
    };

    const length = Math.hypot(centerN2.x - centerN1.x, centerN2.y - centerN1.y);
    const totalInches = Math.round((length / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const text = inches > 0 ? `${feet}'${inches}\"` : `${feet}'`;

    ctx.save();
    ctx.strokeStyle = 'rgba(41, 128, 185, 0.7)'; // Semi-transparent blue
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);

    if (orientation === 'horizontal') {
        const yPos = centerN1.y + WALL_DIMENSION_OFFSET * offsetSign;

        ctx.beginPath();
        ctx.moveTo(centerN1.x, yPos);
        ctx.lineTo(centerN2.x, yPos);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN1.x, centerN1.y);
        ctx.lineTo(centerN1.x, yPos);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN2.x, centerN2.y);
        ctx.lineTo(centerN2.x, yPos);
        ctx.stroke();

        const midX = (centerN1.x + centerN2.x) / 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        const fontPx = measurementFontSize || 12;
        ctx.font = `${fontPx}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(midX - textWidth/2 - 2, yPos - 8, textWidth + 4, 16);

        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        ctx.fillText(text, midX, yPos);

    } else if (orientation === 'vertical') {
        const xPos = centerN1.x + WALL_DIMENSION_OFFSET * offsetSign;

        ctx.beginPath();
        ctx.moveTo(xPos, centerN1.y);
        ctx.lineTo(xPos, centerN2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN1.x, centerN1.y);
        ctx.lineTo(xPos, centerN1.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN2.x, centerN2.y);
        ctx.lineTo(xPos, centerN2.y);
        ctx.stroke();

        const midY = (centerN1.y + centerN2.y) / 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        const textHeight = 12 * 1.2;

        ctx.save();
        ctx.translate(xPos, midY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);

        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    } else {
        const offsetX = (-dy / len) * WALL_DIMENSION_OFFSET * offsetSign;
        const offsetY = (dx / len) * WALL_DIMENSION_OFFSET * offsetSign;

        ctx.beginPath();
        ctx.moveTo(centerN1.x + offsetX, centerN1.y + offsetY);
        ctx.lineTo(centerN2.x + offsetX, centerN2.y + offsetY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN1.x, centerN1.y);
        ctx.lineTo(centerN1.x + offsetX, centerN1.y + offsetY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerN2.x, centerN2.y);
        ctx.lineTo(centerN2.x + offsetX, centerN2.y + offsetY);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        const fontPx = measurementFontSize || 12;
        ctx.font = `${fontPx}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textAngle = (() => {
            const angle = Math.atan2(dy, dx);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                return angle + Math.PI;
            }
            return angle;
        })();

        const textWidth = ctx.measureText(text).width;
        const textHeight = fontPx * 1.2;

        ctx.save();
        ctx.translate(midX + offsetX, midY + offsetY);
        ctx.rotate(textAngle);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);

        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    ctx.restore();
};

/**
 * Draw hover preview for a space segment on a wall
 */
window.drawHoverSpaceDimension = function(spaceData) {
    if (!spaceData) return;

    const isHorizontalSpace = spaceData.orientation === 'horizontal';
    const text = spaceData.text;

    ctx.save();
    ctx.strokeStyle = 'rgba(155, 89, 182, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);

    if (isHorizontalSpace) {
        const { leftBoundary, rightBoundary, wallY, hoverY } = spaceData;
        const referenceY = hoverY ?? window.dimensionHoverY;
        const offsetSign = referenceY != null && referenceY < wallY ? -1 : 1;
        const dimensionY = wallY + 35 * offsetSign;

        // Dimension line
        ctx.beginPath();
        ctx.moveTo(leftBoundary, dimensionY);
        ctx.lineTo(rightBoundary, dimensionY);
        ctx.stroke();

        // Extension lines
        ctx.beginPath();
        ctx.moveTo(leftBoundary, wallY);
        ctx.lineTo(leftBoundary, dimensionY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rightBoundary, wallY);
        ctx.lineTo(rightBoundary, dimensionY);
        ctx.stroke();

        // Text
        const midX = (leftBoundary + rightBoundary) / 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(155, 89, 182, 0.9)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(midX - textWidth/2 - 2, dimensionY - 8, textWidth + 4, 16);

        ctx.fillStyle = 'rgba(155, 89, 182, 0.9)';
        ctx.fillText(text, midX, dimensionY);
    } else {
        const { topBoundary, bottomBoundary, wallX, hoverX } = spaceData;
        const referenceX = hoverX ?? window.dimensionHoverX;
        const offsetSign = referenceX != null && referenceX < wallX ? -1 : 1;
        const dimensionX = wallX + 35 * offsetSign;

        // Dimension line
        ctx.beginPath();
        ctx.moveTo(dimensionX, topBoundary);
        ctx.lineTo(dimensionX, bottomBoundary);
        ctx.stroke();

        // Extension lines
        ctx.beginPath();
        ctx.moveTo(wallX, topBoundary);
        ctx.lineTo(dimensionX, topBoundary);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(wallX, bottomBoundary);
        ctx.lineTo(dimensionX, bottomBoundary);
        ctx.stroke();

        // Text
        const midY = (topBoundary + bottomBoundary) / 2;
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(155, 89, 182, 0.9)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const textWidth = ctx.measureText(text).width;
        const textHeight = 12 * 1.2;

        ctx.save();
        ctx.translate(dimensionX, midY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);

        ctx.fillStyle = 'rgba(155, 89, 182, 0.9)';
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }

    ctx.restore();
};

/**
 * Draw manual dimension preview
 */
window.drawDimensionPreview = function() {
    if (!isDimensionDrawing || dimensionPreviewX === null) return;

    withViewTransform(() => {
        ctx.save();
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);

        // Draw dimension line
        ctx.beginPath();
        ctx.moveTo(dimensionStartX, dimensionStartY);
        ctx.lineTo(dimensionPreviewX, dimensionPreviewY);
        ctx.stroke();

        // Draw extension lines
        const dx = dimensionPreviewX - dimensionStartX;
        const dy = dimensionPreviewY - dimensionStartY;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const offset = 10;

            ctx.beginPath();
            ctx.moveTo(dimensionStartX + nx * offset, dimensionStartY + ny * offset);
            ctx.lineTo(dimensionStartX - nx * offset, dimensionStartY - ny * offset);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(dimensionPreviewX + nx * offset, dimensionPreviewY + ny * offset);
            ctx.lineTo(dimensionPreviewX - nx * offset, dimensionPreviewY - ny * offset);
            ctx.stroke();

            // Dimension text
            const totalInches = Math.round((len / scale) * 12);
            const feet = Math.floor(totalInches / 12);
            const inches = totalInches % 12;
            const text = inches > 0 ? `${feet}'${inches}"` : `${feet}'`;

            const midX = (dimensionStartX + dimensionPreviewX) / 2;
            const midY = (dimensionStartY + dimensionPreviewY) / 2;
            const textX = midX + nx * 15;
            const textY = midY + ny * 15;

            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
            const fontPx = measurementFontSize || 12;
            ctx.font = `${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text background
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            const textHeight = fontPx * 1.2;
            const rotateVertical = Math.abs(dy) > Math.abs(dx);

            if (rotateVertical) {
                ctx.save();
                ctx.translate(textX, textY);
                ctx.rotate(-Math.PI / 2);
                ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);
                ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
                ctx.fillText(text, 0, 0);
                ctx.restore();
            } else {
                ctx.fillRect(textX - textWidth/2 - 2, textY - textHeight / 2, textWidth + 4, textHeight);

                // Text
                ctx.fillStyle = 'rgba(52, 152, 219, 0.9)';
                ctx.fillText(text, textX, textY);
            }
        }

        ctx.restore();
    });
};

/**
 * Draw all dimensions
 */
window.drawDimensions = function() {
    updateDimensionsAttachedToWalls();

    // Draw hover preview first
    if (currentTool === 'dimension' && !isDimensionDrawing) {
        if (hoveredSpaceSegment) {
            drawHoverSpaceDimension(hoveredSpaceSegment);
        } else if (hoveredWall) {
            drawHoverWallDimension(hoveredWall);
        }
    }
    
    // Draw permanent dimensions
    if (!dimensions || dimensions.length === 0) return;
    
    dimensions.forEach((dim, index) => {
        ctx.save();

        if (dim.isAuto) {
            ctx.strokeStyle = WALL_DIMENSION_COLOR;
            ctx.setLineDash([4, 2]);
        } else {
            ctx.strokeStyle = DIMENSION_COLOR;
            ctx.setLineDash([4, 2]);
        }
        
        const isSelected = typeof window.selectedDimensionIndex === 'number' && window.selectedDimensionIndex === index;
        ctx.lineWidth = dim.lineWidth + (isSelected ? 1 : 0);
        
        // Main dimension line
        ctx.beginPath();
        ctx.moveTo(dim.startX, dim.startY);
        ctx.lineTo(dim.endX, dim.endY);
        ctx.stroke();
        
        // Extension lines
        const dx = dim.endX - dim.startX;
        const dy = dim.endY - dim.startY;
        const len = Math.hypot(dx, dy);
        
        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const offset = 6;
            const side = dim.offsetSign || 1;
            
            // Extension lines
            ctx.beginPath();
            ctx.moveTo(dim.startX + nx * offset, dim.startY + ny * offset);
            ctx.lineTo(dim.startX - nx * offset, dim.startY - ny * offset);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(dim.endX + nx * offset, dim.endY + ny * offset);
            ctx.lineTo(dim.endX - nx * offset, dim.endY - ny * offset);
            ctx.stroke();
            
            // Dimension text
            ctx.setLineDash([]);
            ctx.fillStyle = dim.isAuto ? WALL_DIMENSION_COLOR : DIMENSION_COLOR;
            const fontPx = measurementFontSize || 12;
            ctx.font = `${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const midX = (dim.startX + dim.endX) / 2;
            const midY = (dim.startY + dim.endY) / 2;
            const textX = midX + nx * 8 * side;
            const textY = midY + ny * 8 * side;

            let textAngle = Math.atan2(dy, dx);
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
                textAngle += Math.PI;
            }

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle);

            // Text background
            const textWidth = ctx.measureText(dim.text).width;
            const textHeight = fontPx * 1.2;
            ctx.fillStyle = DIMENSION_TEXT_BG;
            ctx.fillRect(-textWidth/2 - 2, -textHeight / 2, textWidth + 4, textHeight);

            // Text
            ctx.fillStyle = dim.isAuto ? WALL_DIMENSION_COLOR : DIMENSION_COLOR;
            ctx.fillText(dim.text, 0, 0);
            ctx.restore();
        }

        if (isSelected) {
            ctx.setLineDash([]);
            ctx.fillStyle = dim.isAuto ? WALL_DIMENSION_COLOR : DIMENSION_COLOR;
            ctx.beginPath();
            ctx.arc(dim.startX, dim.startY, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(dim.endX, dim.endY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });
};

/**
 * Get dimension at specific coordinates
 */
window.getDimensionAt = function(x, y) {
    if (!dimensions || dimensions.length === 0) return -1;
    
    for (let i = 0; i < dimensions.length; i++) {
        const dim = dimensions[i];
        const d = distanceToSegment(x, y, dim.startX, dim.startY, dim.endX, dim.endY);
        if (d <= 8) {
            return i;
        }
    }
    return -1;
};

/**
 * Handle dimension selection
 */
window.handleDimensionSelect = function(x, y) {
    const dimIndex = getDimensionAt(x, y);
    if (dimIndex !== -1) {
        return true;
    }
    return false;
};

/**
 * Handle dimension erase
 */
window.handleDimensionErase = function(x, y) {
    const dimIndex = getDimensionAt(x, y);
    if (dimIndex !== -1) {
        pushUndoState();
        dimensions.splice(dimIndex, 1);
        redrawCanvas();
        return true;
    }
    return false;
};

/**
 * Reset dimension tool state
 */
window.resetDimensionTool = function() {
    isDimensionDrawing = false;
    dimensionStartX = null;
    dimensionStartY = null;
    dimensionPreviewX = null;
    dimensionPreviewY = null;
    window.dimensionActiveWall = null;
    hoveredWall = null;
    hoveredSpaceSegment = null;
    dimensionHoverX = null;
    dimensionHoverY = null;
};

/**
 * Clear all dimensions
 */
window.clearAllDimensions = function() {
    if (dimensions && dimensions.length > 0) {
        pushUndoState();
        dimensions = [];
        redrawCanvas();
    }
};

/**
 * Auto-dimension all walls
 */
window.autoDimensionAllWalls = function() {
    if (!walls || walls.length === 0) return;
    
    pushUndoState();
    
    // Clear existing auto dimensions
    dimensions = dimensions.filter(dim => !dim.isAuto);
    
    // Create dimensions for all walls
    walls.forEach(wall => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (n1 && n2) {
            createWallDimension({ wall, n1, n2 });
        }
    });
    
    redrawCanvas();
};

/**
 * Find intersecting walls for a wall
 */
window.findIntersectingWalls = function(targetWall) {
    const intersections = [];
    const targetN1 = getNodeById(targetWall.startNodeId);
    const targetN2 = getNodeById(targetWall.endNodeId);
    
    if (!targetN1 || !targetN2) return intersections;
    
    for (const otherWall of walls) {
        if (otherWall.id === targetWall.id) continue;
        
        const otherN1 = getNodeById(otherWall.startNodeId);
        const otherN2 = getNodeById(otherWall.endNodeId);
        
        if (!otherN1 || !otherN2) continue;
        
        // Check if walls share nodes (intersect)
        if (targetN1.id === otherN1.id || targetN1.id === otherN2.id ||
            targetN2.id === otherN1.id || targetN2.id === otherN2.id) {
            intersections.push(otherWall);
        }
    }
    
    return intersections;
};

/**
 * Find available spaces on a horizontal wall between vertical walls
 */
window.findAvailableSpacesOnWall = function(wallData, hoverX, hoverY) {
    const { wall } = wallData;
    const wallN1 = getNodeById(wall.startNodeId);
    const wallN2 = getNodeById(wall.endNodeId);

    if (!wallN1 || !wallN2) return null;

    const wallThickness = getWallThicknessPx(wall);
    const intersectingWalls = findIntersectingWalls(wall);
    const isHorizontalWall = isWallHorizontal(wallN1, wallN2);

    const perpendicularWalls = intersectingWalls.filter(w => {
        const wn1 = getNodeById(w.startNodeId);
        const wn2 = getNodeById(w.endNodeId);
        if (!wn1 || !wn2) return false;
        return isHorizontalWall ? isWallVertical(wn1, wn2) : isWallHorizontal(wn1, wn2);
    });

    if (perpendicularWalls.length === 0) return null;

    perpendicularWalls.sort((a, b) => {
        const aNode = getNodeById(a.startNodeId);
        const bNode = getNodeById(b.startNodeId);
        return isHorizontalWall ? aNode.x - bNode.x : aNode.y - bNode.y;
    });

    const spaces = [];

    if (isHorizontalWall) {
        const leftNode = wallN1.x <= wallN2.x ? wallN1 : wallN2;
        const rightNode = wallN1.x <= wallN2.x ? wallN2 : wallN1;

        const addSpace = (startX, endX, leftWall, rightWall) => {
            const spaceLength = endX - startX;
            if (spaceLength <= 0) return;
            const totalInches = Math.round((spaceLength / scale) * 12);
            const feet = Math.floor(totalInches / 12);
            const inches = totalInches % 12;
            spaces.push({
                leftWall,
                rightWall,
                leftBoundary: startX,
                rightBoundary: endX,
                spaceLength,
                feet,
                inches,
                text: inches > 0 ? `${feet}'${inches}"` : `${feet}'`,
                wallY: wallN1.y,
                wallThickness,
                hoverX, hoverY,
                orientation: 'horizontal'
            });
        };

        const firstWall = perpendicularWalls[0];
        addSpace(leftNode.x + wallThickness / 2, getNodeById(firstWall.startNodeId).x - wallThickness / 2, null, firstWall);

        for (let i = 0; i < perpendicularWalls.length - 1; i++) {
            const leftWall = perpendicularWalls[i];
            const rightWall = perpendicularWalls[i + 1];
            const leftX = getNodeById(leftWall.startNodeId).x;
            const rightX = getNodeById(rightWall.startNodeId).x;
            addSpace(leftX + wallThickness / 2, rightX - wallThickness / 2, leftWall, rightWall);
        }

        const lastWall = perpendicularWalls[perpendicularWalls.length - 1];
        addSpace(getNodeById(lastWall.startNodeId).x + wallThickness / 2, rightNode.x - wallThickness / 2, lastWall, null);
    } else {
        const topNode = wallN1.y <= wallN2.y ? wallN1 : wallN2;
        const bottomNode = wallN1.y <= wallN2.y ? wallN2 : wallN1;

        const addSpace = (startY, endY, topWall, bottomWall) => {
            const spaceLength = endY - startY;
            if (spaceLength <= 0) return;
            const totalInches = Math.round((spaceLength / scale) * 12);
            const feet = Math.floor(totalInches / 12);
            const inches = totalInches % 12;
            spaces.push({
                topWall,
                bottomWall,
                topBoundary: startY,
                bottomBoundary: endY,
                spaceLength,
                feet,
                inches,
                text: inches > 0 ? `${feet}'${inches}"` : `${feet}'`,
                wallX: wallN1.x,
                wallThickness,
                hoverX, hoverY,
                orientation: 'vertical'
            });
        };

        const firstWall = perpendicularWalls[0];
        addSpace(topNode.y + wallThickness / 2, getNodeById(firstWall.startNodeId).y - wallThickness / 2, null, firstWall);

        for (let i = 0; i < perpendicularWalls.length - 1; i++) {
            const topWall = perpendicularWalls[i];
            const bottomWall = perpendicularWalls[i + 1];
            const topY = getNodeById(topWall.startNodeId).y;
            const bottomY = getNodeById(bottomWall.startNodeId).y;
            addSpace(topY + wallThickness / 2, bottomY - wallThickness / 2, topWall, bottomWall);
        }

        const lastWall = perpendicularWalls[perpendicularWalls.length - 1];
        addSpace(getNodeById(lastWall.startNodeId).y + wallThickness / 2, bottomNode.y - wallThickness / 2, lastWall, null);
    }

    if (spaces.length === 0) return null;

    let bestSpace = null;
    let minDistance = Infinity;

    spaces.forEach(space => {
        const mid = isHorizontalWall
            ? (space.leftBoundary + space.rightBoundary) / 2
            : (space.topBoundary + space.bottomBoundary) / 2;
        const distance = Math.abs((isHorizontalWall ? hoverX : hoverY) - mid);

        if (distance < minDistance) {
            minDistance = distance;
            bestSpace = space;
        }
    });

    return bestSpace;
};

/**
 * Create space dimension
 */
window.createSpaceDimension = function(spaceData) {
    const isHorizontalSpace = spaceData.orientation === 'horizontal';
    const spaceLength = spaceData.spaceLength;

    let startX, startY, endX, endY;

    if (isHorizontalSpace) {
        const { leftBoundary, rightBoundary, wallY, hoverY } = spaceData;
        const referenceY = hoverY ?? window.dimensionHoverY;
        const offsetSign = referenceY != null && referenceY < wallY ? -1 : 1;
        const dimensionY = wallY + 35 * offsetSign;
        startX = leftBoundary;
        startY = dimensionY;
        endX = rightBoundary;
        endY = dimensionY;
    } else {
        const { topBoundary, bottomBoundary, wallX, hoverX } = spaceData;
        const referenceX = hoverX ?? window.dimensionHoverX;
        const offsetSign = referenceX != null && referenceX < wallX ? -1 : 1;
        const dimensionX = wallX + 35 * offsetSign;
        startX = dimensionX;
        startY = topBoundary;
        endX = dimensionX;
        endY = bottomBoundary;
    }

    const dimension = {
        id: nextDimensionId++,
        startX,
        startY,
        endX,
        endY,
        text: spaceData.text,
        lineColor: '#9b59b6', // Purple for space dimensions
        lineWidth: 2,
        length: spaceLength,
        isAuto: true,
        isSpace: true,
        spaceType: spaceData.type
    };

    dimensions.push(dimension);
    return dimension;
};

// Initialize arrays if they don't exist
if (typeof window.dimensions === 'undefined') {
    window.dimensions = [];
}
if (typeof window.nextDimensionId === 'undefined') {
    window.nextDimensionId = 1;
}
if (typeof window.hoveredWall === 'undefined') {
    window.hoveredWall = null;
}

console.log('Dimension Tools loaded - Single-click wall dimensions & manual mode enabled');
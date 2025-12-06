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
window.hoveredCorner = null;
window.dimensionStartAttachment = null;
window.dimensionEndAttachment = null;

// Dimension colors
const DIMENSION_COLOR = '#3498db';
const MANUAL_DIMENSION_COLOR = '#e74c3c';
const MANUAL_DIMENSION_LABEL_COLOR = '#3498db';
const DIMENSION_TEXT_BG = 'rgba(255, 255, 255, 0.9)';
const WALL_DIMENSION_COLOR = '#2980b9';
const WALL_DIMENSION_OFFSET = 1; // extra gap (px) beyond wall thickness for auto dimensions
const WALL_JOIN_COLINEAR_DOT = 0.999; // Treat walls as colinear when their dot product exceeds this threshold
const CORNER_REFERENCE_RADIUS = 12;
const CORNER_MARKER_SIZE = 8;

// Get intersection point of two lines
function getCornerPoint(lineA, lineB) {
    const x1 = lineA.x1, y1 = lineA.y1;
    const x2 = lineA.x2, y2 = lineA.y2;

    const x3 = lineB.x1, y3 = lineB.y1;
    const x4 = lineB.x2, y4 = lineB.y2;

    const denom = (x1 - x2) * (y3 - y4) -
                  (y1 - y2) * (x3 - x4);

    if (denom === 0) return null; // parallel lines

    const px = (
        (x1 * y2 - y1 * x2) * (x3 - x4) -
        (x1 - x2) * (x3 * y4 - y3 * x4)
    ) / denom;

    const py = (
        (x1 * y2 - y1 * x2) * (y3 - y4) -
        (y1 - y2) * (x3 * y4 - y3 * x4)
    ) / denom;

    return { x: px, y: py };
}

function makeMiterCorner(p, wallA, wallB, thickness) {

    // Unit vectors for both walls
    const uxA = (wallA.x2 - wallA.x1);
    const uyA = (wallA.y2 - wallA.y1);
    const lenA = Math.hypot(uxA, uyA);

    const uxB = (wallB.x2 - wallB.x1);
    const uyB = (wallB.y2 - wallB.y1);
    const lenB = Math.hypot(uxB, uyB);

    // Normalized
    const ax = uxA / lenA, ay = uyA / lenA;
    const bx = uxB / lenB, by = uyB / lenB;

    // Offset direction = wall normal
    const nxA = -ay, nyA = ax;
    const nxB = -by, nyB = bx;

    // Offset points (for wall thickness)
    const pA = {
        x: p.x + nxA * thickness,
        y: p.y + nyA * thickness
    };

    const pB = {
        x: p.x + nxB * thickness,
        y: p.y + nyB * thickness
    };

    return { inner: pA, outer: pB };
}

/**
 * Determine whether a node is connected to any wall that is not colinear with the given wall
 */
function hasAngledConnection(nodeId, wall) {
    return walls.some(candidate => {
        if (candidate.id === wall.id) return false;
        if (candidate.startNodeId !== nodeId && candidate.endNodeId !== nodeId) return false;
        return !areWallsColinearAtNode(wall, candidate, nodeId);
    });
}

/**
 * Check if two walls are effectively colinear at a shared node
 */
function areWallsColinearAtNode(wallA, wallB, nodeId) {
    const dirA = getWallDirectionFromNode(wallA, nodeId);
    const dirB = getWallDirectionFromNode(wallB, nodeId);
    if (!dirA || !dirB) return true;
    const dot = dirA.x * dirB.x + dirA.y * dirB.y;
    return Math.abs(dot) > WALL_JOIN_COLINEAR_DOT;
}

/**
 * Calculate the offset position of a dimension endpoint when the wall meets another at an angle.
 * This uses the angle bisector of the current wall direction (pointing outward from the node)
 * and the connected wall direction to produce the expected 45° chamfer at joints.
 */
function getDimensionEndpointWithJoint(node, wall, isStart, offsetSign = 1) {
    const startNode = getNodeById(wall.startNodeId);
    const endNode = getNodeById(wall.endNodeId);

    if (!startNode || !endNode || !node) {
        return node || { x: 0, y: 0 };
    }

    const baseDx = endNode.x - startNode.x;
    const baseDy = endNode.y - startNode.y;
    const baseLen = Math.hypot(baseDx, baseDy) || 1;
    const baseDir = { x: baseDx / baseLen, y: baseDy / baseLen };
    const dirSign = isStart ? -1 : 1;

    // Measurements should originate from the corner of the wall, not the
    // centerline. Offset outward using the wall's normal so the extension
    // lines align with the wall face at the node.
    const wallThickness = getWallThicknessPx(wall);
    const offsetMagnitude = wallThickness / 2;

    // Default direction is the outward normal on the requested side
    const baseNormal = { x: -baseDir.y * offsetSign, y: baseDir.x * offsetSign };
    let offsetDir = { ...baseNormal };

    if (typeof getWallsConnectedToNode === 'function') {
        const connected = getWallsConnectedToNode(node.id).filter(w => w.id !== wall.id);

        for (const candidate of connected) {
            if (areWallsColinearAtNode(wall, candidate, node.id)) continue;
            const candidateDir = getWallDirectionFromNode(candidate, node.id);
            if (!candidateDir) continue;

            const candidateNormal = { x: -candidateDir.y * offsetSign, y: candidateDir.x * offsetSign };
            const combinedX = offsetDir.x + candidateNormal.x;
            const combinedY = offsetDir.y + candidateNormal.y;
            const combinedLen = Math.hypot(combinedX, combinedY);

            if (combinedLen > 0.0001) {
                offsetDir = { x: combinedX / combinedLen, y: combinedY / combinedLen };
            }
        }
    }

    return {
        x: node.x + offsetDir.x * offsetMagnitude,
        y: node.y + offsetDir.y * offsetMagnitude
    };
}

/**
 * Get normalized direction vector for a wall originating from a specific node
 */
function getWallDirectionFromNode(wall, nodeId) {
    const startNode = getNodeById(wall.startNodeId);
    const endNode = getNodeById(wall.endNodeId);
    if (!startNode || !endNode) return null;

    const fromNode = wall.startNodeId === nodeId ? startNode : endNode;
    const toNode = wall.startNodeId === nodeId ? endNode : startNode;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const len = Math.hypot(dx, dy) || 1;
    if (!len) return null;

    return { x: dx / len, y: dy / len };
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

function getHalfConnectedWallThickness(nodeId, currentWall) {
    if (!nodeId || typeof getWallsConnectedToNode !== 'function') return 0;

    const connectedWalls = getWallsConnectedToNode(nodeId).filter(w => w.id !== currentWall?.id);
    if (connectedWalls.length === 0) return 0;

    const maxThickness = connectedWalls.reduce((max, wall) => {
        const thickness = getWallThicknessPx(wall);
        return thickness > max ? thickness : max;
    }, 0);

    return maxThickness / 2;
}

function getMeasuredWallLength(n1, n2, wall) {
    const baseLength = Math.hypot(n2.x - n1.x, n2.y - n1.y);
    return baseLength
        + getHalfConnectedWallThickness(n1?.id, wall)
        + getHalfConnectedWallThickness(n2?.id, wall);
}

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
 * Find the closest wall corner (node) to a point
 */
window.findNearestWallCorner = function(x, y, maxDistance = CORNER_REFERENCE_RADIUS, preferredWall = null) {
    let bestCorner = null;
    let bestDistance = maxDistance;
    const preferredWallId = preferredWall?.id ?? preferredWall?.wall?.id ?? null;

    const checkWallCorner = (wall) => {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) return;

        [
            { node: n1, corner: 'start' },
            { node: n2, corner: 'end' }
        ].forEach(({ node, corner }) => {
            const dist = Math.hypot(x - node.x, y - node.y);
            if (dist < bestDistance) {
                bestDistance = dist;
                bestCorner = { node, wall, corner };
            }
        });
    };

    if (preferredWallId) {
        const wall = walls.find(w => w.id === preferredWallId);
        if (wall) {
            checkWallCorner(wall);
        }
    }

    walls.forEach(wall => {
        if (wall.id === preferredWallId) return;
        checkWallCorner(wall);
    });

    return bestCorner;
};

function normalizeDirection(dir) {
    const len = Math.hypot(dir.x, dir.y) || 1;
    return { x: dir.x / len, y: dir.y / len };
}

function getCornerReferencePosition(corner, directionOverride = null) {
    if (!corner?.node) return null;

    if (!directionOverride) {
        return { x: corner.node.x, y: corner.node.y };
    }

    const direction = directionOverride || getCornerReferenceDirection(corner);
    const dir = normalizeDirection(direction);

    // Reference points should align to the wall center rather than its border
    // so manual measurements use the middle of the wall.
    const offset = 0;

    return {
        x: corner.node.x + dir.x * offset,
        y: corner.node.y + dir.y * offset
    };
}

/**
 * Start manual dimension
 */
function startManualDimension(x, y) {
    ({ x, y } = snapPointToInch(x, y));

    const cornerCandidate = window.hoveredCorner || (typeof window.findNearestWallCorner === 'function'
        ? window.findNearestWallCorner(x, y, CORNER_REFERENCE_RADIUS, hoveredWall?.wall || window.dimensionActiveWall?.wall)
        : null);
    const wallFromCorner = cornerCandidate?.wall || hoveredWall?.wall || window.dimensionActiveWall?.wall;

    if (cornerCandidate?.node) {
        const offsetDir = getCornerReferenceDirection(cornerCandidate);
        const anchor = getCornerReferencePosition(cornerCandidate, offsetDir) || cornerCandidate.node;
        x = anchor.x;
        y = anchor.y;
        window.dimensionStartAttachment = {
            type: 'corner',
            nodeId: cornerCandidate.node.id,
            wallId: wallFromCorner?.id || null,
            offsetDir
        };

        if (wallFromCorner) {
            const n1 = getNodeById(wallFromCorner.startNodeId);
            const n2 = getNodeById(wallFromCorner.endNodeId);
            window.dimensionActiveWall = { wall: wallFromCorner, n1, n2 };
        }
    } else {
        window.dimensionStartAttachment = null;

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

    const cornerCandidate = window.hoveredCorner || (typeof window.findNearestWallCorner === 'function'
        ? window.findNearestWallCorner(x, y, CORNER_REFERENCE_RADIUS, window.dimensionActiveWall?.wall || hoveredWall?.wall)
        : null);
    let endAttachment = null;

    if (cornerCandidate?.node) {
        const offsetDir = getCornerReferenceDirection(cornerCandidate);
        const anchor = getCornerReferencePosition(cornerCandidate, offsetDir) || cornerCandidate.node;
        x = anchor.x;
        y = anchor.y;
        endAttachment = {
            type: 'corner',
            nodeId: cornerCandidate.node.id,
            wallId: (cornerCandidate.wall || window.dimensionActiveWall?.wall)?.id || null,
            offsetDir
        };

        if (cornerCandidate.wall && !window.dimensionActiveWall) {
            const n1 = getNodeById(cornerCandidate.wall.startNodeId);
            const n2 = getNodeById(cornerCandidate.wall.endNodeId);
            window.dimensionActiveWall = { wall: cornerCandidate.wall, n1, n2 };
        }
    }

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

    window.dimensionEndAttachment = endAttachment;

    pushUndoState();
    createManualDimension(dimensionStartX, dimensionStartY, x, y, {
        startAttachment: window.dimensionStartAttachment,
        endAttachment
    });

    // Reset for next dimension
    isDimensionDrawing = false;
    dimensionStartX = null;
    dimensionStartY = null;
    dimensionPreviewX = null;
    dimensionPreviewY = null;
    window.dimensionStartAttachment = null;
    window.dimensionEndAttachment = null;
    window.dimensionActiveWall = null;

    redrawCanvas();
}

/**
 * Create wall dimension with 1px offset
 */
window.createWallDimension = function(wallData, options = {}) {
    const wall = wallData.wall || wallData;
    const start = getNodeById(wall.startNodeId);
    const end = getNodeById(wall.endNodeId);

    if (!start || !end) return null;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    const referenceX = options.referenceX ?? null;
    const referenceY = options.referenceY ?? null;
    const offsetSign = referenceX != null && referenceY != null
        ? ((referenceX - midX) * nx + (referenceY - midY) * ny >= 0 ? 1 : -1)
        : 1;

    const dimension = {
        id: nextDimensionId++,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        text: '',
        lineColor: WALL_DIMENSION_COLOR,
        lineWidth: 2,
        length: 0,
        isAuto: true,
        orientation: getWallOrientation(start, end),
        wallId: wall.id,
        offsetSign: offsetSign,
        p1: { x: start.x, y: start.y },
        p2: { x: end.x, y: end.y },
        offset: 18,
        type: "wall-dimension"
    };

    window.updateDimensionMeasurement(dimension);

    dimensions.push(dimension);
    return dimension;
};

/**
 * Create manual dimension
 */
window.updateDimensionMeasurement = function(dimension) {
    if (!dimension) return;

    const p1 = dimension.p1 || { x: dimension.startX, y: dimension.startY };
    const p2 = dimension.p2 || { x: dimension.endX, y: dimension.endY };

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const pixelDist = Math.hypot(dx, dy);
    const totalInches = Math.round((pixelDist / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    dimension.length = pixelDist;
    dimension.text = inches > 0 ? `${feet}'${inches}"` : `${feet}'`;
};

function resolveAttachmentPosition(attachment) {
    if (!attachment) return null;

    if (attachment.type === 'corner') {
        const node = getNodeById(attachment.nodeId);
        if (node) {
            const wall = attachment.wallId ? walls.find(w => w.id === attachment.wallId) : null;
            const anchor = getCornerReferencePosition({ node, wall, wallId: attachment.wallId }, attachment.offsetDir);
            return anchor || { x: node.x, y: node.y };
        }
    }

    return null;
}

window.refreshDimensionAttachments = function() {
    let anyUpdated = false;

    (window.dimensions || []).forEach(dim => {
        let changed = false;

        const startPos = resolveAttachmentPosition(dim.startAttachment);
        if (startPos) {
            dim.startX = startPos.x;
            dim.startY = startPos.y;
            dim.p1 = { x: startPos.x, y: startPos.y };
            changed = true;
        } else if (dim.startAttachment) {
            dim.startAttachment = null;
        }

        const endPos = resolveAttachmentPosition(dim.endAttachment);
        if (endPos) {
            dim.endX = endPos.x;
            dim.endY = endPos.y;
            dim.p2 = { x: endPos.x, y: endPos.y };
            changed = true;
        } else if (dim.endAttachment) {
            dim.endAttachment = null;
        }

        if (changed && typeof window.updateDimensionMeasurement === 'function') {
            window.updateDimensionMeasurement(dim);
            anyUpdated = true;
        }
    });

    return anyUpdated;
};

window.createManualDimension = function(startX, startY, endX, endY, options = {}) {
    const { startAttachment = null, endAttachment = null } = options;

    const dimension = {
        id: nextDimensionId++,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        lineColor: MANUAL_DIMENSION_COLOR,
        lineWidth: 2,
        isAuto: false,
        startAttachment,
        endAttachment,
        p1: { x: startX, y: startY },
        p2: { x: endX, y: endY }
    };

    window.updateDimensionMeasurement(dimension);

    dimensions.push(dimension);
    return dimension;
};

function getCornerReferenceDirection(corner) {
    if (!corner?.node) return { x: 0, y: -1 };

    if (window.dimensionHoverX != null && window.dimensionHoverY != null) {
        const toHover = { x: window.dimensionHoverX - corner.node.x, y: window.dimensionHoverY - corner.node.y };
        const len = Math.hypot(toHover.x, toHover.y);
        if (len > 0.0001) {
            return { x: toHover.x / len, y: toHover.y / len };
        }
    }

    if (corner.wall) {
        const otherNodeId = corner.corner === 'start' ? corner.wall.endNodeId : corner.wall.startNodeId;
        const otherNode = getNodeById(otherNodeId);
        if (otherNode) {
            const dx = otherNode.x - corner.node.x;
            const dy = otherNode.y - corner.node.y;
            const len = Math.hypot(dx, dy);
            if (len > 0.0001) {
                return { x: dx / len, y: dy / len };
            }
        }
    }

    return { x: 0, y: -1 };
}

window.drawCornerReference = function(corner) {
    if (!corner?.node) return;

    const direction = getCornerReferenceDirection(corner);
    const dir = normalizeDirection(direction);
    const normal = { x: -dir.y, y: dir.x };

    const tip = getCornerReferencePosition(corner, direction) || corner.node;
    const baseCenter = { x: tip.x - dir.x * CORNER_MARKER_SIZE, y: tip.y - dir.y * CORNER_MARKER_SIZE };
    const spread = CORNER_MARKER_SIZE * 0.8;
    const p1 = { x: baseCenter.x + normal.x * spread, y: baseCenter.y + normal.y * spread };
    const p2 = { x: baseCenter.x - normal.x * spread, y: baseCenter.y - normal.y * spread };

    ctx.save();
    ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
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
    const preferredWall = window.dimensionActiveWall?.wall || window.hoveredWall?.wall || null;
    window.hoveredCorner = typeof window.findNearestWallCorner === 'function'
        ? window.findNearestWallCorner(x, y, CORNER_REFERENCE_RADIUS, preferredWall)
        : null;
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
    const length = getMeasuredWallLength(n1, n2, wallData.wall);
    const totalInches = Math.round((length / scale) * 12);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    const text = inches > 0 ? `${feet}'${inches}\"` : `${feet}'`;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;
    const len = Math.hypot(dx, dy) || 1;
    const nx = len === 0 ? 0 : -dy / len;
    const ny = len === 0 ? 0 : dx / len;

    const dimensionOffset = WALL_DIMENSION_OFFSET;

    const referenceX = wallData.hoverX ?? window.dimensionHoverX;
    const referenceY = wallData.hoverY ?? window.dimensionHoverY;
    let offsetSign = 1;

    if (referenceX != null && referenceY != null) {
        const dot = (referenceX - midX) * nx + (referenceY - midY) * ny;
        offsetSign = dot >= 0 ? 1 : -1;
    }

    const startBase = getDimensionEndpointWithJoint(n1, wallData.wall, true, offsetSign);
    const endBase = getDimensionEndpointWithJoint(n2, wallData.wall, false, offsetSign);

    const offsetX = (-dy / len) * dimensionOffset * offsetSign;
    const offsetY = (dx / len) * dimensionOffset * offsetSign;

    const startX = startBase.x + offsetX;
    const startY = startBase.y + offsetY;
    const endX = endBase.x + offsetX;
    const endY = endBase.y + offsetY;

    const wallEdgeStartX = startBase.x;
    const wallEdgeStartY = startBase.y;
    const wallEdgeEndX = endBase.x;
    const wallEdgeEndY = endBase.y;

    ctx.save();
    ctx.strokeStyle = 'rgba(41, 128, 185, 0.7)'; // Semi-transparent blue
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wallEdgeStartX, wallEdgeStartY);
    ctx.lineTo(startX, startY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wallEdgeEndX, wallEdgeEndY);
    ctx.lineTo(endX, endY);
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
    const normalOffset = 8;

    const drawPreviewLabel = (sideMultiplier) => {
        const labelX = (startX + endX) / 2 + nx * normalOffset * sideMultiplier;
        const labelY = (startY + endY) / 2 + ny * normalOffset * sideMultiplier;

        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(textAngle);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(-textWidth / 2 - 2, -textHeight / 2, textWidth + 4, textHeight);

        ctx.fillStyle = 'rgba(41, 128, 185, 0.9)';
        ctx.fillText(text, 0, 0);

        ctx.restore();
    };

    // Show preview text on the same side as the offset, avoiding duplicate labels
    drawPreviewLabel(offsetSign);

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
        ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
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
            ctx.fillStyle = MANUAL_DIMENSION_LABEL_COLOR;
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
                ctx.fillStyle = MANUAL_DIMENSION_LABEL_COLOR;
                ctx.fillText(text, 0, 0);
                ctx.restore();
            } else {
                ctx.fillRect(textX - textWidth/2 - 2, textY - textHeight / 2, textWidth + 4, textHeight);

                // Text
                ctx.fillStyle = MANUAL_DIMENSION_LABEL_COLOR;
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
    if (typeof window.refreshDimensionAttachments === 'function') {
        window.refreshDimensionAttachments();
    }

    // Draw hover preview first
    if (currentTool === 'dimension' && !isDimensionDrawing) {
        if (hoveredSpaceSegment) {
            drawHoverSpaceDimension(hoveredSpaceSegment);
        } else if (hoveredWall) {
            drawHoverWallDimension(hoveredWall);
        }
    }

    if (currentTool === 'dimension' && window.hoveredCorner) {
        drawCornerReference(window.hoveredCorner);
    }

    // Draw permanent dimensions
    if (!dimensions || dimensions.length === 0) return;
    
    dimensions.forEach((dim, index) => {
        ctx.save();

        if (dim.isAuto) {
            ctx.strokeStyle = WALL_DIMENSION_COLOR;
            ctx.setLineDash([4, 2]);
        } else {
            ctx.strokeStyle = MANUAL_DIMENSION_COLOR;
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
            const side = dim.isAuto ? (dim.offsetSign || 1) : 0;
            
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
            const labelColor = dim.isAuto ? WALL_DIMENSION_COLOR : MANUAL_DIMENSION_LABEL_COLOR;
            ctx.fillStyle = labelColor;
            const fontPx = measurementFontSize || 12;
            ctx.font = `${fontPx}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const midX = (dim.startX + dim.endX) / 2;
            const midY = (dim.startY + dim.endY) / 2;

            let textAngle = Math.atan2(dy, dx);
            if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
                textAngle += Math.PI;
            }

            const drawDimensionLabel = (sideMultiplier) => {
                const textX = midX + nx * 8 * sideMultiplier;
                const textY = midY + ny * 8 * sideMultiplier;

                ctx.save();
                ctx.translate(textX, textY);
                ctx.rotate(textAngle);

                // Text background
                const textWidth = ctx.measureText(dim.text).width;
                const textHeight = fontPx * 1.2;
                ctx.fillStyle = DIMENSION_TEXT_BG;
                ctx.fillRect(-textWidth/2 - 2, -textHeight / 2, textWidth + 4, textHeight);

                // Text
                ctx.fillStyle = labelColor;
                ctx.fillText(dim.text, 0, 0);
                ctx.restore();
            };

            // Always draw the primary label. Manual dimensions keep the label centered on the
            // dimension line while wall dimensions offset to a single side.
            drawDimensionLabel(side);
        }

        if (isSelected) {
            ctx.setLineDash([]);
            ctx.fillStyle = dim.isAuto ? WALL_DIMENSION_COLOR : MANUAL_DIMENSION_COLOR;
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
    window.hoveredCorner = null;
    window.dimensionStartAttachment = null;
    window.dimensionEndAttachment = null;
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
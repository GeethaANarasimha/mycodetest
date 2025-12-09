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
window.dimensionActiveOffsetSign = 1;
window.dimensionActiveCornerOffset = null;
window.dimensionEndpointHover = null;
window.selectedDimensionIndex = null;
window.dimensionAnchorStart = null;
window.dimensionAnchorEnd = null;

// Blue color for dimensions
const DIMENSION_COLOR = '#3498db';
const DIMENSION_TEXT_BG = 'rgba(255, 255, 255, 0.9)';
const WALL_DIMENSION_COLOR = '#2980b9';
const WALL_DIMENSION_OFFSET = 1; // 1px offset from wall
const WALL_HOVER_CONTACT_DISTANCE = 7; // allow hover within 2px of the wall face
const WALL_ENDPOINT_SNAP_DISTANCE = 8; // distance threshold to magnet to wall endpoints
const WALL_ENDPOINT_STICKY_MULTIPLIER = 1.5; // allow a little more reach once we're already snapped
const DEFAULT_WALL_FACE_OFFSET = 6; // distance from wall face for manual dimensions
const MANUAL_DIMENSION_EXTENSION = 12; // half-length of the end caps on manual dimensions
const MANUAL_DIMENSION_PREVIEW_EXTENSION = 14; // preview end-cap half-length for better visibility
const ENDPOINT_HIGHLIGHT_RADIUS = 7;
const ENDPOINT_HIGHLIGHT_COLOR = '#e74c3c';

function getWallNormal(wallData) {
    const { n1, n2 } = wallData || {};
    if (!n1 || !n2) return null;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const len = Math.hypot(dx, dy);
    if (!len) return null;

    return { x: -dy / len, y: dx / len };
}

function getEndpointCornerPosition(wallData, node, referenceX, referenceY) {
    const normal = getWallNormal(wallData);
    if (!normal) return { x: node.x, y: node.y, offset: { x: 0, y: 0 } };

    const halfThickness = getWallThicknessPx(wallData.wall) / 2;
    const toReference = { x: referenceX - node.x, y: referenceY - node.y };
    const sign = (toReference.x * normal.x + toReference.y * normal.y) >= 0 ? 1 : -1;

    const offset = { x: normal.x * halfThickness * sign, y: normal.y * halfThickness * sign };
    return { x: node.x + offset.x, y: node.y + offset.y, offset };
}

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

    return {
        startRatio,
        endRatio,
        offset,
        startOffset,
        endOffset
    };
}

function getWallNormalAndSign(wallData, referenceX, referenceY) {
    const { n1, n2 } = wallData || {};
    if (!n1 || !n2) return null;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const len = Math.hypot(dx, dy);
    if (!len) return null;

    const normal = { x: -dy / len, y: dx / len };
    const midX = (n1.x + n2.x) / 2;
    const midY = (n1.y + n2.y) / 2;
    const offsetSign = ((referenceX - midX) * normal.x + (referenceY - midY) * normal.y) >= 0 ? 1 : -1;

    return { normal, offsetSign };
}

function computeWallOffset(dim, wall) {
    if (!wall) return Number.isFinite(dim?.wallOffset) ? dim.wallOffset : 0;

    if (Number.isFinite(dim?.wallFaceOffset)) {
        const thickness = getWallThicknessPx(wall);
        return (thickness / 2 + dim.wallFaceOffset) * (dim.offsetSign || 1);
    }

    return Number.isFinite(dim?.wallOffset) ? dim.wallOffset : 0;
}

function attachDimensionToWall(dimension, startX, startY, endX, endY, explicitWallData = null, anchorPositions = null) {
    let wallData = explicitWallData;

    // If no wall provided, try to find a common wall near both points
    if (!wallData?.wall && typeof window.findNearestWall === 'function') {
        const startWall = window.findNearestWall(startX, startY, 12);
        const endWall = window.findNearestWall(endX, endY, 12);

        if (startWall?.wall && endWall?.wall && startWall.wall.id === endWall.wall.id) {
            wallData = startWall;
        }
    }

    if (!wallData?.wall) return false;

    const anchorData = computeWallAnchorData(
        wallData.wall,
        anchorPositions?.startX ?? startX,
        anchorPositions?.startY ?? startY,
        anchorPositions?.endX ?? endX,
        anchorPositions?.endY ?? endY
    );
    if (!anchorData) return false;

    const n1 = wallData.n1 || getNodeById(wallData.wall.startNodeId);
    const n2 = wallData.n2 || getNodeById(wallData.wall.endNodeId);

    let startRatio = anchorData.startRatio;
    let endRatio = anchorData.endRatio;

    if (n1 && n2 && anchorPositions) {
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
            const dir = { x: dx / len, y: dy / len };
            const endpointTolerance = Math.max(2, scale / 6); // ~2 inches at default scale

            const startProjection =
                (anchorPositions.startX - n1.x) * dir.x +
                (anchorPositions.startY - n1.y) * dir.y;
            const endProjection =
                (anchorPositions.endX - n1.x) * dir.x +
                (anchorPositions.endY - n1.y) * dir.y;

            if (Math.abs(startProjection) <= endpointTolerance) {
                startRatio = 0;
            } else if (Math.abs(startProjection - len) <= endpointTolerance) {
                startRatio = 1;
            }

            if (Math.abs(endProjection - len) <= endpointTolerance) {
                endRatio = 1;
            } else if (Math.abs(endProjection) <= endpointTolerance) {
                endRatio = 0;
            }
        }
    }

    const lineData = anchorPositions
        ? computeWallAnchorData(wallData.wall, startX, startY, endX, endY) || anchorData
        : anchorData;

    dimension.wallId = wallData.wall.id;
    dimension.wallStartRatio = startRatio;
    dimension.wallEndRatio = endRatio;
    dimension.wallOffset = lineData.offset;
    dimension.wallStartOffset = anchorData.startOffset;
    dimension.wallEndOffset = anchorData.endOffset;

    return true;
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

        const startRatio = Number.isFinite(dim.wallStartRatio) ? dim.wallStartRatio : 0;
        const endRatio = Number.isFinite(dim.wallEndRatio) ? dim.wallEndRatio : 0;
        const offset = computeWallOffset(dim, wall);
        const startOffset = Number.isFinite(dim.wallStartOffset) ? dim.wallStartOffset : offset;
        const endOffset = Number.isFinite(dim.wallEndOffset) ? dim.wallEndOffset : offset;

        dim.startX = n1.x + dir.x * len * startRatio + normal.x * offset;
        dim.startY = n1.y + dir.y * len * startRatio + normal.y * offset;
        dim.endX = n1.x + dir.x * len * endRatio + normal.x * offset;
        dim.endY = n1.y + dir.y * len * endRatio + normal.y * offset;

        dim.anchorStartX = n1.x + dir.x * len * startRatio + normal.x * startOffset;
        dim.anchorStartY = n1.y + dir.y * len * startRatio + normal.y * startOffset;
        dim.anchorEndX = n1.x + dir.x * len * endRatio + normal.x * endOffset;
        dim.anchorEndY = n1.y + dir.y * len * endRatio + normal.y * endOffset;

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

function findPerpendicularCornerCandidates(wall) {
    const candidates = [];

    const nodesToCheck = [
        { nodeId: wall.startNodeId },
        { nodeId: wall.endNodeId }
    ];

    nodesToCheck.forEach(({ nodeId }) => {
        const node = getNodeById(nodeId);
        if (!node) return;

        const connectedWalls = walls.filter(w => w !== wall && (w.startNodeId === nodeId || w.endNodeId === nodeId));

        connectedWalls.forEach(connected => {
            if (typeof areWallsPerpendicularAtNode === 'function' && !areWallsPerpendicularAtNode(wall, connected, nodeId)) return;

            const cornerSet = [];
            const addCorner = (x, y) => {
                const key = `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
                if (!cornerSet.some(c => c.key === key)) {
                    cornerSet.push({ key, point: { x, y } });
                }
            };

            const pushWallCornersAtNode = (targetWall) => {
                const geometry = getWallCornerGeometry(targetWall);
                if (!geometry) return null;

                const isStart = targetWall.startNodeId === nodeId;
                const nodeCorners = isStart ? geometry.startCorners : geometry.endCorners;
                nodeCorners.forEach(corner => addCorner(corner.x, corner.y));
                return geometry.halfOffset;
            };

            const wallNormal = pushWallCornersAtNode(wall);
            const connectedNormal = pushWallCornersAtNode(connected);

            if (wallNormal && connectedNormal) {
                const signs = [1, -1];
                signs.forEach(sa => {
                    signs.forEach(sb => {
                        addCorner(
                            node.x + wallNormal.x * sa + connectedNormal.x * sb,
                            node.y + wallNormal.y * sa + connectedNormal.y * sb
                        );
                    });
                });
            }

            cornerSet.forEach(({ point }) => candidates.push({ point, node }));
        });
    });

    return candidates;
}

function isSameEndpointCandidate(candidateWall, candidateNode, lastSnap) {
    if (!candidateWall || !candidateNode || !lastSnap) return false;

    const lastWallId = lastSnap.wallData?.wall?.id ?? lastSnap.wallData?.id;
    const lastNodeId = lastSnap.node?.id;

    return lastWallId === candidateWall.id && lastNodeId === candidateNode.id;
}

function findNearestWallEndpoint(x, y, maxDistance = WALL_ENDPOINT_SNAP_DISTANCE, preferredWallData = null, lastSnap = null) {
    const wallsToCheck = preferredWallData?.wall ? [preferredWallData.wall] : walls;
    let bestMatch = null;

    for (const wall of wallsToCheck) {
        const wallData = buildWallDataFromWall(wall);
        if (!wallData) continue;

        const geometry = getWallCornerGeometry(wall);
        const candidates = [];

        // Node centers
        candidates.push({ point: wallData.n1, node: wallData.n1 });
        candidates.push({ point: wallData.n2, node: wallData.n2 });

        // Wall rectangle corners
        if (geometry) {
            geometry.startCorners.forEach(corner => candidates.push({ point: corner, node: wallData.n1 }));
            geometry.endCorners.forEach(corner => candidates.push({ point: corner, node: wallData.n2 }));
        }

        // Perpendicular connection corners shared with this wall
        findPerpendicularCornerCandidates(wall).forEach(corner => candidates.push({ ...corner, node: corner.node || wallData.n1 }));

        candidates.forEach(candidate => {
            const dx = x - candidate.point.x;
            const dy = y - candidate.point.y;
            const distance = Math.hypot(dx, dy);
            const stickyDistance = isSameEndpointCandidate(wall, candidate.node, lastSnap)
                ? maxDistance * WALL_ENDPOINT_STICKY_MULTIPLIER
                : maxDistance;

            if (distance <= stickyDistance && (!bestMatch || distance < bestMatch.distance)) {
                bestMatch = {
                    wall,
                    node: candidate.node,
                    distance,
                    cornerPosition: candidate.point,
                    cornerOffset: {
                        x: candidate.point.x - candidate.node.x,
                        y: candidate.point.y - candidate.node.y
                    }
                };
            }
        });
    }

    return bestMatch;
}

function buildWallDataFromWall(wall) {
    const n1 = getNodeById(wall.startNodeId);
    const n2 = getNodeById(wall.endNodeId);
    if (!n1 || !n2) return null;
    return { wall, n1, n2 };
}

function findEndpointSnapTarget(x, y, preferredWallData = null, lastSnap = null) {
    const preferredSnap = findNearestWallEndpoint(x, y, WALL_ENDPOINT_SNAP_DISTANCE, preferredWallData, lastSnap);
    const fallbackSnap = preferredSnap || findNearestWallEndpoint(x, y, WALL_ENDPOINT_SNAP_DISTANCE, null, lastSnap);
    const snapTarget = fallbackSnap;

    if (!snapTarget) return null;

    const wallData = buildWallDataFromWall(snapTarget.wall);
    if (!wallData) return null;

    return {
        x: snapTarget.cornerPosition?.x ?? snapTarget.node.x,
        y: snapTarget.cornerPosition?.y ?? snapTarget.node.y,
        node: snapTarget.node,
        cornerOffset: snapTarget.cornerOffset,
        wallData: { ...wallData, hoverX: x, hoverY: y }
    };
}

function drawWallEndpointTargets(wallData, activeEndpoint = null) {
    if (!wallData?.n1 || !wallData?.n2) return;

    withViewTransform(() => {
        ctx.save();
        const endpoints = [
            { node: wallData.n1, isActive: activeEndpoint?.node?.id === wallData.n1.id },
            { node: wallData.n2, isActive: activeEndpoint?.node?.id === wallData.n2.id }
        ];

        endpoints.forEach(endpoint => {
            const displayPoint = endpoint.isActive && activeEndpoint?.cornerOffset
                ? { x: endpoint.node.x + activeEndpoint.cornerOffset.x, y: endpoint.node.y + activeEndpoint.cornerOffset.y }
                : endpoint.node;

            ctx.beginPath();
            ctx.arc(displayPoint.x, displayPoint.y, ENDPOINT_HIGHLIGHT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = endpoint.isActive ? 'rgba(52, 152, 219, 0.35)' : 'rgba(52, 152, 219, 0.2)';
            ctx.fill();
            ctx.lineWidth = endpoint.isActive ? 2 : 1.5;
            ctx.strokeStyle = '#3498db';
            ctx.stroke();
        });

        ctx.restore();
    });
}

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
    const endpointSnap = findEndpointSnapTarget(x, y, window.hoveredWall, window.dimensionEndpointHover);
    const hasEndpointSnap = Boolean(endpointSnap);
    const anchorStart = {};
    if (endpointSnap) {
        x = endpointSnap.x;
        y = endpointSnap.y;
        window.dimensionActiveWall = endpointSnap.wallData;
        window.dimensionActiveCornerOffset = endpointSnap.cornerOffset || null;
    } else {
        ({ x, y } = snapPointToInch(x, y));
        window.dimensionActiveWall = null;
        window.dimensionActiveCornerOffset = null;
    }

    // If the user begins a manual dimension on a wall endpoint, align to that wall
    const nearestWall = window.dimensionActiveWall;
    if (nearestWall?.n1 && nearestWall?.n2) {
        const projected = projectPointToWallSegment(x, y, nearestWall.n1.x, nearestWall.n1.y, nearestWall.n2.x, nearestWall.n2.y);

        if (hasEndpointSnap && window.dimensionActiveCornerOffset) {
            x = projected.x + window.dimensionActiveCornerOffset.x;
            y = projected.y + window.dimensionActiveCornerOffset.y;
        } else {
            x = projected.x;
            y = projected.y;
        }
        window.dimensionActiveWall = nearestWall;

        const wallSide = getWallNormalAndSign(nearestWall, x, y);
        const normalDot = window.dimensionActiveCornerOffset && wallSide?.normal
            ? (window.dimensionActiveCornerOffset.x * wallSide.normal.x + window.dimensionActiveCornerOffset.y * wallSide.normal.y)
            : null;
        window.dimensionActiveOffsetSign = normalDot ? Math.sign(normalDot) || 1 : (wallSide?.offsetSign || 1);
    } else {
        window.dimensionActiveWall = null;
        window.dimensionActiveOffsetSign = 1;
    }

    anchorStart.x = x;
    anchorStart.y = y;

    dimensionStartX = x;
    dimensionStartY = y;
    window.dimensionAnchorStart = anchorStart;
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
    const endpointSnap = findEndpointSnapTarget(x, y, window.dimensionActiveWall, window.dimensionEndpointHover);
    let cornerOffset = window.dimensionActiveCornerOffset || null;
    if (endpointSnap) {
        x = endpointSnap.x;
        y = endpointSnap.y;
        window.dimensionActiveWall = endpointSnap.wallData;
        cornerOffset = endpointSnap.cornerOffset || cornerOffset;
    } else {
        ({ x, y } = snapPointToInch(x, y));
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
        if (cornerOffset) {
            x = projected.x + cornerOffset.x;
            y = projected.y + cornerOffset.y;
        } else {
            x = projected.x;
            y = projected.y;
        }
    }

    window.dimensionAnchorEnd = { x, y };

    const anchorStart = window.dimensionAnchorStart || { x: dimensionStartX, y: dimensionStartY };
    const anchorEnd = window.dimensionAnchorEnd || { x, y };
    let startPoint = { x: anchorStart.x, y: anchorStart.y };
    let endPoint = { x: anchorEnd.x, y: anchorEnd.y };
    let offsetSign = window.dimensionActiveOffsetSign || 1;

    if (window.dimensionActiveWall?.wall) {
        const wallInfo = getWallNormalAndSign(window.dimensionActiveWall, x, y);
        offsetSign = wallInfo?.offsetSign || offsetSign;
        const normal = wallInfo?.normal;

        if (normal) {
            const wallOffset = (getWallThicknessPx(window.dimensionActiveWall.wall) / 2 + DEFAULT_WALL_FACE_OFFSET) * offsetSign;
            startPoint = {
                x: startPoint.x + normal.x * wallOffset,
                y: startPoint.y + normal.y * wallOffset
            };
            endPoint = {
                x: endPoint.x + normal.x * wallOffset,
                y: endPoint.y + normal.y * wallOffset
            };
        }
    }

    pushUndoState();
    createManualDimension(startPoint.x, startPoint.y, endPoint.x, endPoint.y, {
        offsetSign,
        explicitWallData: window.dimensionActiveWall,
        offsetFromWallFace: DEFAULT_WALL_FACE_OFFSET,
        anchorStart,
        anchorEnd
    });
    
    // Reset for next dimension
    isDimensionDrawing = false;
    dimensionStartX = null;
    dimensionStartY = null;
    dimensionPreviewX = null;
    dimensionPreviewY = null;
    window.dimensionActiveWall = null;
    window.dimensionActiveOffsetSign = 1;
    window.dimensionActiveCornerOffset = null;
    window.dimensionEndpointHover = null;
    window.dimensionAnchorStart = null;
    window.dimensionAnchorEnd = null;

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

    const wallThickness = getWallThicknessPx(wallData.wall ?? wallData);
    const offsetDistance = (wallThickness / 2 + WALL_DIMENSION_OFFSET) * offsetSign;
    const length = Math.hypot(n2.x - n1.x, n2.y - n1.y);
    const totalInches = Math.round((length / scale) * 12);
    const text = formatMeasurementText(totalInches);

    let startX, startY, endX, endY;

    if (orientation === 'horizontal') {
        startX = n1.x + nx * offsetDistance;
        startY = n1.y + ny * offsetDistance;
        endX = n2.x + nx * offsetDistance;
        endY = n2.y + ny * offsetDistance;
    } else if (orientation === 'vertical') {
        startX = n1.x + nx * offsetDistance;
        startY = n1.y + ny * offsetDistance;
        endX = n2.x + nx * offsetDistance;
        endY = n2.y + ny * offsetDistance;
    } else {
        startX = n1.x + nx * offsetDistance;
        startY = n1.y + ny * offsetDistance;
        endX = n2.x + nx * offsetDistance;
        endY = n2.y + ny * offsetDistance;
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
        offsetSign: offsetSign,
        wallFaceOffset: WALL_DIMENSION_OFFSET
    };

    const anchorData = computeWallAnchorData(wallData.wall, startX, startY, endX, endY);
    if (anchorData) {
        dimension.wallStartRatio = anchorData.startRatio;
        dimension.wallEndRatio = anchorData.endRatio;
        dimension.wallOffset = computeWallOffset(dimension, wallData.wall);
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
    dimension.length = length;
    const totalInches = Math.round((length / scale) * 12);
    dimension.text = formatMeasurementText(totalInches);
};

window.createManualDimension = function(startX, startY, endX, endY, options = {}) {
    const dimension = {
        id: nextDimensionId++,
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
        lineColor: DIMENSION_COLOR,
        lineWidth: 2,
        isAuto: false,
        offsetSign: options.offsetSign || 1,
        anchorStartX: options.anchorStart?.x,
        anchorStartY: options.anchorStart?.y,
        anchorEndX: options.anchorEnd?.x,
        anchorEndY: options.anchorEnd?.y
    };

    // Attach to the active wall if available, otherwise attempt to find a shared wall near both points
    const anchorPositions = options.anchorStart && options.anchorEnd
        ? { startX: options.anchorStart.x, startY: options.anchorStart.y, endX: options.anchorEnd.x, endY: options.anchorEnd.y }
        : null;

    attachDimensionToWall(
        dimension,
        startX,
        startY,
        endX,
        endY,
        options.explicitWallData || window.dimensionActiveWall,
        anchorPositions
    );

    window.updateDimensionMeasurement(dimension);

    if (dimension.wallId) {
        const wall = walls.find(w => w.id === dimension.wallId);
        if (wall) {
            dimension.wallFaceOffset = Number.isFinite(options.offsetFromWallFace) ? options.offsetFromWallFace : undefined;
            dimension.wallOffset = computeWallOffset(dimension, wall);
        }
    }

    if (!Number.isFinite(dimension.anchorStartX) || !Number.isFinite(dimension.anchorStartY)) {
        dimension.anchorStartX = dimension.startX;
        dimension.anchorStartY = dimension.startY;
    }

    if (!Number.isFinite(dimension.anchorEndX) || !Number.isFinite(dimension.anchorEndY)) {
        dimension.anchorEndX = dimension.endX;
        dimension.anchorEndY = dimension.endY;
    }

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
    
    // Update hovered wall only when the cursor is on or within 2px of the wall (no near/auto snapping)
    const hoverWall = findNearestWall(x, y, 20);
    const isTouchingWall = hoverWall?.distance != null && hoverWall.distance <= WALL_HOVER_CONTACT_DISTANCE;
    window.hoveredWall = isTouchingWall ? hoverWall : null;

    const snapEndpoint = findEndpointSnapTarget(x, y, window.hoveredWall, window.dimensionEndpointHover);
    window.dimensionEndpointHover = snapEndpoint;

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
        const activeSnap = findEndpointSnapTarget(
            x,
            y,
            window.dimensionActiveWall || window.hoveredWall,
            window.dimensionEndpointHover
        );
        let cornerOffset = window.dimensionActiveCornerOffset || null;

        if (activeSnap) {
            x = activeSnap.x;
            y = activeSnap.y;
            window.dimensionEndpointHover = activeSnap;
            window.dimensionActiveWall = activeSnap.wallData || window.dimensionActiveWall;
            cornerOffset = activeSnap.cornerOffset || cornerOffset;
        } else {
            ({ x, y } = snapPointToInch(x, y));
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
            if (cornerOffset) {
                x = projected.x + cornerOffset.x;
                y = projected.y + cornerOffset.y;
            } else {
                x = projected.x;
                y = projected.y;
            }
        }

        dimensionPreviewX = x;
        dimensionPreviewY = y;
        window.dimensionActiveCornerOffset = cornerOffset;
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
    const text = formatMeasurementText(totalInches);

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

        let previewStart = { x: dimensionStartX, y: dimensionStartY };
        let previewEnd = { x: dimensionPreviewX, y: dimensionPreviewY };

        if (window.dimensionActiveWall?.wall) {
            const wallInfo = getWallNormalAndSign(window.dimensionActiveWall, dimensionPreviewX, dimensionPreviewY);
            const offsetSign = wallInfo?.offsetSign || window.dimensionActiveOffsetSign || 1;
            const normal = wallInfo?.normal;

            if (normal) {
                const wallOffset = (getWallThicknessPx(window.dimensionActiveWall.wall) / 2 + DEFAULT_WALL_FACE_OFFSET) * offsetSign;
                previewStart = {
                    x: previewStart.x + normal.x * wallOffset,
                    y: previewStart.y + normal.y * wallOffset
                };
                previewEnd = {
                    x: previewEnd.x + normal.x * wallOffset,
                    y: previewEnd.y + normal.y * wallOffset
                };
            }
        }

        // Draw dimension line
        ctx.beginPath();
        ctx.moveTo(previewStart.x, previewStart.y);
        ctx.lineTo(previewEnd.x, previewEnd.y);
        ctx.stroke();

        // Draw extension lines
        const dx = previewEnd.x - previewStart.x;
        const dy = previewEnd.y - previewStart.y;
        const len = Math.hypot(dx, dy);

        if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            const offset = MANUAL_DIMENSION_PREVIEW_EXTENSION;

            ctx.beginPath();
            ctx.moveTo(previewStart.x + nx * offset, previewStart.y + ny * offset);
            ctx.lineTo(previewStart.x - nx * offset, previewStart.y - ny * offset);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(previewEnd.x + nx * offset, previewEnd.y + ny * offset);
            ctx.lineTo(previewEnd.x - nx * offset, previewEnd.y - ny * offset);
            ctx.stroke();

            // Dimension text
            const totalInches = Math.round((len / scale) * 12);
            const text = formatMeasurementText(totalInches);

            const midX = (previewStart.x + previewEnd.x) / 2;
            const midY = (previewStart.y + previewEnd.y) / 2;
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

    if (currentTool === 'dimension') {
        const endpointWallData = window.dimensionEndpointHover?.wallData || window.hoveredWall || window.dimensionActiveWall;
        if (endpointWallData) {
            drawWallEndpointTargets(endpointWallData, window.dimensionEndpointHover);
        }
    }

    // Draw hover preview first
    if (currentTool === 'dimension' && !isDimensionDrawing) {
        const hoveredWallId = hoveredWall?.wall?.id;
        const hasAutoWallDimension = hoveredWallId != null
            && dimensions.some(dim => dim.isAuto && !dim.isSpace && dim.wallId === hoveredWallId);

        if (hoveredSpaceSegment) {
            drawHoverSpaceDimension(hoveredSpaceSegment);
        } else if (hoveredWall && !hasAutoWallDimension) {
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
            const offset = dim.isAuto ? 6 : MANUAL_DIMENSION_EXTENSION;
            const side = dim.offsetSign || 1;
            const startAnchor = Number.isFinite(dim.anchorStartX) && Number.isFinite(dim.anchorStartY)
                ? { x: dim.anchorStartX, y: dim.anchorStartY }
                : null;
            const endAnchor = Number.isFinite(dim.anchorEndX) && Number.isFinite(dim.anchorEndY)
                ? { x: dim.anchorEndX, y: dim.anchorEndY }
                : null;

            // Extension lines
            if (startAnchor && !dim.isAuto) {
                ctx.beginPath();
                ctx.moveTo(startAnchor.x, startAnchor.y);
                ctx.lineTo(dim.startX, dim.startY);
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.moveTo(dim.startX + nx * offset, dim.startY + ny * offset);
            ctx.lineTo(dim.startX - nx * offset, dim.startY - ny * offset);
            ctx.stroke();

            if (endAnchor && !dim.isAuto) {
                ctx.beginPath();
                ctx.moveTo(endAnchor.x, endAnchor.y);
                ctx.lineTo(dim.endX, dim.endY);
                ctx.stroke();
            }

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
    window.dimensionEndpointHover = null;
    hoveredWall = null;
    hoveredSpaceSegment = null;
    dimensionHoverX = null;
    dimensionHoverY = null;
    window.dimensionAnchorStart = null;
    window.dimensionAnchorEnd = null;
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
            const adjusted = applyMeasurementOffset(totalInches);
            const { feet, inches } = inchesToFeetAndInches(adjusted);
            spaces.push({
                leftWall,
                rightWall,
                leftBoundary: startX,
                rightBoundary: endX,
                spaceLength,
                feet,
                inches,
                text: formatMeasurementText(totalInches),
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
            const adjusted = applyMeasurementOffset(totalInches);
            const { feet, inches } = inchesToFeetAndInches(adjusted);
            spaces.push({
                topWall,
                bottomWall,
                topBoundary: startY,
                bottomBoundary: endY,
                spaceLength,
                feet,
                inches,
                text: formatMeasurementText(totalInches),
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

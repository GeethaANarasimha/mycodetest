// windowTools.js
// Helpers for snapping windows to nearby walls (magnet behavior)

const WINDOW_DEFAULT_LENGTH_FT = 5;
const WINDOW_DEPTH_RATIO = 0.6;

function projectPointToSegmentWindow(px, py, x1, y1, x2, y2) {
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

function getWindowLengthPx(windowObj, defaultScale = 20) {
    if (!windowObj) return WINDOW_DEFAULT_LENGTH_FT * defaultScale;

    const storedLength = windowObj.lengthPx || Math.max(windowObj.width || 0, windowObj.height || 0);
    return storedLength || WINDOW_DEFAULT_LENGTH_FT * defaultScale;
}

function getWallThicknessForWindow(wall, defaultScale = 20) {
    if (typeof window.getWallThicknessForDoor === 'function') {
        return window.getWallThicknessForDoor(wall, defaultScale);
    }
    if (!wall) return 0.5 * defaultScale;
    return wall.thicknessPx || 0.5 * defaultScale;
}

function findWindowSnapTarget(windowObj, walls, maxDistance = 30) {
    if (!windowObj || !Array.isArray(walls)) return null;

    const centerX = windowObj.x + windowObj.width / 2;
    const centerY = windowObj.y + windowObj.height / 2;

    let best = null;
    let bestDistance = maxDistance;

    for (const wall of walls) {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) continue;

        const projection = projectPointToSegmentWindow(centerX, centerY, n1.x, n1.y, n2.x, n2.y);
        const distance = Math.hypot(centerX - projection.x, centerY - projection.y);

        if (distance <= bestDistance) {
            bestDistance = distance;
            best = {
                wall,
                n1,
                n2,
                projection,
                distance
            };
        }
    }

    if (!best) return null;

    const dx = best.n2.x - best.n1.x;
    const dy = best.n2.y - best.n1.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);

    return {
        ...best,
        orientation: horizontal ? 'horizontal' : 'vertical',
        angle: Math.atan2(dy, dx)
    };
}

function sizeWindowToWall(windowObj, snapTarget, defaultScale = 20) {
    if (!windowObj || !snapTarget) return;

    const thickness = getWallThicknessForWindow(snapTarget.wall, defaultScale);
    const lengthPx = getWindowLengthPx(windowObj, defaultScale);
    const depthPx = Math.max(thickness * WINDOW_DEPTH_RATIO, defaultScale * 0.4);

    windowObj.orientation = snapTarget.orientation;
    windowObj.attachedWallAngle = snapTarget.angle;
    windowObj.attachedWallId = snapTarget.wall.id;
    windowObj.lengthPx = lengthPx;
    const { n1, n2, projection } = snapTarget;

    let centerX = projection?.x ?? (windowObj.x + windowObj.width / 2);
    let centerY = projection?.y ?? (windowObj.y + windowObj.height / 2);

    // Keep the window frame within the wall segment so it touches the wall without
    // overlapping nearby corners.
    if (n1 && n2 && projection && typeof projection.t === 'number') {
        const wallLength = Math.hypot(n2.x - n1.x, n2.y - n1.y) || 1;
        const halfWindowLength = lengthPx / 2;
        const normalizedHalf = Math.min(0.5, halfWindowLength / wallLength);
        const clampedT = Math.min(1 - normalizedHalf, Math.max(normalizedHalf, projection.t));
        centerX = n1.x + (n2.x - n1.x) * clampedT;
        centerY = n1.y + (n2.y - n1.y) * clampedT;
    }

    if (windowObj.orientation === 'horizontal') {
        windowObj.width = lengthPx;
        windowObj.height = depthPx;
    } else {
        // For vertical walls, rotate the window footprint so the depth runs across
        // the wall thickness and the length follows the wall direction without
        // leaving side gaps.
        windowObj.width = depthPx;
        windowObj.height = lengthPx;
    }

    windowObj.x = centerX - windowObj.width / 2;
    windowObj.y = centerY - windowObj.height / 2;
}

function snapWindowToNearestWall(windowObj, walls, defaultScale = 20) {
    const snapTarget = findWindowSnapTarget(windowObj, walls, 35);
    if (!snapTarget) return;
    sizeWindowToWall(windowObj, snapTarget, defaultScale);
}

function initializeWindowObject(windowObj, walls, defaultScale = 20) {
    if (!windowObj) return;
    windowObj.lengthPx = getWindowLengthPx(windowObj, defaultScale);
    snapWindowToNearestWall(windowObj, walls, defaultScale);
}

window.snapWindowToNearestWall = snapWindowToNearestWall;
window.initializeWindowObject = initializeWindowObject;
window.findWindowSnapTarget = findWindowSnapTarget;
window.sizeWindowToWall = sizeWindowToWall;

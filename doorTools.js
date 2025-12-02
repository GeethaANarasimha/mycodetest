// doorTools.js
// Helpers for creating and snapping doors to nearby walls

const DOOR_TYPE_WIDTHS_FT = {
    normal: 3,
    main: 3.5,
    bathroom: 2.5
};

function getDoorLengthPx(doorType, defaultScale = 20) {
    const lengthFt = DOOR_TYPE_WIDTHS_FT[doorType] || DOOR_TYPE_WIDTHS_FT.normal;
    return lengthFt * defaultScale;
}

function getWallThicknessForDoor(wall, defaultScale = 20) {
    if (!wall) return 0.5 * defaultScale;
    return wall.thicknessPx || 0.5 * defaultScale;
}

function projectPointToSegment(px, py, x1, y1, x2, y2) {
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

function findDoorSnapTarget(door, walls, maxDistance = 30) {
    if (!door || !Array.isArray(walls)) return null;

    const centerX = door.x + door.width / 2;
    const centerY = door.y + door.height / 2;

    let best = null;
    let bestDistance = maxDistance;

    for (const wall of walls) {
        const n1 = getNodeById(wall.startNodeId);
        const n2 = getNodeById(wall.endNodeId);
        if (!n1 || !n2) continue;

        const projection = projectPointToSegment(centerX, centerY, n1.x, n1.y, n2.x, n2.y);
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
        orientation: horizontal ? 'horizontal' : 'vertical'
    };
}

function sizeDoorToWall(door, snapTarget, defaultScale = 20) {
    if (!door || !snapTarget) return;

    const thickness = getWallThicknessForDoor(snapTarget.wall, defaultScale);
    const lengthPx = getDoorLengthPx(door.doorType, defaultScale);

    door.orientation = snapTarget.orientation;
    door.attachedWallId = snapTarget.wall.id;

    if (door.orientation === 'horizontal') {
        door.width = lengthPx;
        door.height = thickness;
        door.x = snapTarget.projection.x - door.width / 2;
        door.y = snapTarget.projection.y - door.height / 2;
    } else {
        door.width = thickness;
        door.height = lengthPx;
        door.x = snapTarget.projection.x - door.width / 2;
        door.y = snapTarget.projection.y - door.height / 2;
    }
}

function snapDoorToNearestWall(door, walls, defaultScale = 20) {
    const snapTarget = findDoorSnapTarget(door, walls, 35);
    if (!snapTarget) return;
    sizeDoorToWall(door, snapTarget, defaultScale);
}

function initializeDoorObject(door, walls, defaultScale = 20) {
    if (!door) return;
    door.doorType = door.doorType || 'normal';
    snapDoorToNearestWall(door, walls, defaultScale);
}

window.snapDoorToNearestWall = snapDoorToNearestWall;
window.initializeDoorObject = initializeDoorObject;
window.getDoorLengthPx = getDoorLengthPx;
window.getWallThicknessForDoor = getWallThicknessForDoor;
window.findDoorSnapTarget = findDoorSnapTarget;
window.sizeDoorToWall = sizeDoorToWall;

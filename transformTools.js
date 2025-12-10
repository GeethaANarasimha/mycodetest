// transformTools.js
// Utilities for flipping and rotating selected objects in the House Plan Designer

/**
 * Flip selected objects horizontally (around their own center).
 * @param {Array} objects - objects array from main script
 * @param {Set} selectedIndices - Set of indices of selected objects
 */
function flipSelectedObjectsHorizontal(objects, selectedIndices) {
    selectedIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;

        // ensure property exists
        if (typeof obj.flipH !== "boolean") obj.flipH = false;

        // toggle horizontal flip
        obj.flipH = !obj.flipH;
    });
}


/**
 * Flip selected objects vertically (around their own center).
 * @param {Array} objects - objects array from main script
 * @param {Set} selectedIndices - Set of indices of selected objects
 */
function flipSelectedObjectsVertical(objects, selectedIndices) {
    selectedIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;

        if (typeof obj.flipV !== "boolean") obj.flipV = false;

        // toggle vertical flip
        obj.flipV = !obj.flipV;
    });
}


/**
 * Rotate selected objects around their center.
 * @param {Array} objects - objects array from main script
 * @param {Set} selectedIndices - Set of indices of selected objects
 * @param {number} angleDeg - angle in degrees (+ clockwise, - anticlockwise)
 */
function rotateSelectedObjects(objects, selectedIndices, angleDeg) {
    selectedIndices.forEach(index => {
        const obj = objects[index];
        if (!obj) return;

        if (typeof obj.rotation !== "number") obj.rotation = 0;

        // add rotation and clamp to 0–360
        obj.rotation = ((obj.rotation + angleDeg) % 360 + 360) % 360;

        // snap to the nearest 5 degrees to keep orientations tidy
        obj.rotation = Math.round(obj.rotation / 5) * 5;
    });
}

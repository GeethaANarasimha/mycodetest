// panTools.js
// Canvas Panning Utility for APZOK 2D Designer

let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let scrollLeftStart = 0;
let scrollTopStart = 0;

function enableCanvasPan() {
    const container = document.querySelector(".canvas-container");

    // SPACEBAR = hold to pan
    window.addEventListener("keydown", e => {
        if (e.code === "Space") {
            container.style.cursor = "grab";
        }
    });

    window.addEventListener("keyup", e => {
        if (e.code === "Space") {
            container.style.cursor = "default";
            isPanning = false;
        }
    });

    // Start pan: Space + Left mouse
    container.addEventListener("mousedown", e => {
        if (e.button === 0 && e.shiftKey === false && e.ctrlKey === false && e.metaKey === false) {
            if (e.code !== "Space" && !e.target.matches("canvas")) return;
        }

        if (e.code !== "Space" && !e.target.matches("canvas")) return;
        
        if (e.buttons === 1 && (e.code === "Space" || window.spacePressed)) {
            isPanning = true;
            container.style.cursor = "grabbing";
            panStartX = e.clientX;
            panStartY = e.clientY;
            scrollLeftStart = container.scrollLeft;
            scrollTopStart = container.scrollTop;
        }
    });

    container.addEventListener("mousemove", e => {
        if (!isPanning) return;
        container.scrollLeft = scrollLeftStart - (e.clientX - panStartX);
        container.scrollTop = scrollTopStart - (e.clientY - panStartY);
    });

    container.addEventListener("mouseup", () => {
        isPanning = false;
        container.style.cursor = "default";
    });

    container.addEventListener("mouseleave", () => {
        isPanning = false;
        container.style.cursor = "default";
    });
}

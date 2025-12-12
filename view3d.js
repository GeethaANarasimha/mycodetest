import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';

(function () {

    const toggleButton = document.getElementById('toggle3DView');
    const viewToggleIcon = document.getElementById('viewToggleIcon');
    const planShell = document.getElementById('plan2dShell');
    const view3dShell = document.getElementById('view3dShell');
    const view3dContainer = document.getElementById('view3dContainer');
    const wallHeightPx = (typeof scale === 'number' ? scale : 20) * 10;
    const doorHeightPx = (typeof scale === 'number' ? scale : 20) * 7;
    const windowHeightPx = (typeof scale === 'number' ? scale : 20) * 4;
    const windowSillPx = (typeof scale === 'number' ? scale : 20) * 3;

    const DOOR_OPEN_ANGLE_DEG = 75;

    class Plan3DViewer {
        constructor(container) {
            this.container = container;
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xf7f9fc);
            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            this.renderer.shadowMap.enabled = true;
            this.container.appendChild(this.renderer.domElement);

            const { clientWidth, clientHeight } = container;
            this.camera = new THREE.PerspectiveCamera(55, clientWidth / clientHeight, 1, 20000);
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.maxDistance = 8000;
            this.controls.minDistance = 200;

            this.lights = this.createLights();
            this.scene.add(...this.lights, this.createGround());

            this.planGroup = new THREE.Group();
            this.scene.add(this.planGroup);
            this.resize();
            this.animate();
        }

        createLights() {
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            const directional = new THREE.DirectionalLight(0xffffff, 0.65);
            directional.position.set(600, 900, 500);
            directional.castShadow = true;
            directional.shadow.mapSize.width = 2048;
            directional.shadow.mapSize.height = 2048;

            const fill = new THREE.DirectionalLight(0xbfd3ff, 0.35);
            fill.position.set(-500, 600, -700);

            return [ambient, directional, fill];
        }

        createGround() {
            const grid = new THREE.GridHelper(4000, 40, 0xd0d9e8, 0xe2e8f0);
            grid.material.opacity = 0.35;
            grid.material.transparent = true;
            grid.position.y = 0;
            return grid;
        }

        clearPlanGroup() {
            while (this.planGroup.children.length) {
                const child = this.planGroup.children.pop();
                child.geometry?.dispose?.();
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose?.());
                } else {
                    child.material?.dispose?.();
                }
            }
        }

        renderPlan({ nodes = [], walls = [], floors = [], objects = [] }) {
            this.clearPlanGroup();
            const content = new THREE.Group();
            content.name = 'plan-content';

            const wallsGroup = this.buildWalls(walls, nodes, objects);
            const floorsGroup = this.buildFloors(floors, nodes, walls);
            const doorsGroup = this.buildDoors(objects);
            const windowsGroup = this.buildWindows(objects);

            [floorsGroup, wallsGroup, doorsGroup, windowsGroup].forEach(group => {
                if (group) content.add(group);
            });

            this.planGroup.add(content);
            this.focusCameraOn(content);
        }

        buildFloors(floors, nodes, walls = []) {
            const group = new THREE.Group();
            const defaultColor = new THREE.Color('#dbeafe');
            const typicalWallThickness = walls.length
                ? walls.reduce((sum, wall) => sum + (wall.thicknessPx || (scale * 0.5)), 0) / walls.length
                : (scale * 0.5);
            const floorInset = Math.max(0, typicalWallThickness * 0.02);

            floors.forEach(floor => {
                const points = (floor.nodeIds || [])
                    .map(id => nodes.find(n => n.id === id))
                    .filter(Boolean);

                if (points.length < 3) return;

                const shape = new THREE.Shape();
                points.forEach((point, idx) => {
                    if (idx === 0) {
                        shape.moveTo(point.x, point.y);
                    } else {
                        shape.lineTo(point.x, point.y);
                    }
                });
                shape.closePath();

                const geometry = new THREE.ShapeGeometry(shape);
                // Keep floor geometry aligned with 2D coordinates so it lines up with walls
                geometry.rotateX(Math.PI / 2);
                if (floorInset > 0) {
                    geometry.computeBoundingBox();
                    const bbox = geometry.boundingBox;
                    const size = bbox.getSize(new THREE.Vector3());
                    const center = bbox.getCenter(new THREE.Vector3());
                    const scaleX = (size.x - (floorInset * 2)) / Math.max(size.x, 1);
                    const scaleZ = (size.z - (floorInset * 2)) / Math.max(size.z, 1);
                    geometry.translate(-center.x, 0, -center.z);
                    geometry.scale(scaleX, 1, scaleZ);
                    geometry.translate(center.x, 0, center.z);
                }

                const fillColor = floor?.texture?.color || defaultColor;
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(fillColor),
                    metalness: 0.05,
                    roughness: 0.85,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.y = -0.5;
                mesh.receiveShadow = true;
                group.add(mesh);
            });

            return group;
        }

        buildWalls(walls, nodes, objects = []) {
            const group = new THREE.Group();
            const doorObjects = objects.filter(obj => obj.type === 'door');
            const windowObjects = objects.filter(obj => obj.type === 'window');
            walls.forEach(wall => {
                const start = nodes.find(n => n.id === wall.startNodeId);
                const end = nodes.find(n => n.id === wall.endNodeId);
                if (!start || !end) return;

                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const length = Math.hypot(dx, dy) || 1;
                const thickness = wall.thicknessPx || (scale * 0.5);

                const wallDir = new THREE.Vector2(dx, dy).normalize();
                const doorOpenings = this.getDoorOpeningsForWall(start, wallDir, length, thickness, doorObjects);
                const windowOpenings = this.getWindowOpeningsForWall(start, wallDir, length, thickness, windowObjects);
                const allOpenings = [...doorOpenings, ...windowOpenings];
                const bands = this.buildWallBands(allOpenings, length, wallHeightPx);

                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(wall.lineColor || '#1f2937'),
                    metalness: 0.1,
                    roughness: 0.65
                });

                bands.forEach(band => {
                    band.segments.forEach(segment => {
                        const height = band.height;
                        if (height <= 0) return;

                        const overlap = thickness * 0.5;
                        const isAtWallStart = Math.abs(segment.start) < 1e-4;
                        const isAtWallEnd = Math.abs((segment.start + segment.length) - length) < 1e-4;
                        const startPad = isAtWallStart ? Math.min(overlap, segment.length * 0.5) : 0;
                        const endPad = isAtWallEnd ? Math.min(overlap, segment.length * 0.5) : 0;
                        const adjustedLength = segment.length + startPad + endPad;

                        const geometry = new THREE.BoxGeometry(adjustedLength, height, thickness);
                        const mesh = new THREE.Mesh(geometry, material);
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;

                        const centerOffset = wallDir.clone().multiplyScalar(
                            segment.start + (segment.length / 2) + ((endPad - startPad) / 2)
                        );
                        mesh.position.set(
                            start.x + centerOffset.x,
                            band.start + (height / 2),
                            start.y + centerOffset.y
                        );
                        mesh.rotation.y = Math.atan2(dy, dx);
                        group.add(mesh);
                    });
                });

                doorOpenings.forEach(opening => {
                    const frame = this.createDoorFrame(opening, start, wallDir, thickness, dy, dx);
                    if (frame) {
                        group.add(frame);
                    }
                });
            });
            return group;
        }

        buildDoors() {
            // Door visualization is handled as openings and frames within buildWalls.
            return new THREE.Group();
        }

        getDoorOpeningsForWall(start, wallDir, wallLength, wallThickness, doorObjects) {
            const openings = [];
            doorObjects.forEach(obj => {
                const { length: doorLength, thickness: doorThickness, center } = this.getLinearSize(obj);
                const doorOrientation = (obj.orientation === 'vertical')
                    ? new THREE.Vector2(0, 1)
                    : new THREE.Vector2(1, 0);
                const alignment = Math.abs(wallDir.dot(doorOrientation));
                if (alignment < 0.9) return;

                const doorCenter = new THREE.Vector2(center.x, center.z);
                const startVec = new THREE.Vector2(start.x, start.y);
                const rel = doorCenter.clone().sub(startVec);
                const along = rel.dot(wallDir);

                // Ensure the door lies on or near the wall span
                if (along + (doorLength / 2) < 0 || along - (doorLength / 2) > wallLength) return;

                const perpendicular = rel.clone().sub(wallDir.clone().multiplyScalar(along));
                if (perpendicular.length() > (wallThickness * 0.75)) return;

                const { frameWidth } = this.getDoorFrameDimensions(wallThickness);
                const clearance = Math.max(1, frameWidth * 0.15);
                const gapLength = doorLength + (frameWidth * 2) + (clearance * 2);

                openings.push({
                    start: Math.max(0, along - (gapLength / 2)),
                    end: Math.min(wallLength, along + (gapLength / 2)),
                    length: doorLength,
                    gapLength,
                    along,
                    frameWidth,
                    thickness: doorThickness || wallThickness,
                    heightStart: 0,
                    heightEnd: doorHeightPx
                });
            });
            return openings;
        }

        buildWallSegments(openings, totalLength) {
            const segments = [];
            const sorted = openings.slice().sort((a, b) => a.start - b.start);
            let cursor = 0;
            sorted.forEach(opening => {
                const start = Math.max(0, opening.start);
                const end = Math.min(totalLength, opening.end);
                if (end <= 0 || start >= totalLength) return;
                if (start > cursor) {
                    segments.push({ start: cursor, length: start - cursor });
                }
                cursor = Math.max(cursor, end);
            });
            if (cursor < totalLength) {
                segments.push({ start: cursor, length: totalLength - cursor });
            }
            return segments;
        }

        buildWallBands(openings, totalLength, wallHeight) {
            const normalized = openings
                .map(opening => ({
                    ...opening,
                    heightStart: Math.max(0, Math.min(opening.heightStart ?? 0, wallHeight)),
                    heightEnd: Math.max(0, Math.min(opening.heightEnd ?? wallHeight, wallHeight))
                }))
                .filter(opening => opening.heightEnd > opening.heightStart);

            const breakpoints = new Set([0, wallHeight]);
            normalized.forEach(opening => {
                breakpoints.add(opening.heightStart);
                breakpoints.add(opening.heightEnd);
            });

            const sortedHeights = Array.from(breakpoints).sort((a, b) => a - b);
            const bands = [];
            for (let i = 0; i < sortedHeights.length - 1; i++) {
                const bandStart = sortedHeights[i];
                const bandEnd = sortedHeights[i + 1];
                const bandHeight = bandEnd - bandStart;
                if (bandHeight <= 0) continue;

                const applicableOpenings = normalized.filter(opening =>
                    opening.heightStart < bandEnd && opening.heightEnd > bandStart
                );

                const segments = this.buildWallSegments(applicableOpenings, totalLength);
                if (segments.length) {
                    bands.push({ start: bandStart, end: bandEnd, height: bandHeight, segments });
                }
            }

            return bands;
        }

        getWindowOpeningsForWall(start, wallDir, wallLength, wallThickness, windowObjects) {
            const openings = [];
            windowObjects.forEach(obj => {
                const { length: windowLength, thickness: windowThickness, center } = this.getLinearSize(obj);
                const windowOrientation = (obj.orientation === 'vertical')
                    ? new THREE.Vector2(0, 1)
                    : new THREE.Vector2(1, 0);
                const alignment = Math.abs(wallDir.dot(windowOrientation));
                if (alignment < 0.9) return;

                const windowCenter = new THREE.Vector2(center.x, center.z);
                const startVec = new THREE.Vector2(start.x, start.y);
                const rel = windowCenter.clone().sub(startVec);
                const along = rel.dot(wallDir);

                if (along + (windowLength / 2) < 0 || along - (windowLength / 2) > wallLength) return;

                const perpendicular = rel.clone().sub(wallDir.clone().multiplyScalar(along));
                if (perpendicular.length() > (wallThickness * 0.75)) return;

                const frameWidth = Math.max(2, wallThickness * 0.2);
                const clearance = Math.max(1, frameWidth * 0.15);
                const gapLength = windowLength + (frameWidth * 2) + (clearance * 2);

                openings.push({
                    start: Math.max(0, along - (gapLength / 2)),
                    end: Math.min(wallLength, along + (gapLength / 2)),
                    length: windowLength,
                    gapLength,
                    along,
                    frameWidth,
                    thickness: windowThickness || wallThickness,
                    heightStart: windowSillPx,
                    heightEnd: windowSillPx + windowHeightPx
                });
            });
            return openings;
        }

        getDoorFrameDimensions(wallThickness) {
            const frameDepth = Math.max(3, wallThickness - 1);
            const frameWidth = Math.max(4, wallThickness * 0.3);
            return { frameDepth, frameWidth };
        }

        getWindowPanelCount(lengthPx) {
            const pxPerFoot = typeof scale === 'number' ? scale : 20;
            const totalInches = (lengthPx / pxPerFoot) * 12;
            const targetPanelInches = 18; // 1'6" default panel width

            // Aim for 1'6" panels, but if the final remainder is smaller than
            // a full panel, redistribute it across all panels to keep widths equal.
            const approximatePanels = totalInches / targetPanelInches;
            const panelCount = Math.max(1, Math.round(approximatePanels));

            return panelCount;
        }

        createFrenchWindow(length, thickness, panelCount = 2) {
            const frameWidth = Math.max(3, (typeof scale === 'number' ? scale : 20) * 0.15);
            const mullionWidth = Math.max(2, frameWidth * 0.8);
            const glassThickness = Math.max(thickness * 0.4, 6);
            const frameDepth = Math.max(thickness, 8);
            const height = windowHeightPx;
            const usableWidth = Math.max(1, length - (frameWidth * 2) - (mullionWidth * (panelCount - 1)));
            const glassHeight = Math.max(2, height - (frameWidth * 2));
            const panelWidth = usableWidth / panelCount;

            const frameMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#dfe7fd'),
                metalness: 0.1,
                roughness: 0.4
            });

            const glassMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#8fb8ff'),
                opacity: 0.65,
                transparent: true,
                metalness: 0.05,
                roughness: 0.2
            });

            const group = new THREE.Group();

            const verticalFrameGeometry = new THREE.BoxGeometry(frameWidth, height, frameDepth);
            const horizontalFrameGeometry = new THREE.BoxGeometry(length, frameWidth, frameDepth);

            const leftFrame = new THREE.Mesh(verticalFrameGeometry, frameMaterial);
            const rightFrame = new THREE.Mesh(verticalFrameGeometry, frameMaterial);
            const topFrame = new THREE.Mesh(horizontalFrameGeometry, frameMaterial);
            const bottomFrame = new THREE.Mesh(horizontalFrameGeometry, frameMaterial);

            leftFrame.position.set(-(length / 2) + (frameWidth / 2), 0, 0);
            rightFrame.position.set((length / 2) - (frameWidth / 2), 0, 0);
            topFrame.position.set(0, (height / 2) - (frameWidth / 2), 0);
            bottomFrame.position.set(0, -(height / 2) + (frameWidth / 2), 0);

            [leftFrame, rightFrame, topFrame, bottomFrame].forEach(mesh => {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
            });

            const glassGeometry = new THREE.BoxGeometry(panelWidth, glassHeight, glassThickness);
            const mullionGeometry = new THREE.BoxGeometry(mullionWidth, glassHeight, frameDepth);
            const startX = -(length / 2) + frameWidth + (panelWidth / 2);

            for (let i = 0; i < panelCount; i++) {
                const x = startX + i * (panelWidth + mullionWidth);
                const glassPanel = new THREE.Mesh(glassGeometry, glassMaterial);
                glassPanel.position.set(x, 0, 0);
                glassPanel.castShadow = true;
                glassPanel.receiveShadow = true;
                group.add(glassPanel);

                if (i < panelCount - 1) {
                    const mullion = new THREE.Mesh(mullionGeometry, frameMaterial);
                    mullion.position.set(x + (panelWidth / 2) + (mullionWidth / 2), 0, 0);
                    mullion.castShadow = true;
                    mullion.receiveShadow = true;
                    group.add(mullion);
                }
            }

            return group;
        }

        createDoorFrame(opening, wallStart, wallDir, wallThickness, dy, dx) {
            const frameGroup = new THREE.Group();
            const { frameDepth, frameWidth } = this.getDoorFrameDimensions(wallThickness);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#c08457'),
                metalness: 0.25,
                roughness: 0.45
            });

            const postGeometry = new THREE.BoxGeometry(frameWidth, doorHeightPx, frameDepth);
            const lintelWidth = opening.gapLength;
            const lintelGeometry = new THREE.BoxGeometry(lintelWidth, frameWidth, frameDepth);

            const leftPost = new THREE.Mesh(postGeometry, material);
            const rightPost = new THREE.Mesh(postGeometry, material);
            const lintel = new THREE.Mesh(lintelGeometry, material);

            [leftPost, rightPost, lintel].forEach(mesh => {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            });

            leftPost.position.set(-(opening.length / 2) - (frameWidth / 2), doorHeightPx / 2, 0);
            rightPost.position.set((opening.length / 2) + (frameWidth / 2), doorHeightPx / 2, 0);
            lintel.position.set(0, doorHeightPx - (frameWidth / 2), 0);

            frameGroup.add(leftPost, rightPost, lintel);

            const alongOffset = wallDir.clone().multiplyScalar(opening.along);
            const normalOffset = new THREE.Vector2(-wallDir.y, wallDir.x).multiplyScalar(0);
            frameGroup.position.set(
                wallStart.x + alongOffset.x + normalOffset.x,
                0,
                wallStart.y + alongOffset.y + normalOffset.y
            );
            frameGroup.rotation.y = Math.atan2(dy, dx);

            return frameGroup;
        }

        buildWindows(objects) {
            const group = new THREE.Group();
            objects
                .filter(obj => obj.type === 'window')
                .forEach(obj => {
                    const { length, thickness, center } = this.getLinearSize(obj);
                    const panelCount = this.getWindowPanelCount(length);
                    const windowAssembly = this.createFrenchWindow(length, Math.max(thickness, 8), panelCount);
                    windowAssembly.position.set(center.x, windowSillPx + (windowHeightPx / 2), center.z);
                    const fallbackRotation = obj.orientation === 'vertical' ? Math.PI / 2 : 0;
                    windowAssembly.rotation.y = obj.attachedWallAngle ?? obj.rotation ?? fallbackRotation;
                    group.add(windowAssembly);
                });
            return group;
        }

        getLinearSize(obj) {
            const length = obj.lengthPx || obj.width || obj.height || (scale * 3);
            const thickness = obj.height || (scale * 0.5);
            const center = {
                x: obj.x + (obj.width || length) / 2,
                z: obj.y + (obj.height || thickness) / 2
            };
            return { length, thickness, center };
        }

        focusCameraOn(object3d) {
            const box = new THREE.Box3().setFromObject(object3d);
            if (box.isEmpty()) {
                const defaultDistance = 900;
                const spherical = new THREE.Spherical(
                    defaultDistance,
                    THREE.MathUtils.degToRad(60),
                    THREE.MathUtils.degToRad(30)
                );
                const offset = new THREE.Vector3().setFromSpherical(spherical);
                this.camera.position.copy(offset);
                this.controls.target.set(0, 0, 0);
                this.controls.update();
                return;
            }

            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const maxDim = Math.max(size.x, size.y, size.z);
            const fitHeightDistance = maxDim / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
            const distance = fitHeightDistance * 1.35;

            const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(
                distance,
                THREE.MathUtils.degToRad(60),
                THREE.MathUtils.degToRad(30)
            ));
            this.camera.position.copy(center.clone().add(offset));
            this.controls.target.copy(center);
            this.controls.update();
        }

        resize() {
            const { clientWidth, clientHeight } = this.container;
            this.camera.aspect = clientWidth / Math.max(clientHeight, 1);
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(clientWidth, clientHeight);
        }

        animate() {
            this.animationFrame = requestAnimationFrame(() => this.animate());
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        }

        dispose() {
            cancelAnimationFrame(this.animationFrame);
            this.renderer.dispose();
        }
    }

    let viewer = null;

    function show3DView() {
        if (!viewer) {
            viewer = new Plan3DViewer(view3dContainer);
            window.addEventListener('resize', () => viewer.resize());
        }

        const planState = {
            nodes: (typeof nodes !== 'undefined' && Array.isArray(nodes)) ? nodes : [],
            walls: (typeof walls !== 'undefined' && Array.isArray(walls)) ? walls : [],
            floors: (typeof floors !== 'undefined' && Array.isArray(floors)) ? floors : [],
            objects: (typeof objects !== 'undefined' && Array.isArray(objects)) ? objects : []
        };

        viewer.renderPlan(planState);
        const placeholder = view3dContainer.querySelector('.view3d-empty');
        if (placeholder) placeholder.classList.add('hidden');
        planShell.classList.add('hidden');
        view3dShell.classList.remove('hidden');
        view3dShell.setAttribute('aria-hidden', 'false');
        planShell.setAttribute('aria-hidden', 'true');
        document.body.classList.add('view3d-mode');
        viewer.resize();
        if (viewToggleIcon) viewToggleIcon.textContent = '2D';
        if (toggleButton) toggleButton.setAttribute('aria-label', 'Switch to 2D view');
    }

    function show2DView() {
        planShell.classList.remove('hidden');
        view3dShell.classList.add('hidden');
        view3dShell.setAttribute('aria-hidden', 'true');
        planShell.setAttribute('aria-hidden', 'false');
        document.body.classList.remove('view3d-mode');
        if (viewToggleIcon) viewToggleIcon.textContent = '3D';
        if (toggleButton) toggleButton.setAttribute('aria-label', 'Switch to 3D view');
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            const is3DVisible = !view3dShell.classList.contains('hidden');
            if (is3DVisible) {
                show2DView();
            } else {
                show3DView();
            }
        });
    }
})();

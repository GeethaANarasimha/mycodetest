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
            const floorInset = Math.max(2, typicalWallThickness * 0.45);

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
                geometry.rotateX(-Math.PI / 2);
                geometry.computeBoundingBox();
                const bbox = geometry.boundingBox;
                const size = bbox.getSize(new THREE.Vector3());
                const center = bbox.getCenter(new THREE.Vector3());
                const scaleX = 1 + ((floorInset * 2) / Math.max(size.x, 1));
                const scaleZ = 1 + ((floorInset * 2) / Math.max(size.z, 1));
                geometry.translate(-center.x, 0, -center.z);
                geometry.scale(scaleX, 1, scaleZ);
                geometry.translate(center.x, 0, center.z);

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
            walls.forEach(wall => {
                const start = nodes.find(n => n.id === wall.startNodeId);
                const end = nodes.find(n => n.id === wall.endNodeId);
                if (!start || !end) return;

                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const length = Math.hypot(dx, dy) || 1;
                const thickness = wall.thicknessPx || (scale * 0.5);

                const wallDir = new THREE.Vector2(dx, dy).normalize();
                const openings = this.getDoorOpeningsForWall(start, wallDir, length, thickness, doorObjects);
                const segments = this.buildWallSegments(openings, length);

                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(wall.lineColor || '#1f2937'),
                    metalness: 0.1,
                    roughness: 0.65
                });

                segments.forEach(segment => {
                    const geometry = new THREE.BoxGeometry(segment.length, wallHeightPx, thickness);
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    const centerOffset = wallDir.clone().multiplyScalar(segment.start + (segment.length / 2));
                    mesh.position.set(
                        start.x + centerOffset.x,
                        wallHeightPx / 2,
                        start.y + centerOffset.y
                    );
                    mesh.rotation.y = Math.atan2(dy, dx);
                    group.add(mesh);
                });

                openings.forEach(opening => {
                    const topHeight = Math.max(0, wallHeightPx - doorHeightPx);
                    if (topHeight > 0) {
                        const lintelGeometry = new THREE.BoxGeometry(opening.length, topHeight, thickness);
                        const lintelMesh = new THREE.Mesh(lintelGeometry, material);
                        lintelMesh.castShadow = true;
                        lintelMesh.receiveShadow = true;

                        const centerOffset = wallDir.clone().multiplyScalar(opening.along);
                        lintelMesh.position.set(
                            start.x + centerOffset.x,
                            doorHeightPx + (topHeight / 2),
                            start.y + centerOffset.y
                        );
                        lintelMesh.rotation.y = Math.atan2(dy, dx);
                        group.add(lintelMesh);
                    }

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

                openings.push({
                    start: Math.max(0, along - (doorLength / 2)),
                    end: Math.min(wallLength, along + (doorLength / 2)),
                    length: doorLength,
                    along,
                    thickness: doorThickness || wallThickness
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

        createDoorFrame(opening, wallStart, wallDir, wallThickness, dy, dx) {
            const frameGroup = new THREE.Group();
            const frameDepth = Math.max(2, wallThickness - 2);
            const frameWidth = Math.max(4, wallThickness * 0.3);

            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color('#c08457'),
                metalness: 0.25,
                roughness: 0.45
            });

            const postGeometry = new THREE.BoxGeometry(frameWidth, doorHeightPx, frameDepth);
            const lintelGeometry = new THREE.BoxGeometry(opening.length + (frameWidth * 2), frameWidth, frameDepth);

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
            const normalOffset = new THREE.Vector2(-wallDir.y, wallDir.x)
                .normalize()
                .multiplyScalar((wallThickness - frameDepth) / 2);
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
                    const geometry = new THREE.BoxGeometry(length, windowHeightPx, Math.max(thickness, 8));
                    const material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color('#8fb8ff'),
                        opacity: 0.7,
                        transparent: true,
                        metalness: 0.05,
                        roughness: 0.2
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.position.set(center.x, windowSillPx + (windowHeightPx / 2), center.z);
                    mesh.rotation.y = obj.rotation || (obj.orientation === 'vertical' ? Math.PI / 2 : 0);
                    group.add(mesh);
                });
            return group;
        }

        getLinearSize(obj) {
            const horizontal = obj.orientation !== 'vertical';
            const length = horizontal ? obj.width || obj.lengthPx || (scale * 3) : obj.height || obj.lengthPx || (scale * 3);
            const thickness = horizontal ? obj.height || (scale * 0.5) : obj.width || (scale * 0.5);
            const center = {
                x: obj.x + (horizontal ? length / 2 : thickness / 2),
                z: obj.y + (horizontal ? thickness / 2 : length / 2)
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

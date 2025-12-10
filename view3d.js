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

            const wallsGroup = this.buildWalls(walls, nodes);
            const floorsGroup = this.buildFloors(floors, nodes);
            const doorsGroup = this.buildDoors(objects);
            const windowsGroup = this.buildWindows(objects);

            [floorsGroup, wallsGroup, doorsGroup, windowsGroup].forEach(group => {
                if (group) content.add(group);
            });

            this.planGroup.add(content);
            this.focusCameraOn(content);
        }

        buildFloors(floors, nodes) {
            const group = new THREE.Group();
            const defaultColor = new THREE.Color('#dbeafe');

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

                const fillColor = floor?.texture?.color || defaultColor;
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(fillColor),
                    metalness: 0.05,
                    roughness: 0.85,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.receiveShadow = true;
                group.add(mesh);
            });

            return group;
        }

        buildWalls(walls, nodes) {
            const group = new THREE.Group();
            walls.forEach(wall => {
                const start = nodes.find(n => n.id === wall.startNodeId);
                const end = nodes.find(n => n.id === wall.endNodeId);
                if (!start || !end) return;

                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const length = Math.hypot(dx, dy) || 1;
                const thickness = wall.thicknessPx || (scale * 0.5);

                const geometry = new THREE.BoxGeometry(length, wallHeightPx, thickness);
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(wall.lineColor || '#1f2937'),
                    metalness: 0.1,
                    roughness: 0.65
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(
                    (start.x + end.x) / 2,
                    wallHeightPx / 2,
                    (start.y + end.y) / 2
                );
                mesh.rotation.y = Math.atan2(dy, dx);
                group.add(mesh);
            });
            return group;
        }

        buildDoors(objects) {
            const group = new THREE.Group();
            objects
                .filter(obj => obj.type === 'door')
                .forEach(obj => {
                    const { length, thickness, center } = this.getLinearSize(obj);
                    const geometry = new THREE.BoxGeometry(length, doorHeightPx, thickness || (scale * 0.5));
                    const material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color('#c08457'),
                        metalness: 0.2,
                        roughness: 0.55
                    });
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    mesh.position.set(center.x, doorHeightPx / 2, center.z);
                    mesh.rotation.y = obj.rotation || (obj.orientation === 'vertical' ? Math.PI / 2 : 0);
                    group.add(mesh);
                });
            return group;
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

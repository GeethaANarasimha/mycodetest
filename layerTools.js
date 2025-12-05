(function () {
    const DEFAULT_LAYER_NAME = 'Ground floor';
    const FALLBACK_STATE = {
        layers: [{ id: 'ground-floor', name: DEFAULT_LAYER_NAME }],
        activeLayerId: 'ground-floor'
    };

    let layers = JSON.parse(JSON.stringify(FALLBACK_STATE.layers));
    let activeLayerId = FALLBACK_STATE.activeLayerId;
    let layerSelect = null;
    let addLayerButton = null;
    let editLayersButton = null;
    let layerManagerModal = null;
    let layerListContainer = null;
    let closeLayerManagerButton = null;
    const layerChangeCallbacks = [];
    const layerStructureChangeCallbacks = [];

    function ordinalSuffix(number) {
        const remainderTen = number % 10;
        const remainderHundred = number % 100;
        if (remainderTen === 1 && remainderHundred !== 11) return `${number}st`;
        if (remainderTen === 2 && remainderHundred !== 12) return `${number}nd`;
        if (remainderTen === 3 && remainderHundred !== 13) return `${number}rd`;
        return `${number}th`;
    }

    function nextSuggestedName() {
        const baseIndex = Math.max(layers.length, 1);
        return `${ordinalSuffix(baseIndex)} floor`;
    }

    function generateLayerId(name) {
        const base = (name || 'layer').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'layer';
        let candidate = base;
        let suffix = 2;
        while (layers.some(layer => layer.id === candidate)) {
            candidate = `${base}-${suffix++}`;
        }
        return candidate;
    }

    function ensureActiveLayer() {
        if (!layers.length) {
            layers = JSON.parse(JSON.stringify(FALLBACK_STATE.layers));
        }
        if (!layers.some(layer => layer.id === activeLayerId)) {
            activeLayerId = layers[0].id;
        }
    }

    function renderLayerOptions() {
        if (!layerSelect) return;
        layerSelect.innerHTML = '';
        layers.forEach(layer => {
            const option = document.createElement('option');
            option.value = layer.id;
            option.textContent = layer.name;
            layerSelect.appendChild(option);
        });
        ensureActiveLayer();
        layerSelect.value = activeLayerId;
        renderLayerList();
    }

    function notifyLayerStructureChange(change) {
        layerStructureChangeCallbacks.forEach(cb => {
            try {
                cb(change);
            } catch (err) {
                console.error('Layer structure callback failed', err);
            }
        });
    }

    function notifyLayerChange(previousId, nextId) {
        if (previousId === nextId) return;
        layerChangeCallbacks.forEach(cb => {
            try {
                cb(nextId, previousId);
            } catch (err) {
                console.error('Layer change callback failed', err);
            }
        });
    }

    function setActiveLayer(id) {
        if (!layers.some(layer => layer.id === id)) return;
        const previous = activeLayerId;
        activeLayerId = id;
        ensureActiveLayer();

        if (layerSelect) {
            layerSelect.value = activeLayerId;
        }

        notifyLayerChange(previous, activeLayerId);
    }

    function addLayer(name) {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const newLayer = {
            id: generateLayerId(trimmed),
            name: trimmed
        };
        layers.push(newLayer);
        renderLayerOptions();
        setActiveLayer(newLayer.id);
        notifyLayerStructureChange({ type: 'add', layer: newLayer });
        return true;
    }

    function deleteLayer(layerId) {
        if (layers.length <= 1) {
            window.alert('At least one floor must remain.');
            return;
        }

        const layer = layers.find(l => l.id === layerId);
        if (!layer) return;

        const confirmed = window.confirm(`Delete "${layer.name}"? This will remove everything on that floor.`);
        if (!confirmed) return;

        const wasActive = activeLayerId === layerId;
        layers = layers.filter(l => l.id !== layerId);
        ensureActiveLayer();

        const nextActiveId = wasActive ? layers[0].id : activeLayerId;
        renderLayerOptions();
        setActiveLayer(nextActiveId);
        notifyLayerStructureChange({ type: 'delete', layerId, nextActiveLayerId: activeLayerId });
    }

    function renameLayer(layerId, nextName) {
        const trimmed = nextName.trim();
        if (!trimmed) return false;
        const layer = layers.find(l => l.id === layerId);
        if (!layer) return false;
        layer.name = trimmed;
        renderLayerOptions();
        notifyLayerStructureChange({ type: 'rename', layerId, name: trimmed });
        return true;
    }

    function handleAddLayerClick() {
        const defaultName = nextSuggestedName();
        const name = window.prompt('Enter the name for the new layer', defaultName);
        if (!name) return;
        addLayer(name);
    }

    function handleLayerListClick(event) {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const row = target.closest('[data-layer-id]');
        if (!row) return;
        const layerId = row.getAttribute('data-layer-id');
        if (target.matches('[data-action="delete-layer"]')) {
            deleteLayer(layerId);
            renderLayerList();
        } else if (target.matches('[data-action="rename-layer"]')) {
            const currentName = layers.find(l => l.id === layerId)?.name || '';
            const nextName = window.prompt('Rename floor', currentName);
            if (nextName) {
                renameLayer(layerId, nextName);
                renderLayerList();
            }
        }
    }

    function renderLayerList() {
        if (!layerListContainer) return;
        layerListContainer.innerHTML = '';
        layers.forEach(layer => {
            const row = document.createElement('div');
            row.className = 'layer-row';
            row.dataset.layerId = layer.id;

            const name = document.createElement('span');
            name.className = 'layer-row__name';
            name.textContent = layer.name;
            row.appendChild(name);

            const actions = document.createElement('div');
            actions.className = 'layer-row__actions';

            const renameBtn = document.createElement('button');
            renameBtn.type = 'button';
            renameBtn.textContent = 'Rename';
            renameBtn.className = 'pill-btn';
            renameBtn.dataset.action = 'rename-layer';
            actions.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'pill-btn danger';
            deleteBtn.dataset.action = 'delete-layer';
            actions.appendChild(deleteBtn);

            row.appendChild(actions);
            layerListContainer.appendChild(row);
        });
    }

    function openLayerManager() {
        if (!layerManagerModal) return;
        renderLayerList();
        layerManagerModal.classList.remove('hidden');
    }

    function closeLayerManager() {
        if (!layerManagerModal) return;
        layerManagerModal.classList.add('hidden');
    }

    function initLayerTools() {
        layerSelect = document.getElementById('layerSelect');
        addLayerButton = document.getElementById('addLayerButton');
        editLayersButton = document.getElementById('editLayersButton');
        layerManagerModal = document.getElementById('layerManagerModal');
        layerListContainer = document.getElementById('layerList');
        closeLayerManagerButton = document.getElementById('closeLayerManager');

        if (!layerSelect || !addLayerButton) return;

        renderLayerOptions();
        layerSelect.addEventListener('change', (event) => setActiveLayer(event.target.value));
        addLayerButton.addEventListener('click', handleAddLayerClick);

        if (editLayersButton) {
            editLayersButton.addEventListener('click', openLayerManager);
        }

        if (layerManagerModal) {
            layerManagerModal.addEventListener('click', (event) => {
                if (event.target === layerManagerModal) {
                    closeLayerManager();
                }
            });
        }

        if (layerListContainer) {
            layerListContainer.addEventListener('click', handleLayerListClick);
        }

        if (closeLayerManagerButton) {
            closeLayerManagerButton.addEventListener('click', closeLayerManager);
        }
    }

    function getLayerState() {
        ensureActiveLayer();
        return {
            layers: JSON.parse(JSON.stringify(layers)),
            activeLayerId
        };
    }

    function applyLayerState(state) {
        const previous = activeLayerId;
        if (!state || !Array.isArray(state.layers) || state.layers.length === 0) {
            layers = JSON.parse(JSON.stringify(FALLBACK_STATE.layers));
            activeLayerId = FALLBACK_STATE.activeLayerId;
        } else {
            layers = JSON.parse(JSON.stringify(state.layers));
            activeLayerId = state.activeLayerId;
        }
        ensureActiveLayer();
        renderLayerOptions();
        notifyLayerChange(previous, activeLayerId);
    }

    function getActiveLayerId() {
        ensureActiveLayer();
        return activeLayerId;
    }

    function onLayerChange(callback) {
        if (typeof callback === 'function') {
            layerChangeCallbacks.push(callback);
        }
    }

    function onLayerStructureChange(callback) {
        if (typeof callback === 'function') {
            layerStructureChangeCallbacks.push(callback);
        }
    }

    window.initLayerTools = initLayerTools;
    window.getLayerState = getLayerState;
    window.applyLayerState = applyLayerState;
    window.getActiveLayerId = getActiveLayerId;
    window.onLayerChange = onLayerChange;
    window.onLayerStructureChange = onLayerStructureChange;
})();

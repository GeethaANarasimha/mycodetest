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
    const layerChangeCallbacks = [];

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
        const prev = activeLayerId;
        activeLayerId = id;
        notifyLayerChange(prev, activeLayerId);
    function setActiveLayer(id) {
        if (!layers.some(layer => layer.id === id)) return;
        activeLayerId = id;
    }

    function addLayer(name) {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const newLayer = {
            id: generateLayerId(trimmed),
            name: trimmed
        };
        layers.push(newLayer);
        setActiveLayer(newLayer.id);
        renderLayerOptions();
        return true;
    }

    function handleAddLayerClick() {
        const defaultName = nextSuggestedName();
        const name = window.prompt('Enter the name for the new layer', defaultName);
        if (!name) return;
        addLayer(name);
    }

    function initLayerTools() {
        layerSelect = document.getElementById('layerSelect');
        addLayerButton = document.getElementById('addLayerButton');
        if (!layerSelect || !addLayerButton) return;

        renderLayerOptions();
        layerSelect.addEventListener('change', (event) => setActiveLayer(event.target.value));
        addLayerButton.addEventListener('click', handleAddLayerClick);
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

    window.initLayerTools = initLayerTools;
    window.getLayerState = getLayerState;
    window.applyLayerState = applyLayerState;
    window.getActiveLayerId = getActiveLayerId;
    window.onLayerChange = onLayerChange;
})();

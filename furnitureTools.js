// furnitureTools.js
// Provides a picker modal for furniture assets and exposes helpers for rendering
// and retrieving the currently selected furniture option.

const furnitureAssets = [
    {
        id: 'compass',
        label: 'Compass',
        url: 'https://static.wixstatic.com/shapes/602ad4_01883b56223945f6a9fdc9a7ef049641.svg',
        defaultWidth: 80,
        defaultHeight: 80
    },
    {
        id: 'sofa',
        label: 'Sofa',
        url: 'https://static.wixstatic.com/shapes/602ad4_a13b8462cf634e6093dd6755c345d847.svg',
        defaultWidth: 160,
        defaultHeight: 90
    },
    {
        id: 'chair',
        label: 'Chair',
        url: 'https://static.wixstatic.com/shapes/602ad4_22e5233e8dff41c8aee4f1eb8b6004b1.svg',
        defaultWidth: 90,
        defaultHeight: 90
    }
];

let activeFurnitureId = furnitureAssets[0]?.id || null;
const furnitureImages = new Map();

function ensureFurnitureAssetImage(asset) {
    if (!asset || !asset.url) return null;
    if (furnitureImages.has(asset.id)) return furnitureImages.get(asset.id);

    const img = new Image();
    img.src = asset.url;
    furnitureImages.set(asset.id, img);
    return img;
}

function getActiveFurnitureAsset() {
    return furnitureAssets.find(asset => asset.id === activeFurnitureId) || furnitureAssets[0] || null;
}

function getFurnitureAssetById(id) {
    return furnitureAssets.find(asset => asset.id === id) || null;
}

function setActiveFurnitureAsset(id) {
    const exists = furnitureAssets.some(asset => asset.id === id);
    if (exists) {
        activeFurnitureId = id;
    }
}

function highlightActiveFurniture(listEl) {
    if (!listEl) return;
    listEl.querySelectorAll('[data-furniture-id]').forEach(item => {
        item.classList.toggle('selected', item.getAttribute('data-furniture-id') === activeFurnitureId);
    });
}

function renderFurnitureList(listEl, onSelect) {
    if (!listEl) return;
    listEl.innerHTML = '';

    furnitureAssets.forEach(asset => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'furniture-card';
        card.setAttribute('data-furniture-id', asset.id);
        card.innerHTML = `
            <span class="furniture-thumb" role="presentation">
                <img src="${asset.url}" alt="" />
            </span>
            <span class="furniture-meta">
                <span class="furniture-name">${asset.label}</span>
                <span class="furniture-size">Default ${Math.round(asset.defaultWidth)}×${Math.round(asset.defaultHeight)} px</span>
            </span>
        `;

        card.addEventListener('click', () => {
            setActiveFurnitureAsset(asset.id);
            highlightActiveFurniture(listEl);
            if (typeof onSelect === 'function') {
                onSelect(asset);
            }
        });

        listEl.appendChild(card);
    });

    highlightActiveFurniture(listEl);
}

function initFurniturePalette({ modal, listElement, closeButton, triggerButton, onSelect }) {
    if (!modal || !listElement) return;

    const closeModal = () => modal.classList.add('hidden');
    const openModal = () => {
        modal.classList.remove('hidden');
        highlightActiveFurniture(listElement);
    };

    renderFurnitureList(listElement, (asset) => {
        if (typeof onSelect === 'function') {
            onSelect(asset);
        }
        closeModal();
    });

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (triggerButton) {
        triggerButton.addEventListener('click', () => {
            openModal();
        });
    }

    // Expose helpers globally for the canvas renderer.
    window.getActiveFurnitureAsset = getActiveFurnitureAsset;
    window.ensureFurnitureAssetImage = ensureFurnitureAssetImage;
}

window.initFurniturePalette = initFurniturePalette;
window.getActiveFurnitureAsset = getActiveFurnitureAsset;
window.ensureFurnitureAssetImage = ensureFurnitureAssetImage;
window.setActiveFurnitureAsset = setActiveFurnitureAsset;
window.getFurnitureAssetById = getFurnitureAssetById;

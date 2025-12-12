// furnitureTools.js
// Provides a picker modal for furniture assets and exposes helpers for rendering
// and retrieving the currently selected furniture option.

const furnitureAssets = [
    {
        id: 'sofa-big',
        label: 'Sofa (3-Seater)',
        url: 'https://static.wixstatic.com/shapes/602ad4_87cdd4b100414107be945a2486704ece.svg',
        defaultWidth: 220,
        defaultHeight: 110
    },
    {
        id: 'sofa-single',
        label: 'Sofa (Single)',
        url: 'https://static.wixstatic.com/shapes/602ad4_92b675eadc774d52becdf3f28a7f251a.svg',
        defaultWidth: 110,
        defaultHeight: 110
    },
    {
        id: 'coffee-table',
        label: 'Coffee Table',
        url: 'https://static.wixstatic.com/shapes/602ad4_7167ed82c6a846b4a7118b8c9590d12e.svg',
        defaultWidth: 140,
        defaultHeight: 90
    },
    {
        id: 'compass',
        label: 'Compass',
        url: 'https://static.wixstatic.com/shapes/602ad4_4edfab7e9f0945febe2a2f645a4a2649.svg',
        defaultWidth: 80,
        defaultHeight: 80
    },
    {
        id: 'sink',
        label: 'Sink',
        url: 'https://static.wixstatic.com/shapes/602ad4_1754d04678dd4fb593dbf6ec2e5ad17b.svg',
        defaultWidth: 130,
        defaultHeight: 90
    },
    {
        id: 'kitchen-cabinet',
        label: 'Kitchen Cabinet',
        url: 'https://static.wixstatic.com/shapes/602ad4_8d8ac4763683490e8301be89d545e812.svg',
        defaultWidth: 170,
        defaultHeight: 80
    },
    {
        id: 'sink-double',
        label: 'Sink (Double)',
        url: 'https://static.wixstatic.com/shapes/602ad4_1e8cd195316d4df495f0fa2c9784eece.svg',
        defaultWidth: 170,
        defaultHeight: 90
    },
    {
        id: 'stove',
        label: 'Stove',
        url: 'https://static.wixstatic.com/shapes/602ad4_7de2eec0012e4d82b5f9cdf21e17ab1b.svg',
        defaultWidth: 140,
        defaultHeight: 90
    },
    {
        id: 'double-sink-drain',
        label: 'Double Sink with Drain',
        url: 'https://static.wixstatic.com/shapes/602ad4_a10cb457f6584626943b29e1a5dab3b2.svg',
        defaultWidth: 190,
        defaultHeight: 90
    },
    {
        id: 'chimney',
        label: 'Chimney',
        url: 'https://static.wixstatic.com/shapes/602ad4_fb85e21bba9f4ae7ae9bec08a20a9759.svg',
        defaultWidth: 120,
        defaultHeight: 120
    },
    {
        id: 'plant-1',
        label: 'Plant 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_89b5f3a87e5a457f9d9d56c18e04fa07.svg',
        defaultWidth: 90,
        defaultHeight: 90
    },
    {
        id: 'plant-2',
        label: 'Plant 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_e7003921164348dfa09ddad83e75f193.svg',
        defaultWidth: 90,
        defaultHeight: 90
    },
    {
        id: 'plant-3',
        label: 'Plant 3',
        url: 'https://static.wixstatic.com/shapes/602ad4_14563be8b2ea4736a3953920394f1f0d.svg',
        defaultWidth: 90,
        defaultHeight: 90
    },
    {
        id: 'plant-4',
        label: 'Plant 4',
        url: 'https://static.wixstatic.com/shapes/602ad4_bcfc972f75514a7f9824e6388ec73cb0.svg',
        defaultWidth: 90,
        defaultHeight: 90
    },
    {
        id: 'refrigerator',
        label: 'Refrigerator',
        url: 'https://static.wixstatic.com/shapes/602ad4_a6341dd716ab46948257d5f033650a3e.svg',
        defaultWidth: 110,
        defaultHeight: 130
    },
    {
        id: 'dishwasher',
        label: 'Dishwasher',
        url: 'https://static.wixstatic.com/shapes/602ad4_afa7a9e2a44b40cdbe2847500c0d99dc.svg',
        defaultWidth: 110,
        defaultHeight: 120
    },
    {
        id: 'dining-table-4',
        label: 'Dining Table (4 Seater)',
        url: 'https://static.wixstatic.com/shapes/602ad4_96f3474b94014099b52630e1fe1fc0bd.svg',
        defaultWidth: 190,
        defaultHeight: 120
    },
    {
        id: 'training-table-6',
        label: 'Training Table (6 Seater)',
        url: 'https://static.wixstatic.com/shapes/602ad4_5b5027fe68ac45448c2782f9246107d7.svg',
        defaultWidth: 220,
        defaultHeight: 120
    },
    {
        id: 'dining-table',
        label: 'Dining Table',
        url: 'https://static.wixstatic.com/shapes/602ad4_29b0f96c93b44d5fab6e085ef340cbd6.svg',
        defaultWidth: 200,
        defaultHeight: 120
    },
    {
        id: 'washing-machine-1',
        label: 'Washing Machine 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_c97c3d855b0a4acfaa0cef63ae4b3fd4.svg',
        defaultWidth: 110,
        defaultHeight: 120
    },
    {
        id: 'washing-machine-2',
        label: 'Washing Machine 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_bf03cfaf215c4173a0aec831575a8c20.svg',
        defaultWidth: 110,
        defaultHeight: 120
    },
    {
        id: 'tv-stand',
        label: 'TV with Stand',
        url: 'https://static.wixstatic.com/shapes/602ad4_e4dd2378763646b594dad5dbf781334b.svg',
        defaultWidth: 190,
        defaultHeight: 90
    },
    {
        id: 'tv-1',
        label: 'TV 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_e4dd2378763646b594dad5dbf781334b.svg',
        defaultWidth: 160,
        defaultHeight: 90
    },
    {
        id: 'tv-2',
        label: 'TV 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_00a73b1c52df4c9b997fd137c610ee17.svg',
        defaultWidth: 160,
        defaultHeight: 90
    },
    {
        id: 'footmat-1',
        label: 'Footmat 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_2d856418a63c4cfdbcc2a7e4c47fa717.svg',
        defaultWidth: 120,
        defaultHeight: 70
    },
    {
        id: 'footmat-2',
        label: 'Footmat 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_a45b127ec3c2434da18c656244d88fdf.svg',
        defaultWidth: 120,
        defaultHeight: 70
    },
    {
        id: 'toilet-basin-1',
        label: 'Toilet Basin 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_45c54c6e47504a0fb8b2a7b435c5eda6.svg',
        defaultWidth: 90,
        defaultHeight: 140
    },
    {
        id: 'toilet-basin-2',
        label: 'Toilet Basin 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_b0e2ad478f23460bb97129af0fba0a29.svg',
        defaultWidth: 90,
        defaultHeight: 140
    },
    {
        id: 'toilet-indian',
        label: 'Indian Toilet',
        url: 'https://static.wixstatic.com/shapes/602ad4_269fd351c1c9419ba9d2fc125f1f8243.svg',
        defaultWidth: 110,
        defaultHeight: 140
    },
    {
        id: 'tap',
        label: 'Tap',
        url: 'https://static.wixstatic.com/shapes/602ad4_c4d55bf69d4b45a7bee2f81f990ac5f1.svg',
        defaultWidth: 80,
        defaultHeight: 80
    },
    {
        id: 'shower',
        label: 'Shower',
        url: 'https://static.wixstatic.com/shapes/602ad4_26cfa01a531f4c089927cfc2441cd67d.svg',
        defaultWidth: 90,
        defaultHeight: 90
    },
    {
        id: 'double-bed-1',
        label: 'Double Bed 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_3442726e993b4988b34974c8ce636c71.svg',
        defaultWidth: 220,
        defaultHeight: 220
    },
    {
        id: 'double-bed-2',
        label: 'Double Bed 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_5db40d0fa6e44d99aeecf19e6f0b2ada.svg',
        defaultWidth: 220,
        defaultHeight: 220
    },
    {
        id: 'single-bed-1',
        label: 'Single Bed 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_a575135195e74399b53f05e786b99f08.svg',
        defaultWidth: 130,
        defaultHeight: 220
    },
    {
        id: 'single-bed-2',
        label: 'Single Bed 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_ab59d84ae54b48b985233816f923b235.svg',
        defaultWidth: 130,
        defaultHeight: 220
    },
    {
        id: 'single-bed-3',
        label: 'Single Bed 3',
        url: 'https://static.wixstatic.com/shapes/602ad4_47a1aadd80974448a0903773f19b8368.svg',
        defaultWidth: 130,
        defaultHeight: 220
    },
    {
        id: 'wardrobe-1',
        label: 'Wardrobe 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_20e01d52f508485f834518d5316017e1.svg',
        defaultWidth: 170,
        defaultHeight: 70
    },
    {
        id: 'wardrobe-2',
        label: 'Wardrobe 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_fbc7a528396b42a996f9ca2794e2d3d5.svg',
        defaultWidth: 170,
        defaultHeight: 70
    },
    {
        id: 'study-table-1',
        label: 'Study Table 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_93a400c5b6f44103b2ce2224489bfb43.svg',
        defaultWidth: 170,
        defaultHeight: 90
    },
    {
        id: 'study-table-2',
        label: 'Study Table 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_6609402cc4044a6f84a3a79546769c23.svg',
        defaultWidth: 170,
        defaultHeight: 90
    },
    {
        id: 'study-table-chair-1',
        label: 'Study Table with Chair',
        url: 'https://static.wixstatic.com/shapes/602ad4_bcc2aa91509a4fc0b20b24beb46ffb2e.svg',
        defaultWidth: 180,
        defaultHeight: 100
    },
    {
        id: 'office-table',
        label: 'Office Table',
        url: 'https://static.wixstatic.com/shapes/602ad4_8df994d1050b47f6b6ebc1dfb403f935.svg',
        defaultWidth: 180,
        defaultHeight: 90
    },
    {
        id: 'pooja-room-1',
        label: 'Pooja Room 1',
        url: 'https://static.wixstatic.com/shapes/602ad4_3b0a7cffca1d43aea0a1cd07edb9aee2.svg',
        defaultWidth: 130,
        defaultHeight: 130
    },
    {
        id: 'pooja-room-2',
        label: 'Pooja Room 2',
        url: 'https://static.wixstatic.com/shapes/602ad4_cb27a62bd3204d2ea7a5a17e32d12d5b.svg',
        defaultWidth: 130,
        defaultHeight: 130
    },
    {
        id: 'water-tank-circular',
        label: 'Water Tank (Circular)',
        url: 'https://static.wixstatic.com/shapes/602ad4_faca21151fd1442b838092aa08417bd2.svg',
        defaultWidth: 150,
        defaultHeight: 150
    },
    {
        id: 'gas-cylinder',
        label: 'Gas Cylinder',
        url: 'https://static.wixstatic.com/shapes/602ad4_176dae04a0154a7b86c113411e92a02e.svg',
        defaultWidth: 90,
        defaultHeight: 140
    },
    {
        id: 'solar-panel',
        label: 'Solar Panel',
        url: 'https://static.wixstatic.com/shapes/602ad4_2ed8837c96d645d59fdb7888df3f1cb6.svg',
        defaultWidth: 220,
        defaultHeight: 130
    }
];

let activeFurnitureId = furnitureAssets[0]?.id || null;
const furnitureImages = new Map();

function ensureFurnitureAssetImage(asset) {
    if (!asset || !asset.url) return null;
    if (furnitureImages.has(asset.id)) return furnitureImages.get(asset.id);

    const img = typeof createSafeImageElement === 'function'
        ? createSafeImageElement(asset.url)
        : (() => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.referrerPolicy = 'no-referrer';
            image.src = asset.url;
            return image;
        })();
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

function renderFurnitureList(listEl, onSelect, onAdd, closeModal, filterText = '') {
    if (!listEl) return;
    listEl.innerHTML = '';

    const filter = filterText.trim().toLowerCase();

    furnitureAssets
        .filter(asset => asset.label.toLowerCase().includes(filter))
        .forEach(asset => {
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
            </span>
        `;

        card.addEventListener('click', () => {
            setActiveFurnitureAsset(asset.id);
            highlightActiveFurniture(listEl);
            if (typeof onSelect === 'function') {
                onSelect(asset);
            }
            if (typeof onAdd === 'function') {
                onAdd(asset);
            }
            if (typeof closeModal === 'function') {
                closeModal();
            }
        });

        listEl.appendChild(card);
        });

    highlightActiveFurniture(listEl);
}

function initFurniturePalette({ modal, listElement, closeButton, triggerButton, searchInput, onSelect, onAdd }) {
    if (!modal || !listElement) return;

    const closeModal = () => modal.classList.add('hidden');
    const openModal = () => {
        modal.classList.remove('hidden');
        if (searchInput) {
            searchInput.value = '';
        }
        renderFurnitureList(listElement, onSelect, onAdd, closeModal, '');
    };

    renderFurnitureList(listElement, (asset) => {
        if (typeof onSelect === 'function') {
            onSelect(asset);
        }
    }, onAdd, closeModal);

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (triggerButton) {
        triggerButton.addEventListener('click', () => {
            openModal();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            renderFurnitureList(listElement, onSelect, onAdd, closeModal, event.target.value || '');
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

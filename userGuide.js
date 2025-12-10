(function () {
    const guideItems = [
        {
            name: 'Select',
            icon: 'https://static.wixstatic.com/shapes/602ad4_e8cd6441615c4fd39976a3812469b223.svg',
            shortcut: 'V',
            description: 'Pick, move, and resize anything already on the canvas.',
            keywords: ['move', 'drag', 'edit', 'select']
        },
        {
            name: 'Wall',
            icon: 'https://static.wixstatic.com/shapes/602ad4_38c6c46a65fd49a783dfbfd974740b0a.svg',
            shortcut: 'W',
            description: 'Draw straight walls that snap to the grid for quick layouts.',
            keywords: ['structure', 'layout', 'grid']
        },
        {
            name: 'Pan',
            icon: 'https://static.wixstatic.com/shapes/602ad4_7fd823218d7b425593c311435c84c9bf.svg',
            shortcut: 'Space',
            description: 'Slide the view without affecting your drawing.',
            keywords: ['move view', 'navigation', 'scroll']
        },
        {
            name: 'Door',
            icon: 'https://static.wixstatic.com/shapes/602ad4_735e93c7dd2a4ef9969fb3bf1094e1b7.svg',
            shortcut: 'D',
            description: 'Place hinged or sliding doors with a preset width.',
            keywords: ['entry', 'swing', 'opening']
        },
        {
            name: 'Window',
            icon: 'https://static.wixstatic.com/shapes/602ad4_0a3b507cf3fc427eaab066301a920e5c.svg',
            shortcut: 'Shift + W',
            description: 'Add windows along a wall and keep their widths consistent.',
            keywords: ['ventilation', 'opening', 'glass']
        },
        {
            name: 'Staircase',
            icon: 'https://static.wixstatic.com/shapes/602ad4_0f8bb41d89fe42488e1352df56340e45.svg',
            shortcut: 'S',
            description: 'Lay out straight or landing stair flights with custom steps.',
            keywords: ['steps', 'stairs', 'rise']
        },
        {
            name: 'Furniture',
            icon: 'https://static.wixstatic.com/shapes/602ad4_7ad998836ddb4a5ead990a30f61fda01.svg',
            shortcut: 'F',
            description: 'Drop in beds, sofas, and other fixtures for context.',
            keywords: ['fixtures', 'layout', 'sofa']
        },
        {
            name: 'Floor Fill',
            icon: 'https://static.wixstatic.com/shapes/602ad4_3c3ccac3849f432ab3f23ea24547af8c.svg',
            shortcut: 'G',
            description: 'Apply a fill texture or color to enclosed floor areas.',
            keywords: ['tile', 'area', 'paint']
        },
        {
            name: 'Erase',
            icon: 'https://static.wixstatic.com/shapes/602ad4_e9f15f1981cc43afbf920fdbc9bda6ba.svg',
            shortcut: 'Backspace',
            description: 'Remove misplaced segments, doors, or furniture items.',
            keywords: ['delete', 'remove', 'undo']
        },
        {
            name: 'Dimension',
            icon: 'https://static.wixstatic.com/shapes/602ad4_30f8437bfae148a38aca059207dc1ce2.svg',
            shortcut: 'M',
            description: 'Add measurement callouts to highlight wall lengths.',
            keywords: ['measure', 'length', 'annotation']
        },
        {
            name: 'Direct Line',
            icon: 'https://static.wixstatic.com/shapes/602ad4_407956fc7daf45d3803b4db9869a74e2.svg',
            shortcut: 'L',
            description: 'Draw free-standing guide lines for quick references.',
            keywords: ['line', 'guide', 'reference']
        },
        {
            name: 'Settings',
            icon: 'https://static.wixstatic.com/shapes/602ad4_91139ebc0ad44fe38aad272fdbee8d06.svg',
            shortcut: 'Ctrl + ,',
            description: 'Open drawing preferences for grid size and visibility.',
            keywords: ['preferences', 'grid', 'snap']
        },
        {
            name: 'Text',
            icon: '',
            shortcut: 'T',
            description: 'Label rooms or add notes directly on the plan.',
            keywords: ['label', 'note', 'annotation']
        },
        {
            name: 'Rotate Left',
            icon: 'https://static.wixstatic.com/shapes/602ad4_74c75a751d214630a1839c167822df96.svg',
            shortcut: 'Ctrl + [',
            description: 'Rotate the selected item 15° to the left.',
            keywords: ['transform', 'spin', 'left']
        },
        {
            name: 'Rotate Right',
            icon: 'https://static.wixstatic.com/shapes/602ad4_74c75a751d214630a1839c167822df96.svg',
            shortcut: 'Ctrl + ]',
            description: 'Rotate the selected item 15° to the right.',
            keywords: ['transform', 'spin', 'right']
        },
        {
            name: 'Flip Horizontal',
            icon: 'https://static.wixstatic.com/shapes/602ad4_b6a1fcb25d8743448091bf5d741f9eb1.svg',
            shortcut: 'H',
            description: 'Mirror the selection horizontally for quick reversals.',
            keywords: ['mirror', 'horizontal', 'transform']
        },
        {
            name: 'Flip Vertical',
            icon: 'https://static.wixstatic.com/shapes/602ad4_590fe3b2279c4af9871b4cd3575104e4.svg',
            shortcut: 'Shift + V',
            description: 'Mirror the selection vertically when you need the opposite swing.',
            keywords: ['mirror', 'vertical', 'transform']
        },
        {
            name: 'Zoom In',
            icon: '',
            shortcut: '+',
            description: 'Zoom closer to inspect details.',
            keywords: ['view', 'scale', 'magnify']
        },
        {
            name: 'Zoom Out',
            icon: '',
            shortcut: '-',
            description: 'Zoom out to see the full floor plan.',
            keywords: ['view', 'scale', 'overview']
        },
        {
            name: 'Save Project',
            icon: '',
            shortcut: 'Ctrl + S',
            description: 'Download the current layout as a project file.',
            keywords: ['save', 'export', 'download']
        },
        {
            name: 'Upload Project',
            icon: '',
            shortcut: 'Ctrl + O',
            description: 'Load an existing project from your computer.',
            keywords: ['import', 'open', 'load']
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('userGuideModal');
        const openGuideButton = document.getElementById('openUserGuide');
        const closeGuideButton = document.getElementById('closeUserGuide');
        const userGuideList = document.getElementById('userGuideList');
        const searchInput = document.getElementById('userGuideSearch');
        const shortcutStatus = document.getElementById('shortcutStatus');

        if (!modal || !openGuideButton || !closeGuideButton || !userGuideList || !searchInput) {
            return;
        }

        function openModal() {
            modal.classList.remove('hidden');
            searchInput.focus();
            renderList(searchInput.value);
        }

        function closeModal() {
            modal.classList.add('hidden');
            shortcutStatus.textContent = '';
        }

        function renderList(filterText = '') {
            const query = filterText.trim().toLowerCase();
            userGuideList.innerHTML = '';

            const matches = guideItems.filter((item) => {
                if (!query) return true;
                const haystack = [
                    item.name,
                    item.description,
                    item.shortcut,
                    ...(item.keywords || [])
                ]
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            });

            if (!matches.length) {
                const emptyState = document.createElement('p');
                emptyState.className = 'tool-guide-description';
                emptyState.textContent = 'No tools matched that keyword. Try a different term.';
                userGuideList.appendChild(emptyState);
                return;
            }

            matches.forEach((item) => {
                userGuideList.appendChild(buildCard(item));
            });
        }

        function buildCard(item) {
            const card = document.createElement('article');
            card.className = 'tool-guide-card';

            const header = document.createElement('div');
            header.className = 'tool-guide-header';

            if (item.icon) {
                const icon = document.createElement('img');
                icon.className = 'tool-icon';
                icon.src = item.icon;
                icon.alt = `${item.name} icon`;
                header.appendChild(icon);
            }

            const title = document.createElement('h4');
            title.className = 'tool-guide-title';
            title.textContent = item.name;
            header.appendChild(title);

            const description = document.createElement('p');
            description.className = 'tool-guide-description';
            description.textContent = item.description;

            const shortcutButton = document.createElement('button');
            shortcutButton.type = 'button';
            shortcutButton.className = 'shortcut-btn';
            shortcutButton.textContent = item.shortcut;
            shortcutButton.addEventListener('click', () => {
                simulateShortcut(item.shortcut);
                shortcutStatus.textContent = `${item.name} shortcut (${item.shortcut}) activated.`;
            });

            card.appendChild(header);
            card.appendChild(description);
            card.appendChild(shortcutButton);

            return card;
        }

        function simulateShortcut(shortcutLabel) {
            const parts = shortcutLabel.split('+').map((part) => part.trim().toLowerCase());
            const key = parts.pop();

            const eventInit = {
                key,
                ctrlKey: parts.includes('ctrl'),
                shiftKey: parts.includes('shift'),
                altKey: parts.includes('alt'),
                metaKey: parts.includes('cmd') || parts.includes('meta'),
                bubbles: true
            };

            document.dispatchEvent(new KeyboardEvent('keydown', eventInit));
            document.dispatchEvent(new KeyboardEvent('keyup', eventInit));
        }

        openGuideButton.addEventListener('click', openModal);
        closeGuideButton.addEventListener('click', closeModal);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        searchInput.addEventListener('input', (event) => {
            renderList(event.target.value);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    });
})();

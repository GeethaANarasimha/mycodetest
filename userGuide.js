(function () {
    const guideItems = [
        {
            name: 'Select',
            icon: 'https://static.wixstatic.com/shapes/602ad4_e8cd6441615c4fd39976a3812469b223.svg',
            description: 'Pick, move, and resize anything already on the canvas while keeping alignment tight.',
            details: [
                'Drag from empty space to box-select multiple items.',
                'Use handles that appear on corners to scale objects evenly.',
                'Single-click toggles between moving and rotating grip modes for supported objects.'
            ],
            keywords: ['move', 'drag', 'edit', 'select']
        },
        {
            name: 'Wall',
            icon: 'https://static.wixstatic.com/shapes/602ad4_38c6c46a65fd49a783dfbfd974740b0a.svg',
            description: 'Draw straight walls that snap to the grid for quick layouts.',
            details: [
                'Click once to start, click again to finish, and double-click to end a chain.',
                'Change wall thickness in the Properties panel before placing segments.',
                'Use layer visibility to keep multi-floor outlines organized.'
            ],
            keywords: ['structure', 'layout', 'grid']
        },
        {
            name: 'Pan',
            icon: 'https://static.wixstatic.com/shapes/602ad4_7fd823218d7b425593c311435c84c9bf.svg',
            description: 'Slide the view without affecting your drawing.',
            details: [
                'Hold the mouse button down to move the canvas in any direction.',
                'Combine with zoom controls to position the view before drawing.',
                'Use for large plans to avoid accidental edits while navigating.'
            ],
            keywords: ['move view', 'navigation', 'scroll']
        },
        {
            name: 'Door',
            icon: 'https://static.wixstatic.com/shapes/602ad4_735e93c7dd2a4ef9969fb3bf1094e1b7.svg',
            description: 'Place hinged or sliding doors with a preset width.',
            details: [
                'Select a door type from the dropdown before placing to size it correctly.',
                'Doors auto-align to walls; hover near a wall edge to preview the swing.',
                'Rotate doors after placement to flip the swing direction.'
            ],
            keywords: ['entry', 'swing', 'opening']
        },
        {
            name: 'Window',
            icon: 'https://static.wixstatic.com/shapes/602ad4_0a3b507cf3fc427eaab066301a920e5c.svg',
            description: 'Add windows along a wall and keep their widths consistent.',
            details: [
                'Place windows after walls to keep spacing aligned.',
                'Adjust line weight to emphasize window trims in printouts.',
                'Evenly distribute a row by duplicating a window and moving it along the wall.'
            ],
            keywords: ['ventilation', 'opening', 'glass']
        },
        {
            name: 'Staircase',
            icon: 'https://static.wixstatic.com/shapes/602ad4_0f8bb41d89fe42488e1352df56340e45.svg',
            description: 'Lay out straight or landing stair flights with custom steps.',
            details: [
                'Place stairs with enough clearance by checking nearby walls.',
                'Use rotate controls after placement to orient the staircase.',
                'Combine with text labels to mark up direction and floor changes.'
            ],
            keywords: ['steps', 'stairs', 'rise']
        },
        {
            name: 'Furniture',
            icon: 'https://static.wixstatic.com/shapes/602ad4_7ad998836ddb4a5ead990a30f61fda01.svg',
            description: 'Drop in beds, sofas, and other fixtures for context.',
            details: [
                'Rotate furniture to match the room’s orientation before fine positioning.',
                'Duplicate commonly used pieces to speed up room staging.',
                'Use lighter line colors for fixtures so structural elements stay bold.'
            ],
            keywords: ['fixtures', 'layout', 'sofa']
        },
        {
            name: 'Floor Fill',
            icon: 'https://static.wixstatic.com/shapes/602ad4_3c3ccac3849f432ab3f23ea24547af8c.svg',
            description: 'Apply a fill texture or color to enclosed floor areas.',
            details: [
                'Pick fill colors that contrast walls for quick visual separation.',
                'Use separate layers per floor to keep fills from overlapping.',
                'Update fills after adjusting walls to maintain coverage.'
            ],
            keywords: ['tile', 'area', 'paint']
        },
        {
            name: 'Erase',
            icon: 'https://static.wixstatic.com/shapes/602ad4_e9f15f1981cc43afbf920fdbc9bda6ba.svg',
            description: 'Remove misplaced segments, doors, or furniture items.',
            details: [
                'Click an item once to highlight it, then erase to remove cleanly.',
                'Trim small mistakes by zooming in before erasing.',
                'Erase fills before removing the surrounding walls to avoid gaps.'
            ],
            keywords: ['delete', 'remove', 'undo']
        },
        {
            name: 'Dimension',
            icon: 'https://static.wixstatic.com/shapes/602ad4_30f8437bfae148a38aca059207dc1ce2.svg',
            description: 'Add measurement callouts to highlight wall lengths.',
            details: [
                'Place dimensions after walls to keep annotations attached.',
                'Increase measurement font size for print-readiness in the Properties panel.',
                'Use dimensions sparingly to keep crowded layouts readable.'
            ],
            keywords: ['measure', 'length', 'annotation']
        },
        {
            name: 'Direct Line',
            icon: 'https://static.wixstatic.com/shapes/602ad4_407956fc7daf45d3803b4db9869a74e2.svg',
            description: 'Draw free-standing guide lines for quick references.',
            details: [
                'Use guide lines to plan furniture alignments before committing walls.',
                'Change line width or color to distinguish guides from structural lines.',
                'Delete guides when finished to keep the drawing clean.'
            ],
            keywords: ['line', 'guide', 'reference']
        },
        {
            name: 'Settings',
            icon: 'https://static.wixstatic.com/shapes/602ad4_91139ebc0ad44fe38aad272fdbee8d06.svg',
            description: 'Open drawing preferences for grid size and visibility.',
            details: [
                'Adjust grid size to match your desired scaling in the Properties panel.',
                'Toggle dimension visibility to declutter screenshots.',
                'Great starting point before drafting to set snapping behavior.'
            ],
            keywords: ['preferences', 'grid', 'snap']
        },
        {
            name: 'Text',
            icon: '',
            description: 'Label rooms or add notes directly on the plan.',
            details: [
                'Open the Text modal to enter the label, then place it on the canvas.',
                'Use the bold and italic toggles in Properties to emphasize headings.',
                'Change text color to make titles stand out against fills.'
            ],
            keywords: ['label', 'note', 'annotation']
        },
        {
            name: 'Rotate Left',
            icon: 'https://static.wixstatic.com/shapes/602ad4_74c75a751d214630a1839c167822df96.svg',
            description: 'Rotate the selected item 15° to the left.',
            details: [
                'Use after placing doors or furniture to fine-tune orientation.',
                'Combine with Flip controls to mirror and rotate in one step.',
                'Great for angled staircases or corner sofas.'
            ],
            keywords: ['transform', 'spin', 'left']
        },
        {
            name: 'Rotate Right',
            icon: 'https://static.wixstatic.com/shapes/602ad4_74c75a751d214630a1839c167822df96.svg',
            description: 'Rotate the selected item 15° to the right.',
            details: [
                'Tap repeatedly for precise angles without dragging.',
                'Pair with Zoom In to make micro-adjustments.',
                'Use to orient annotation arrows or angled fixtures.'
            ],
            keywords: ['transform', 'spin', 'right']
        },
        {
            name: 'Flip Horizontal',
            icon: 'https://static.wixstatic.com/shapes/602ad4_b6a1fcb25d8743448091bf5d741f9eb1.svg',
            description: 'Mirror the selection horizontally for quick reversals.',
            details: [
                'Flip to swap door swings without redrawing.',
                'Useful when testing mirrored room layouts.',
                'Apply after rotating to match exact orientations.'
            ],
            keywords: ['mirror', 'horizontal', 'transform']
        },
        {
            name: 'Flip Vertical',
            icon: 'https://static.wixstatic.com/shapes/602ad4_590fe3b2279c4af9871b4cd3575104e4.svg',
            description: 'Mirror the selection vertically when you need the opposite swing.',
            details: [
                'Quickly flip stair directions or tall furniture.',
                'Combine with Rotate to get diagonally mirrored placements.',
                'Use with guide lines to keep mirrored layouts aligned.'
            ],
            keywords: ['mirror', 'vertical', 'transform']
        },
        {
            name: 'Zoom In',
            icon: '',
            description: 'Zoom closer to inspect details.',
            details: [
                'Great for tight edits like window alignment or text placement.',
                'Pair with Pan to reach distant parts of large plans.',
                'Use before placing dimensions to avoid overlaps.'
            ],
            keywords: ['view', 'scale', 'magnify']
        },
        {
            name: 'Zoom Out',
            icon: '',
            description: 'Zoom out to see the full floor plan.',
            details: [
                'Check overall proportions after making detailed edits.',
                'Helpful before exporting or taking screenshots.',
                'Use to ensure annotations stay readable from afar.'
            ],
            keywords: ['view', 'scale', 'overview']
        },
        {
            name: 'Save Project',
            icon: '',
            description: 'Download the current layout as a project file.',
            details: [
                'Save regularly when trying new layouts to keep restore points.',
                'Name files per floor or version to track revisions.',
                'Confirm downloads in your browser if pop-up blockers are on.'
            ],
            keywords: ['save', 'export', 'download']
        },
        {
            name: 'Upload Project',
            icon: '',
            description: 'Load an existing project from your computer.',
            details: [
                'Use the Upload Project button to pick a saved .ipynb layout.',
                'Uploads replace the current canvas, so save first if needed.',
                'Great for collaborating—share files and reopen to continue work.'
            ],
            keywords: ['import', 'open', 'load']
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        const modal = document.getElementById('userGuideModal');
        const openGuideButton = document.getElementById('openUserGuide');
        const closeGuideButton = document.getElementById('closeUserGuide');
        const userGuideList = document.getElementById('userGuideList');
        const searchInput = document.getElementById('userGuideSearch');

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
        }

        function renderList(filterText = '') {
            const query = filterText.trim().toLowerCase();
            userGuideList.innerHTML = '';

            const matches = guideItems.filter((item) => {
                if (!query) return true;
                const haystack = [
                    item.name,
                    item.description,
                    ...(item.details || []),
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

            const detailsList = document.createElement('ul');
            detailsList.className = 'tool-guide-details';
            (item.details || []).forEach((note) => {
                const detail = document.createElement('li');
                detail.textContent = note;
                detailsList.appendChild(detail);
            });

            card.appendChild(header);
            card.appendChild(description);
            if (detailsList.childElementCount) {
                card.appendChild(detailsList);
            }

            return card;
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

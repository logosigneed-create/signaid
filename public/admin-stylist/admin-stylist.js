/**
 * AdminStylist.js
 * Un outil léger pour éditer dynamiquement le CSS d'un site.
 * Avec support du mode mobile (viewport simulé + media queries)
 */

const AdminStylist = (() => {
    let activeElement = null;
    let selectedElements = []; // Pour la sélection multiple
    let isInspectorActive = false;
    let history = [];
    let historyPointer = -1;
    let currentMode = 'desktop'; // 'desktop' ou 'mobile'
    let isRatioLocked = false;
    let aspectRatio = 1;

    const config = {
        serverUrl: 'http://localhost:3000/update-style',
        mobileBreakpoint: 768
    };

    const properties = [
        { id: 'width', label: 'Largeur', min: 0, max: 1200, unit: 'px', category: 'dimensions' },
        { id: 'height', label: 'Hauteur', min: 0, max: 1000, unit: 'px', category: 'dimensions' },
        { id: 'top', label: 'Haut', min: -500, max: 500, unit: 'px', category: 'position' },
        { id: 'left', label: 'Gauche', min: -500, max: 500, unit: 'px', category: 'position' },
        { id: 'padding', label: 'Marge interne', min: 0, max: 100, unit: 'px', category: 'style' },
        { id: 'margin', label: 'Marge externe', min: 0, max: 100, unit: 'px', category: 'style' },
        { id: 'fontSize', label: 'Taille police', min: 8, max: 72, unit: 'px', category: 'style' },
        { id: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.1, unit: '', category: 'style' }
    ];

    function init() {
        createUI();
        setupEvents();
        document.body.classList.add('as-active');
        console.log('AdminStylist initialisé.');
    }

    function createUI() {
        const panel = document.createElement('div');
        panel.id = 'admin-stylist-panel';
        panel.innerHTML = `
            <div class="as-header">
                <h2>AdminStylist</h2>
                <div class="as-header-actions">
                    <button id="as-toggle-inspector" class="as-btn as-btn-secondary" style="width: auto; padding: 4px 8px;">Inspecter</button>
                    <button id="as-minimize" class="as-btn-icon" title="Réduire">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="as-body">
                <!-- Mode Toggle -->
                <div class="as-section">
                    <h3>Mode d'édition</h3>
                    <div class="as-mode-toggle">
                        <button id="as-mode-desktop" class="as-mode-btn active" title="Ordinateur">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                <line x1="8" y1="21" x2="16" y2="21"/>
                                <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span>Desktop</span>
                        </button>
                        <button id="as-mode-mobile" class="as-mode-btn" title="Mobile">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                                <line x1="12" y1="18" x2="12.01" y2="18"/>
                            </svg>
                            <span>Mobile</span>
                        </button>
                    </div>
                    
                    <!-- Mobile Size Selector -->
                    <div id="as-mobile-sizes" class="as-mobile-sizes" style="display:none;">
                        <div class="as-size-presets">
                            <button class="as-size-btn" data-width="320" data-height="568">iPhone SE</button>
                            <button class="as-size-btn active" data-width="375" data-height="667">iPhone 8</button>
                            <button class="as-size-btn" data-width="390" data-height="844">iPhone 14</button>
                            <button class="as-size-btn" data-width="412" data-height="915">Android L</button>
                            <button class="as-size-btn" data-width="768" data-height="1024">iPad</button>
                        </div>
                        <div class="as-size-custom">
                            <label>Largeur: <span id="as-width-val">375</span>px</label>
                            <input type="range" id="as-width-slider" class="as-slider" min="280" max="1024" value="375">
                        </div>
                    </div>
                </div>

                <div id="as-selected-info" class="as-section">
                    <h3>Aucun élément sélectionné</h3>
                </div>
                
                <div id="as-controls" class="as-section" style="display:none;">
                    <h3>Contrôles <span id="as-mode-indicator" class="as-mode-indicator"></span></h3>
                    
                    <!-- DIMENSIONS SECTION -->
                    <div class="as-sub-section">
                        <h4>📏 Dimensions</h4>
                        ${properties.filter(p => p.category === 'dimensions').map(p => `
                            <div class="as-control-group">
                                <div class="as-label">
                                    <span>${p.label}</span>
                                    <span id="val-${p.id}" class="as-value">auto</span>
                                </div>
                                <input type="range" class="as-slider" id="range-${p.id}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="0">
                            </div>
                        `).join('')}
                        
                        <label class="as-toggle-label" style="width: 100%; margin-top: 8px;">
                            <input type="checkbox" id="as-toggle-ratio">
                            <span class="as-toggle-switch"></span>
                            Garder les proportions (Ratio)
                        </label>
                    </div>

                    <!-- POSITION SECTION -->
                    <div class="as-sub-section">
                        <h4>📍 Position & Alignement</h4>
                        <div class="as-control-row">
                            <button id="as-center-h" class="as-action-btn" title="Centrer horizontalement">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><polyline points="6 9 12 3 18 9"/><polyline points="6 15 12 21 18 15"/></svg>
                                H
                            </button>
                            <button id="as-center-v" class="as-action-btn" title="Centrer verticalement">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><polyline points="9 6 3 12 9 18"/><polyline points="15 6 21 12 15 18"/></svg>
                                V
                            </button>
                        </div>
                        <div class="as-control-row">
                            <label class="as-toggle-label">
                                <input type="checkbox" id="as-toggle-fixed">
                                <span class="as-toggle-switch"></span>
                                Fixe
                            </label>
                            <label class="as-toggle-label">
                                <input type="checkbox" id="as-toggle-absolute">
                                <span class="as-toggle-switch"></span>
                                Libéré
                            </label>
                        </div>
                        
                        ${properties.filter(p => p.category === 'position').map(p => `
                            <div class="as-control-group">
                                <div class="as-label">
                                    <span>${p.label}</span>
                                    <span id="val-${p.id}" class="as-value">auto</span>
                                </div>
                                <input type="range" class="as-slider" id="range-${p.id}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="0">
                            </div>
                        `).join('')}
                    </div>

                    <!-- STYLE SECTION -->
                    <div class="as-sub-section">
                        <h4>🎨 Style & Espacement</h4>
                        ${properties.filter(p => p.category === 'style').map(p => `
                            <div class="as-control-group">
                                <div class="as-label">
                                    <span>${p.label}</span>
                                    <span id="val-${p.id}" class="as-value">auto</span>
                                </div>
                                <input type="range" class="as-slider" id="range-${p.id}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="0">
                            </div>
                        `).join('')}
                    </div>

                    <button id="as-decompose" class="as-btn as-btn-warning" style="width:100%; margin-top:8px;">
                        🔧 Mode Décomposition (Multi-Handles)
                    </button>
                </div>


                <div class="as-section">
                    <h3>Éléments Invisibles / Calques</h3>
                    <div id="as-layers" class="as-layers-list">
                        <!-- Rempli dynamiquement -->
                    </div>
                </div>
            </div>
            <div class="as-actions">
                <button id="as-undo" class="as-btn as-btn-secondary">Annuler</button>
                <button id="as-copy-css" class="as-btn as-btn-secondary" title="Copier le code CSS">📋 CSS</button>
                <button id="as-save" class="as-btn as-btn-primary">Enregistrer</button>
            </div>
            <div id="as-code-preview" class="as-code-preview" style="display:none;">
                <div class="as-code-header">
                    <span>Code CSS généré</span>
                    <button id="as-close-preview" class="as-btn-icon" title="Fermer">✕</button>
                </div>
                <pre id="as-code-content"></pre>
                <button id="as-copy-code" class="as-btn as-btn-primary" style="width:100%">📋 Copier dans le presse-papier</button>
            </div>
        `;
        document.body.appendChild(panel);

        const overlay = document.createElement('div');
        overlay.id = 'as-overlay';
        overlay.innerHTML = `<div class="as-tag"></div>`;
        document.body.appendChild(overlay);

        // Mobile viewport simulator container
        const mobileFrame = document.createElement('div');
        mobileFrame.id = 'as-mobile-frame';
        mobileFrame.innerHTML = `
            <div class="as-mobile-notch"></div>
            <div class="as-mobile-screen" id="as-mobile-screen"></div>
            <div class="as-mobile-home"></div>
        `;
        document.body.appendChild(mobileFrame);

        updateLayersList();
        updateModeIndicator();
        setupDraggable();
    }

    function setupDraggable() {
        const panel = document.getElementById('admin-stylist-panel');
        const header = panel.querySelector('.as-header');
        let isDragging = false;
        let offsetX, offsetY;

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            panel.style.transition = '';
        });
    }

    function setupEvents() {
        const btnInspect = document.getElementById('as-toggle-inspector');
        btnInspect.addEventListener('click', toggleInspector);

        // Minimize button
        document.getElementById('as-minimize').addEventListener('click', toggleMinimize);

        // Mode toggle events
        document.getElementById('as-mode-desktop').addEventListener('click', () => setMode('desktop'));
        document.getElementById('as-mode-mobile').addEventListener('click', () => setMode('mobile'));


        document.addEventListener('mousemove', handleHover);
        document.addEventListener('click', handleClick, true);

        // Control events
        properties.forEach(p => {
            const input = document.getElementById(`range-${p.id}`);
            input.addEventListener('input', (e) => {
                if (selectedElements.length > 0) {
                    const val = e.target.value + p.unit;

                    if (isRatioLocked && (p.id === 'width' || p.id === 'height')) {
                        applyProportionalStyle(p.id, e.target.value);
                    } else {
                        applyStyle(null, p.id, val);
                    }
                }
            });
            input.addEventListener('change', () => {
                saveToHistory();
            });
        });

        document.getElementById('as-undo').addEventListener('click', undo);
        document.getElementById('as-save').addEventListener('click', saveToCode);
        document.getElementById('as-copy-css').addEventListener('click', showCSSPreview);
        document.getElementById('as-close-preview').addEventListener('click', hideCSSPreview);
        document.getElementById('as-copy-code').addEventListener('click', copyToClipboard);

        // Mobile positioning controls
        document.getElementById('as-center-h').addEventListener('click', centerHorizontally);
        document.getElementById('as-center-v').addEventListener('click', centerVertically);
        document.getElementById('as-toggle-fixed').addEventListener('change', toggleFixed);
        document.getElementById('as-toggle-absolute').addEventListener('change', toggleAbsolute);
        document.getElementById('as-toggle-ratio').addEventListener('change', (e) => {
            isRatioLocked = e.target.checked;
            if (isRatioLocked && activeElement) {
                const rect = activeElement.getBoundingClientRect();
                aspectRatio = rect.width / rect.height;
            }
        });
        document.getElementById('as-decompose').addEventListener('click', toggleDecomposeMode);
    }

    // Mobile positioning functions
    function centerHorizontally() {
        if (selectedElements.length === 0) return;
        selectedElements.forEach(el => {
            el.style.marginLeft = 'auto';
            el.style.marginRight = 'auto';
            el.style.display = 'block';
        });
        saveToHistory();
        updateMultiOverlays();
    }

    function centerVertically() {
        if (selectedElements.length === 0) return;
        selectedElements.forEach(el => {
            el.style.position = 'absolute';
            el.style.top = '50%';
            el.style.transform = 'translateY(-50%)';
        });
        saveToHistory();
        updateMultiOverlays();
    }

    function toggleFixed(e) {
        if (selectedElements.length === 0) return;
        selectedElements.forEach(el => {
            if (e.target.checked) {
                el.style.position = 'fixed';
            } else {
                el.style.position = '';
            }
        });
        saveToHistory();
        updateMultiOverlays();
    }

    function toggleAbsolute(e) {
        if (selectedElements.length === 0) return;
        selectedElements.forEach(el => {
            if (e.target.checked) {
                autoLibérer(el);
            } else {
                el.style.position = '';
                el.style.top = '';
                el.style.left = '';
                el.style.width = '';
                el.style.margin = '';
            }
        });
        saveToHistory();
        updateMultiOverlays();
    }

    function autoLibérer(el) {
        const style = window.getComputedStyle(el);
        if (style.position === 'absolute' || style.position === 'fixed') return;

        const rect = el.getBoundingClientRect();
        el.style.position = 'absolute';
        el.style.top = (rect.top + window.scrollY) + 'px';
        el.style.left = (rect.left + window.scrollX) + 'px';
        el.style.width = rect.width + 'px';
        el.style.margin = '0';

        const toggleAbsolute = document.getElementById('as-toggle-absolute');
        if (toggleAbsolute) toggleAbsolute.checked = true;
    }

    let isDecomposeMode = false;
    function toggleDecomposeMode() {
        isDecomposeMode = !isDecomposeMode;
        const btn = document.getElementById('as-decompose');

        if (isDecomposeMode) {
            btn.textContent = '✅ Quitter Décomposition';
            btn.classList.add('active');

            // Highlight all direct children and make them draggable
            const container = document.querySelector('#root') || document.body;
            const children = container.querySelectorAll(':scope > *:not(#admin-stylist-panel):not(#as-overlay):not(#as-mobile-frame):not(script):not(style)');

            children.forEach((child, i) => {
                child.classList.add('as-decompose-item');
                child.dataset.originalPosition = child.style.position || '';
                child.style.position = 'relative';
                child.style.outline = '2px dashed #6366f1';
                child.style.outlineOffset = '2px';

                // Add drag handle
                const handle = document.createElement('div');
                handle.className = 'as-drag-handle';
                handle.innerHTML = `<span>${i + 1}</span>`;
                handle.onclick = (e) => {
                    e.stopPropagation();
                    selectElement(child);
                    showOverlay(child);
                };
                child.appendChild(handle);
            });
        } else {
            btn.textContent = '🔧 Mode Décomposition';
            btn.classList.remove('active');

            // Remove all decompose styling
            document.querySelectorAll('.as-decompose-item').forEach(child => {
                child.classList.remove('as-decompose-item');
                child.style.position = child.dataset.originalPosition || '';
                child.style.outline = '';
                child.style.outlineOffset = '';
                const handle = child.querySelector('.as-drag-handle');
                if (handle) handle.remove();
            });
        }
    }


    function toggleMinimize() {
        const panel = document.getElementById('admin-stylist-panel');
        const btn = document.getElementById('as-minimize');
        panel.classList.toggle('minimized');

        // Change icon based on state
        if (panel.classList.contains('minimized')) {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>`;
            btn.title = 'Agrandir';
        } else {
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>`;
            btn.title = 'Réduire';
        }
    }

    function setMode(mode) {
        currentMode = mode;
        const desktopBtn = document.getElementById('as-mode-desktop');
        const mobileBtn = document.getElementById('as-mode-mobile');
        const mobileFrame = document.getElementById('as-mobile-frame');
        const mobileSizes = document.getElementById('as-mobile-sizes');

        desktopBtn.classList.toggle('active', mode === 'desktop');
        mobileBtn.classList.toggle('active', mode === 'mobile');

        if (mode === 'mobile') {
            // Activate mobile simulation
            document.body.classList.add('as-mobile-preview');
            mobileFrame.classList.add('active');
            mobileSizes.style.display = 'block';

            // Setup mobile size controls
            setupMobileSizeControls();
        } else {
            document.body.classList.remove('as-mobile-preview');
            mobileFrame.classList.remove('active');
            mobileSizes.style.display = 'none';

            // Exit decompose mode if active
            if (isDecomposeMode) {
                toggleDecomposeMode();
            }
        }

        updateModeIndicator();
    }

    function setupMobileSizeControls() {
        // Preset buttons
        document.querySelectorAll('.as-size-btn').forEach(btn => {
            btn.onclick = () => {
                const width = parseInt(btn.dataset.width);
                const height = parseInt(btn.dataset.height);
                setMobileSize(width, height);

                // Update active state
                document.querySelectorAll('.as-size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update slider
                document.getElementById('as-width-slider').value = width;
                document.getElementById('as-width-val').textContent = width;
            };
        });

        // Width slider
        const widthSlider = document.getElementById('as-width-slider');
        widthSlider.oninput = (e) => {
            const width = parseInt(e.target.value);
            document.getElementById('as-width-val').textContent = width;
            setMobileSize(width, null);

            // Clear preset selection
            document.querySelectorAll('.as-size-btn').forEach(b => b.classList.remove('active'));
        };
    }

    function setMobileSize(width, height) {
        const root = document.documentElement;
        root.style.setProperty('--as-mobile-width', width + 'px');

        // Update the breakpoint for CSS generation
        config.mobileBreakpoint = width;

        // Update mobile frame width
        const mobileFrame = document.getElementById('as-mobile-frame');
        if (mobileFrame) {
            mobileFrame.style.width = (width + 24) + 'px'; // +24 for padding
        }
    }


    function updateModeIndicator() {
        const indicator = document.getElementById('as-mode-indicator');
        if (indicator) {
            indicator.textContent = currentMode === 'mobile' ? '(Mobile)' : '(Desktop)';
            indicator.style.color = currentMode === 'mobile' ? '#f59e0b' : '#10b981';
        }
    }

    function toggleInspector() {
        isInspectorActive = !isInspectorActive;
        const btn = document.getElementById('as-toggle-inspector');
        btn.textContent = isInspectorActive ? 'Arrêter' : 'Inspecter';
        btn.classList.toggle('as-btn-primary');
        if (!isInspectorActive) {
            hideOverlay();
        }
    }

    function handleHover(e) {
        if (!isInspectorActive) return;
        const target = e.target;
        if (target.id === 'admin-stylist-panel' || target.closest('#admin-stylist-panel')) return;
        if (target.id === 'as-mobile-frame' || target.closest('#as-mobile-frame')) return;

        showOverlay(target);
    }

    function handleClick(e) {
        if (!isInspectorActive) return;

        const target = e.target;
        if (target.id === 'admin-stylist-panel' || target.closest('#admin-stylist-panel')) return;
        if (target.id === 'as-mobile-frame' || target.closest('#as-mobile-frame')) return;

        e.preventDefault();
        e.stopPropagation();

        if (e.ctrlKey) {
            // Toggle selection
            const index = selectedElements.indexOf(target);
            if (index > -1) {
                selectedElements.splice(index, 1);
                if (activeElement === target) {
                    activeElement = selectedElements[selectedElements.length - 1] || null;
                }
            } else {
                selectedElements.push(target);
                activeElement = target;
            }
            selectElement(activeElement, true);
        } else {
            // Single selection
            selectedElements = [target];
            selectElement(target);
            toggleInspector();
        }
    }

    function showOverlay(el) {
        const rect = el.getBoundingClientRect();
        const overlay = document.getElementById('as-overlay');
        overlay.style.display = 'block';
        overlay.style.top = rect.top + window.scrollY + 'px';
        overlay.style.left = rect.left + window.scrollX + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';

        const tag = overlay.querySelector('.as-tag');
        tag.textContent = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ').join('.') : ''}`;
    }

    function hideOverlay() {
        document.getElementById('as-overlay').style.display = 'none';
    }

    function selectElement(el, isMulti = false) {
        if (!el && selectedElements.length === 0) {
            document.getElementById('as-selected-info').innerHTML = '<h3>Aucun élément sélectionné</h3>';
            document.getElementById('as-controls').style.display = 'none';
            return;
        }

        activeElement = el || selectedElements[selectedElements.length - 1];
        if (!isMulti) selectedElements = [activeElement];

        const info = document.getElementById('as-selected-info');
        const controls = document.getElementById('as-controls');

        if (selectedElements.length > 1) {
            info.innerHTML = `<h3>Séléction : <span style="color:#6366f1">${selectedElements.length} éléments</span></h3>`;
        } else {
            info.innerHTML = `<h3>Élément : <span style="color:#6366f1">${activeElement.tagName.toLowerCase()}</span></h3>`;
        }
        controls.style.display = 'block';

        // Update Sliders based on current style of active element
        const style = window.getComputedStyle(activeElement);
        properties.forEach(p => {
            const input = document.getElementById(`range-${p.id}`);
            const valSpan = document.getElementById(`val-${p.id}`);
            let currentVal = style[p.id];

            // Clean value for slider
            let numericVal = parseFloat(currentVal) || 0;
            input.value = numericVal;
            valSpan.textContent = currentVal;
        });

        // Update checkboxes for mobile positioning
        if (currentMode === 'mobile') {
            const toggleFixed = document.getElementById('as-toggle-fixed');
            const toggleAbsolute = document.getElementById('as-toggle-absolute');
            if (toggleFixed) toggleFixed.checked = (style.position === 'fixed');
            if (toggleAbsolute) toggleAbsolute.checked = (style.position === 'absolute');
        }

        // Highlight selected elements in layer list
        document.querySelectorAll('.as-layer-item').forEach(item => {
            const isSel = selectedElements.some(sel => getSelector(sel) === item.dataset.selector);
            item.classList.toggle('selected', isSel);
        });

        // Update overlays
        updateMultiOverlays();
    }

    function updateMultiOverlays() {
        // Remove old overlays if any (besides the main one)
        document.querySelectorAll('.as-multi-overlay').forEach(o => o.remove());

        selectedElements.forEach((el, i) => {
            if (el === activeElement) {
                showOverlay(el);
            } else {
                const rect = el.getBoundingClientRect();
                const overlay = document.createElement('div');
                overlay.className = 'as-multi-overlay';
                overlay.style.position = 'fixed';
                overlay.style.pointerEvents = 'none';
                overlay.style.border = '2px dashed #6366f1';
                overlay.style.background = 'rgba(99, 102, 241, 0.05)';
                overlay.style.zIndex = '999997';
                overlay.style.top = rect.top + window.scrollY + 'px';
                overlay.style.left = rect.left + window.scrollX + 'px';
                overlay.style.width = rect.width + 'px';
                overlay.style.height = rect.height + 'px';
                document.body.appendChild(overlay);
            }
        });
    }


    function applyStyle(el, prop, value) {
        const layoutProps = ['width', 'height', 'top', 'left', 'margin', 'padding'];

        // Apply to all selected elements
        selectedElements.forEach(target => {
            if (layoutProps.includes(prop)) {
                autoLibérer(target);
            }
            target.style[prop] = value;
        });

        const valSpan = document.getElementById(`val-${prop}`);
        if (valSpan) valSpan.textContent = value;

        const rangeInput = document.getElementById(`range-${prop}`);
        if (rangeInput) rangeInput.value = parseFloat(value);

        updateMultiOverlays();
    }

    function applyProportionalStyle(changedProp, newVal) {
        const numericVal = parseFloat(newVal);

        if (changedProp === 'width') {
            const newHeight = numericVal / aspectRatio;
            applyStyle(null, 'width', numericVal + 'px');
            applyStyle(null, 'height', Math.round(newHeight) + 'px');
        } else {
            const newWidth = numericVal * aspectRatio;
            applyStyle(null, 'height', numericVal + 'px');
            applyStyle(null, 'width', Math.round(newWidth) + 'px');
        }
    }

    function getSelector(el) {
        if (el.id) return `#${el.id}`;
        if (el === document.body) return 'body';
        let path = el.tagName.toLowerCase();
        if (el.classList.length > 0) path += '.' + [...el.classList].join('.');
        return path;
    }

    function saveToHistory() {
        if (selectedElements.length === 0) return;

        const snapshot = {
            mode: currentMode,
            elements: []
        };

        selectedElements.forEach(el => {
            const elSnapshot = {
                selector: getSelector(el),
                styles: {}
            };
            properties.forEach(p => {
                elSnapshot.styles[p.id] = el.style[p.id];
            });
            snapshot.elements.push(elSnapshot);
        });

        history = history.slice(0, historyPointer + 1);
        history.push(snapshot);
        historyPointer++;
    }

    function undo() {
        if (historyPointer < 0) return;
        const prevState = history[historyPointer];
        // For simplicity, just restore the styles of that element
        const el = document.querySelector(prevState.selector);
        if (el) {
            properties.forEach(p => {
                el.style[p.id] = ''; // Reset to default or previous
            });
        }
        historyPointer--;
        if (el === activeElement) selectElement(el);
    }

    async function saveToCode() {
        if (selectedElements.length === 0) return;

        let successCount = 0;
        let totalCount = selectedElements.length;

        for (const el of selectedElements) {
            const selector = getSelector(el);
            const updates = {};
            properties.forEach(p => {
                if (el.style[p.id]) {
                    updates[p.id] = el.style[p.id];
                }
            });

            if (Object.keys(updates).length === 0) {
                successCount++;
                continue;
            }

            try {
                const response = await fetch(config.serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selector,
                        updates,
                        mode: currentMode,
                        breakpoint: config.mobileBreakpoint
                    })
                });
                if (response.ok) successCount++;
            } catch (err) {
                console.error(`Erreur pour ${selector}:`, err);
            }
        }

        if (successCount === totalCount) {
            alert(`Enregistré avec succès ! (${successCount} éléments mis à jour)`);
        } else {
            alert(`Enregistrement partiel : ${successCount}/${totalCount} éléments mis à jour.`);
        }
    }

    function generateCSSCode() {
        if (selectedElements.length === 0) return '';

        let allCss = '';

        selectedElements.forEach(el => {
            const selector = getSelector(el);
            const styles = [];

            properties.forEach(p => {
                if (el.style[p.id]) {
                    const kebabProp = p.id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                    styles.push(`    ${kebabProp}: ${el.style[p.id]};`);
                }
            });

            if (styles.length > 0) {
                if (currentMode === 'mobile') {
                    allCss += `${selector} {\n    ${styles.join('\n    ')}\n    }\n\n`;
                } else {
                    allCss += `${selector} {\n${styles.join('\n')}\n}\n\n`;
                }
            }
        });

        if (!allCss) return '/* Aucune modification */\n';

        if (currentMode === 'mobile') {
            return `/* Styles Mobile */\n@media (max-width: ${config.mobileBreakpoint}px) {\n${allCss}}`;
        } else {
            return `/* Styles Desktop */\n${allCss}`;
        }
    }

    function showCSSPreview() {
        const preview = document.getElementById('as-code-preview');
        const content = document.getElementById('as-code-content');
        content.textContent = generateCSSCode();
        preview.style.display = 'block';
    }

    function hideCSSPreview() {
        document.getElementById('as-code-preview').style.display = 'none';
    }

    function copyToClipboard() {
        const code = generateCSSCode();
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('as-copy-code');
            btn.textContent = '✅ Copié !';
            setTimeout(() => {
                btn.textContent = '📋 Copier dans le presse-papier';
            }, 2000);
        });
    }

    function updateLayersList() {
        const layers = document.getElementById('as-layers');
        const allElements = document.querySelectorAll('body *:not(#admin-stylist-panel):not(#as-overlay):not(#as-mobile-frame)');

        layers.innerHTML = '';
        allElements.forEach(el => {
            // Uniquement les éléments "clés" ou invisibles
            const isHidden = window.getComputedStyle(el).display === 'none' || window.getComputedStyle(el).opacity === '0';
            if (el.id || el.classList.contains('card') || el.classList.contains('window') || isHidden) {
                const item = document.createElement('div');
                item.className = 'as-layer-item';
                if (isHidden) item.style.fontStyle = 'italic';
                item.textContent = (isHidden ? '[Caché] ' : '') + getSelector(el);
                item.dataset.selector = getSelector(el);
                item.onclick = () => {
                    const target = document.querySelector(item.dataset.selector);
                    if (isHidden) target.style.display = 'block'; // Make visible to edit
                    selectElement(target);
                    showOverlay(target); // Afficher la surbrillance
                };
                layers.appendChild(item);
            }
        });
    }

    return { init, setMode };
})();

window.AdminStylist = AdminStylist;

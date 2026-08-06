
/**
 * Configura el HUD y panel de control del Cubo Clasificador.
 *
 * Responsabilidad ÚNICA: manejar la interfaz DOM (HUD + panel).
 * No escucha teclado — eso vive en InputManager + AnimationLoop.
 */
export function setupInterface({
    piecesGroup,
    buildMaterial,
    lights,
}) {
    const labelToMesh = {};
    piecesGroup.children.forEach(c => {
        if (c.isMesh) labelToMesh[c.userData.label] = c;
    });

    let selectedKey = null;

    // ── Puntajes por pieza clasificada ──
    const scores = {};
    piecesGroup.children.forEach(c => {
        if (c.isMesh) scores[c.userData.label] = 0;
    });

    // ── Helpers ──
    function getMeshState() {
        if (!selectedKey) return null;
        const mesh = labelToMesh[selectedKey];
        if (!mesh) return null;
        return {
            mesh,
            def: { label: selectedKey, color: mesh.material.color.getHex() },
            state: {
                material: mesh.userData._matType || 'standard',
                texture: mesh.userData._texKey || 'none',
                wireframe: mesh.material.wireframe || false,
            },
        };
    }

    // ── HUD: puntajes ──
    function updateHUD() {
        for (const label in scores) {
            const el = document.getElementById(`score-${label}`);
            if (el) el.textContent = scores[label];
        }
    }

    // ── Panel ──
    // PERF-005: Cachear DOM queries del hot path para evitar re-queries en cada selección
    const _objBtns = [...document.querySelectorAll('.objbtn')];
    const _matBtns = [...document.querySelectorAll('.matbtn')];
    const _texBtns = [...document.querySelectorAll('.texbtn')];
    const _wfBtn = document.getElementById('wf-btn');

    function updatePanelSelection() {
        const st = getMeshState();
        // Botones de objeto
        _objBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.key === selectedKey);
        });
        if (!st) {
            _matBtns.forEach(b => b.classList.remove('active'));
            _texBtns.forEach(b => b.classList.remove('active'));
            _wfBtn.classList.remove('active');
            _wfBtn.textContent = 'Wireframe: OFF';
            return;
        }
        // Botones de material
        _matBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.mat === st.state.material);
        });
        // Botones de textura
        _texBtns.forEach(b => {
            b.classList.toggle('active', b.dataset.tex === st.state.texture);
        });
        // Wireframe
        _wfBtn.classList.toggle('active', st.state.wireframe);
        _wfBtn.textContent = st.state.wireframe ? 'Wireframe: ON' : 'Wireframe: OFF';
    }

    // ── Aplicar estado actualizado al mesh ──
    function applyState(st) {
        if (!st) return;
        // PERF-004: liberar recursos GPU del material anterior antes de reemplazar
        const oldMat = st.mesh.material;
        st.mesh.material = buildMaterial(st.state.material, st.def.color, st.state.texture, st.state.wireframe);
        if (oldMat && oldMat !== st.mesh.material) oldMat.dispose();
        st.mesh.userData._matType = st.state.material;
        st.mesh.userData._texKey = st.state.texture;
        updatePanelSelection();
    }

    // ── Helper genérico para cambios de estado del material ─────
    function onStateChange(propKey, valueOrFn) {
        if (!selectedKey) return;
        const st = getMeshState();
        if (!st) return;
        st.state[propKey] = typeof valueOrFn === 'function'
            ? valueOrFn(st.state[propKey])
            : valueOrFn;
        applyState(st);
    }

    // ─── SELECCIÓN ──────────────────────────────
    function onPieceSelected(mesh) {
        if (mesh && mesh.userData.label && labelToMesh[mesh.userData.label]) {
            selectedKey = mesh.userData.label;
        } else {
            selectedKey = null;
        }
        updatePanelSelection();
    }

    function selectByLabel(label) {
        selectedKey = label;
        updatePanelSelection();
    }

    // ─── PANEL: Botones de objeto ───────────────
    const btnContainer = document.getElementById('obj-buttons');
    piecesGroup.children.forEach(c => {
        if (!c.isMesh) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn objbtn';
        btn.textContent = c.userData.label;
        btn.dataset.key = c.userData.label;
        btn.onclick = () => selectByLabel(c.userData.label);
        btnContainer.appendChild(btn);
    });

    // ─── PANEL: Material / Textura / Wireframe ──
    document.querySelectorAll('.matbtn').forEach(btn => {
        btn.onclick = () => onStateChange('material', btn.dataset.mat);
    });

    document.querySelectorAll('.texbtn').forEach(btn => {
        btn.onclick = () => onStateChange('texture', btn.dataset.tex);
    });

    document.getElementById('wf-btn').onclick = () => {
        onStateChange('wireframe', prev => !prev);
    };

    // ─── PANEL: Luces ───────────────────────────
    document.querySelectorAll('.lighttoggle').forEach(tg => {
        tg.onclick = () => {
            const key = tg.dataset.light;
            const isOn = tg.classList.toggle('on');
            lights[key].visible = isOn;
        };
    });

    // ─── Construir filas de puntajes en el HUD ──
    const scoresContainer = document.getElementById('hud-scores');
    piecesGroup.children.forEach(c => {
        if (!c.isMesh) return;
        const label = c.userData.label;
        const row = document.createElement('div');
        row.className = 'row';
        
        const labelText = document.createTextNode(`${label}: `);
        const spanStatus = document.createElement('span');
        spanStatus.className = 'status';
        spanStatus.id = `score-${label}`;
        spanStatus.textContent = '0';
        
        row.appendChild(labelText);
        row.appendChild(spanStatus);
        scoresContainer.appendChild(row);
    });

    // ─── Botón Toggle del Panel (Ajustes) ───────
    const panelEl = document.getElementById('panel');
    const panelToggleBtn = document.getElementById('panel-toggle-btn');
    if (panelToggleBtn && panelEl) {
        panelToggleBtn.onclick = (e) => {
            e.stopPropagation(); // Evita que se dispare click en el canvas
            panelEl.classList.toggle('visible');
        };
    }

    // ─── Inicializar ────────────────────────────────────────────
    updateHUD();
    updatePanelSelection();

    return {
        onPieceSelected,
        /** Incrementa el puntaje de una pieza clasificada correctamente */
        onPieceClassified(label) {
            if (scores[label] !== undefined) {
                scores[label]++;
                updateHUD();
            }
        },
        /** Reinicia todos los puntajes a 0 */
        resetScores() {
            for (const key in scores) scores[key] = 0;
            updateHUD();
        },
    };
}
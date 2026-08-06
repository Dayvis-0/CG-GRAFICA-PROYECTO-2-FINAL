// Configura el panel de control de la pantalla para cambiar materiales, luces y expulsar piezas.
export function setupInterface({ piecesGroup, buildMaterial, lights, onEjectPiece }) {
    const labelToMesh = {};
    piecesGroup.children.forEach(c => {
        if (c.isMesh) labelToMesh[c.userData.label] = c;
    });

    let selectedKey = null;
    const scores = {};
    
    piecesGroup.children.forEach(c => {
        if (c.isMesh) scores[c.userData.label] = 0;
    });

    // Obtiene la configuración actual de material y textura de la pieza seleccionada.
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

    // Actualiza los números del contador de piezas en la pantalla.
    function updateHUD() {
        for (const label in scores) {
            const el = document.getElementById(`score-${label}`);
            if (el) el.textContent = scores[label];
        }
    }

    const btnContainer = document.getElementById('obj-buttons');
    if (btnContainer) btnContainer.innerHTML = '';
    
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

    const _objBtns = [...document.querySelectorAll('.objbtn')];
    const _matBtns = [...document.querySelectorAll('.matbtn')];
    const _texBtns = [...document.querySelectorAll('.texbtn')];
    const _wfBtn = document.getElementById('wf-btn');

    // Resalta los botones del menú según la pieza que esté seleccionada.
    function updatePanelSelection() {
        const st = getMeshState();
        _objBtns.forEach(b => b.classList.toggle('active', b.dataset.key === selectedKey));

        if (!st) {
            _matBtns.forEach(b => b.classList.remove('active'));
            _texBtns.forEach(b => b.classList.remove('active'));
            if (_wfBtn) {
                _wfBtn.classList.remove('active');
                _wfBtn.textContent = 'Wireframe: OFF';
            }
            return;
        }

        _matBtns.forEach(b => b.classList.toggle('active', b.dataset.mat === st.state.material));
        _texBtns.forEach(b => b.classList.toggle('active', b.dataset.tex === st.state.texture));
        
        if (_wfBtn) {
            _wfBtn.classList.toggle('active', st.state.wireframe);
            _wfBtn.textContent = st.state.wireframe ? 'Wireframe: ON' : 'Wireframe: OFF';
        }
    }

    // Aplica el nuevo material o textura a la pieza seleccionada.
    function applyState(st) {
        if (!st) return;
        const oldMat = st.mesh.material;
        st.mesh.material = buildMaterial(st.state.material, st.def.color, st.state.texture, st.state.wireframe);
        if (oldMat && oldMat !== st.mesh.material) oldMat.dispose();
        st.mesh.userData._matType = st.state.material;
        st.mesh.userData._texKey = st.state.texture;
        updatePanelSelection();
    }

    function onStateChange(propKey, valueOrFn) {
        if (!selectedKey) return;
        const st = getMeshState();
        if (!st) return;
        st.state[propKey] = typeof valueOrFn === 'function' ? valueOrFn(st.state[propKey]) : valueOrFn;
        applyState(st);
    }

    // Registra cuál pieza fue seleccionada al hacerle clic.
    function onPieceSelected(mesh) {
        if (mesh && mesh.userData.label && labelToMesh[mesh.userData.label]) {
            selectedKey = mesh.userData.label;
        } else {
            selectedKey = null;
        }
        updatePanelSelection();
    }

    // Selecciona o deselecciona una pieza usando su botón en el menú.
    function selectByLabel(label) {
        selectedKey = selectedKey === label ? null : label;
        updatePanelSelection();
    }

    _matBtns.forEach(btn => btn.onclick = () => onStateChange('material', btn.dataset.mat));
    _texBtns.forEach(btn => btn.onclick = () => onStateChange('texture', btn.dataset.tex));
    if (_wfBtn) _wfBtn.onclick = () => onStateChange('wireframe', prev => !prev);

    const ejectBtn = document.getElementById('eject-btn');
    if (ejectBtn) {
        ejectBtn.onclick = () => {
            if (typeof onEjectPiece === 'function') {
                onEjectPiece(selectedKey);
            }
        };
    }

    document.querySelectorAll('.lighttoggle').forEach(tg => {
        tg.onclick = () => {
            const key = tg.dataset.light;
            const isOn = tg.classList.toggle('on');
            if (lights[key]) lights[key].visible = isOn;
        };
    });

    const scoresContainer = document.getElementById('hud-scores');
    if (scoresContainer) scoresContainer.innerHTML = '';
    
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
        if (scoresContainer) scoresContainer.appendChild(row);
    });

    const panelEl = document.getElementById('panel');
    const panelToggleBtn = document.getElementById('panel-toggle-btn');
    if (panelToggleBtn && panelEl) {
        panelToggleBtn.onclick = (e) => {
            e.stopPropagation();
            panelEl.classList.toggle('visible');
        };
    }

    updateHUD();
    updatePanelSelection();

    return {
        onPieceSelected,
        onPieceClassified(label) {
            if (scores[label] !== undefined) {
                scores[label]++;
                updateHUD();
            }
        },
        resetScores() {
            for (const key in scores) scores[key] = 0;
            updateHUD();
        },
    };
}
import * as THREE from 'three';
import { createScene }          from './core/SceneManager.js';
import { createCamera }         from './core/CameraManager.js';
import { createRenderer }       from './core/RendererManager.js';
import { createRoom }           from './objects/Room.js';
import { createClassifier }     from './objects/Classifier.js';
import { createPieces }         from './objects/Pieces.js';
import { createLights }         from './lights/Lights.js';
import { createTextures }       from './textures/TextureFactory.js';
import { createMaterialFactory } from './materials/MaterialFactory.js';
import { setupDragManager }     from './controls/DragManager.js';
import { setupInputManager }  from './controls/InputManager.js';
import { setupCameraFPS }       from './controls/CameraFPS.js';
import { setupInterface }       from './ui/Interface.js';
import { setupResize }          from './utils/ResizeHandler.js';
import { setupAnimationLoop }   from './animations/AnimationLoop.js';
import { createPhysicsWorld }   from './physics/PhysicsWorld.js';
import { createBodyFactory }    from './physics/BodyFactory.js';
import { createPhysicsSystem }  from './physics/PhysicsSystem.js';
import { createClassifierRules } from './game/ClassifierRules.js';
import { createTimer }           from './game/Timer.js';
import { createGameState }       from './game/GameState.js';
import { snapToHole }            from './game/SnapHelper.js';
import { teleportPiece }         from './game/pieceUtils.js';
import { playErrorSound }        from './utils/audio.js';
import { HOLE_CONFIGS }         from './data/holeConfigs.js';
import { WALL_HEIGHT, PANEL_DEPTH, OUTER, ROOM_MARGIN } from './data/classifierDimensions.js';
import { clampToBounds }        from './utils/math.js';
import { OrbitControls }        from 'three/addons/controls/OrbitControls.js';

try {
    let currentMode = 'infantil';
    let fpsControls;

    // ─── Input · Escena · Cámara · Renderer ────────────────────────────
    const inputManager = setupInputManager();
    const scene = createScene();
    const renderer = createRenderer(document.body);
    const { cam } = createCamera();

    // Posición inicial infantil (orbital) mirando el clasificador (dentro de la habitación)
    cam.position.set(0, 4.5, 6.0);

    // ─── Geometría del cuarto y clasificador ───────────────────────────
    const room = createRoom({ size: 14, height: 8 });
    scene.add(room);

    const { group: classifier, walls, panel } = createClassifier();
    scene.add(classifier);

    const pieces = createPieces();
    scene.add(pieces);

    const lights = createLights(scene);

    // ─── Texturas procedurales + fábrica de materiales ────────────────
    const textures = createTextures();
    const buildMaterial = createMaterialFactory(textures);

    // Cargar la textura de madera local .webp SOLO para la caja clasificadora
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'src/assets/wood_color.webp',
        (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1.5, 1.5);
            classifier.children.forEach(c => {
                if (c.isMesh) {
                    c.material.map = tex;
                    c.material.needsUpdate = true;
                }
            });
        },
        undefined,
        () => {
            console.warn('[Texturas] No se pudo cargar src/assets/wood_color.webp. Usando color de madera plano Montessori.');
        }
    );

    // ─── Refs compartidas entre módulos ────────────────────────────────
    const draggingRef = { current: false };
    const activeCameraRef = { current: cam };

    // ─── UI (ARQ-001: se crea antes de los callbacks que la usan) ───────
    // setupInterface solo depende de piezas/materiales/luces, ya disponibles;
    // crearla aquí elimina la variable tardía `interfaceCtrl` que los
    // callbacks de gameState/drag referenciaban antes de asignarse.
    const interfaceCtrl = setupInterface({
        piecesGroup: pieces,
        buildMaterial,
        lights,
    });

    // ─── Cronómetro ────────────────────────────────────────────────────
    let gameState;
    const timer = createTimer(() => gameState.showGameOver(false));

    // ─── Físicas (cannon-es) ───────────────────────────────────────────
    const physicsWorld = createPhysicsWorld();
    const bodyFactory = createBodyFactory(physicsWorld.world, physicsWorld.materials);

    // Cuerpos estáticos: piso y paredes del cuarto + paredes del clasificador
    // + panel con grilla (huecos físicos reales).
    for (const child of room.children) {
        if (!child.isMesh) continue;
        const kind = (child.position.y < 0.5) ? 'ground' : 'room-wall';
        bodyFactory.registerStatic(child, kind);
    }
    for (const wall of walls) {
        bodyFactory.registerStatic(wall, 'wall');
    }
    bodyFactory.registerStatic(panel, 'panel', { holeConfigs: HOLE_CONFIGS });

    // Piezas dinámicas con masa
    for (const piece of pieces.children) {
        if (!piece.isMesh) continue;
        bodyFactory.registerPiece(piece, 1.0);
    }

    const physicsSystem = createPhysicsSystem(pieces, bodyFactory, physicsWorld);

    // ─── Reglas del juego ──────────────────────────────────────────────
    const rules = createClassifierRules();

    // ─── Controles ─────────────────────────────────────────────────────
    // Obstáculos del arrastre y colisiones: SOLO paredes del clasificador (el panel
    // con grilla ya detecta colisiones con huecos reales vía cannon).
    const dragObstacles = [...walls];

    // Inicializar OrbitControls para la cámara orbital
    const orbitControls = new OrbitControls(cam, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Evita bajar del piso
    orbitControls.minDistance = 3;
    orbitControls.maxDistance = 8.5;
    orbitControls.target.set(0, 1.5, 0); // Apunta al cubo clasificador
    orbitControls.update();

    // Inicializar FPS Controls (inicia desactivado)
    fpsControls = setupCameraFPS(cam, renderer, room.userData.bounds, dragObstacles, draggingRef, inputManager);

    /**
     * Habilita/deshabilita los controles de cámara del modo activo (DUP-005).
     * Único punto que toca `orbitControls.enabled` y `fpsControls.setEnabled`.
     */
    function setControlsState(active) {
        orbitControls.enabled = currentMode === 'infantil' && active;
        if (fpsControls) fpsControls.setEnabled(currentMode === 'experto' && active);
    }

    function setCameraMode(mode) {
        currentMode = mode;
        const infantilBtn = document.getElementById('cam-infantil-btn');
        const expertoBtn = document.getElementById('cam-experto-btn');
        const hintEl = document.getElementById('hint');

        if (mode === 'experto') {
            // Desactivar órbita + activar FPS
            setControlsState(true);
            fpsControls.resetRotation();
            // Posicionar a altura de ojos (1.6)
            cam.position.set(5, 1.6, 5);

            if (infantilBtn) infantilBtn.classList.remove('active');
            if (expertoBtn) expertoBtn.classList.add('active');
            if (hintEl) {
                // SEC-003: textContent (strings estáticos, sin interpolación)
                hintEl.textContent = 'Modo WASD: WASD para caminar · Clic en pantalla para capturar mouse · Arrastrá figuras';
            }
        } else {
            // Desactivar FPS + activar órbita
            setControlsState(true);
            // Posición inicial infantil orbital
            cam.position.set(0, 4.5, 6.0);
            orbitControls.target.set(0, 1.5, 0);
            orbitControls.update();

            if (infantilBtn) infantilBtn.classList.add('active');
            if (expertoBtn) expertoBtn.classList.remove('active');
            if (hintEl) {
                // SEC-003: textContent (strings estáticos, sin interpolación)
                hintEl.textContent = 'Modo Mouse: Arrastrá las figuras con el mouse o dedo · Mové la cámara arrastrando el fondo';
            }
        }
    }

    document.getElementById('cam-infantil-btn')?.addEventListener('click', () => setCameraMode('infantil'));
    document.getElementById('cam-experto-btn')?.addEventListener('click', () => setCameraMode('experto'));

    // ─── Estado del juego (SRP-001) ────────────────────────────────────
    // Ref mutable para la dependencia circular gameState ↔ dragManager (ARQ-002)
    const dragManagerRef = { current: null };
    gameState = createGameState({
        pieces,
        rules,
        teleportPiece,
        timer,
        dragManagerRef,
        setControlsState,
        onClassified: (label) => {
            interfaceCtrl.onPieceClassified(label);
            console.log(`✅ ¡${label} clasificado!`);
        },
        onResetScores: () => {
            interfaceCtrl.resetScores();
        },
        onGameOver: (won) => {
            const overlay = document.getElementById('game-over-overlay');
            const title = document.getElementById('game-over-title');
            const message = document.getElementById('game-over-message');
            const btn = document.getElementById('game-over-btn');

            if (overlay && title && message && btn) {
                if (won) {
                    title.textContent = 'COMPLETADO';
                    title.style.color = 'var(--color-success)';
                    message.textContent = '¡Lograste clasificar todas las figuras a tiempo!';
                    btn.textContent = 'JUGAR DE NUEVO 🚀';
                } else {
                    title.textContent = 'TIEMPO AGOTADO';
                    title.style.color = 'var(--color-danger)';
                    message.textContent = 'Podés volver a intentarlo';
                    btn.textContent = 'REINTENTAR 🔄';
                }
                overlay.classList.remove('hidden');
            }
        },
    });

    // ─── Drag (depende de gameState para el snap) ──────────────────────
    const POST_DRAG_LOCK_DELAY = 120; // ms de espera post-suelte para evitar pointer lock accidental

    const dragManager = setupDragManager(activeCameraRef, renderer, {
        piecesGroup: pieces,
        physicsSystem,
        obstacles: dragObstacles,
        roomBounds: room.userData.bounds,
        classifierTop: WALL_HEIGHT + PANEL_DEPTH,
        classifierHalf: OUTER / 2,
        onSelect: (mesh) => {
            interfaceCtrl.onPieceSelected(mesh);
        },
        onDragStart: () => {
            draggingRef.current = true;
            timer.start();
        },
        onDragEnd: (mesh) => {
            // Evita que el click post-suelte active el pointer lock en modo FPS
            setTimeout(() => { draggingRef.current = false; }, POST_DRAG_LOCK_DELAY);

            // Snap posicional y rotacional Montessori (SRP-001): reusa teleportPiece
            if (mesh) snapToHole(mesh);
        },
    });

    // Completar la referencia circular del estado de juego (ARQ-002)
    dragManagerRef.current = dragManager;

    // ─── Responsive + Bucle principal ───────────────────────────────────
    setupResize(cam, renderer);

    setupAnimationLoop({
        scene,
        renderer,
        activeCameraRef,
        fpsControl: {
            update() {
                if (currentMode === 'infantil') {
                    orbitControls.enabled = !draggingRef.current && gameState.isActive;
                    orbitControls.update();
                } else {
                    fpsControls.update();
                }
                clampToBounds(cam.position, room.userData.bounds);
                cam.position.y = Math.max(ROOM_MARGIN, Math.min(room.userData.bounds.height - ROOM_MARGIN, cam.position.y));
            }
        },
        pieces,
        physicsSystem,
        inputManager,
        dragManager,
        roomBounds: room.userData.bounds,
        onPostPhysics: () => {
            for (const child of pieces.children) {
                // Política de clasificación/infracción en game/ (ARQ-004);
                // el compositor solo reacciona al resultado.
                if (gameState.processPiece(child) === 'infraction') {
                    playErrorSound();
                    console.log(`❌ ¡Infracción! ${child.userData.label} entró por un hueco equivocado y fue expulsada.`);
                }
            }
        },
    });

    // ─── Mostrar formulario de nombre ────────────────────────────────────
    document.getElementById('loading-phase')?.classList.add('hidden');
    document.getElementById('username-phase')?.classList.remove('hidden');
    document.getElementById('username-input')?.focus();

    document.getElementById('username-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('username-input')?.value.trim() || 'Jugador';
        const hudTitle = document.getElementById('hud-title');
        if (hudTitle) hudTitle.textContent = name.toUpperCase();
        document.getElementById('loading-overlay')?.classList.add('hidden');
        console.log(`👤 Bienvenido, ${name}`);
    });

    function restartGame() {
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.classList.add('hidden');

        // Liberar el flag de arrastre por si el tiempo se agotó justo mientras movía una pieza
        draggingRef.current = false;

        // Reactivar controles
        gameState.setActive(true);
        dragManager.setEnabled(true);
        setControlsState(true);

        gameState.resetPieces();
    }

    // ─── Botón del modal de fin de juego ─────────────────────────────
    document.getElementById('game-over-btn')?.addEventListener('click', restartGame);

    // ─── Botón + tecla 'R' para reiniciar ─────────────────────────────
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = restartGame;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            // No reiniciar si está escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            restartGame();
        }
    });

    // Sincronizar el modo de cámara inicial
    setCameraMode('infantil');
} catch (err) {
    console.error('❌ Error crítico al inicializar la aplicación:', err);
    const loadingPhase = document.getElementById('loading-phase');
    if (loadingPhase) {
        // ERR-003: usar textContent en lugar de innerHTML para evitar inyección de HTML
        loadingPhase.textContent = '';
        const errorTitle = document.createElement('h2');
        errorTitle.style.color = '#ff5566';
        errorTitle.textContent = 'Error al cargar la aplicación 3D';
        const errorMessage = document.createElement('p');
        errorMessage.style.color = '#ccc';
        errorMessage.style.fontSize = '14px';
        errorMessage.style.marginTop = '8px';
        errorMessage.textContent = err.message || String(err);
        loadingPhase.appendChild(errorTitle);
        loadingPhase.appendChild(errorMessage);
    }
}

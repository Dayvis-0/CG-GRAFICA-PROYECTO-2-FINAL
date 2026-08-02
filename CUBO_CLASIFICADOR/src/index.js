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
import { playSuccessSound, playErrorSound } from './utils/audio.js';
import { TRIANGLE_QUAT_OFFSET, quatMeshToBody } from './physics/triangleQuat.js';
import { HOLE_CONFIGS }         from './data/holeConfigs.js';
import { WALL_HEIGHT, PANEL_DEPTH, OUTER, SNAP_DISTANCE, SNAP_MIN_HEIGHT, SNAP_ALIGN_HEIGHT } from './data/classifierDimensions.js';
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
        (err) => {
            console.warn('[Texturas] No se pudo cargar src/assets/wood_color.webp. Usando color de madera plano Montessori.');
        }
    );

    // ─── Refs compartidas entre módulos ────────────────────────────────
    const draggingRef = { current: false };
    const activeCameraRef = { current: cam };

    // ─── Lógica del Estado del Juego (Fin de Juego / Victoria) ─────────
    let gameActive = true;
    // Handle del timeout de victoria (ERR-001): se cancela al reiniciar para
    // que el overlay no aparezca sobre una partida ya reiniciada.
    let winTimeout = null;

    /**
     * Habilita/deshabilita los controles de cámara del modo activo (DUP-005).
     * Único punto que toca `orbitControls.enabled` y `fpsControls.setEnabled`.
     */
    function setControlsState(active) {
        orbitControls.enabled = currentMode === 'infantil' && active;
        if (fpsControls) fpsControls.setEnabled(currentMode === 'experto' && active);
    }

    function showGameOver(won) {
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }
        gameActive = false;
        timer.stop();
        dragManager.setEnabled(false);
        setControlsState(false);

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
    }

    // Vincular el botón del modal de fin de juego
    document.getElementById('game-over-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('game-over-overlay');
        if (overlay) overlay.classList.add('hidden');

        // Reactivar controles
        gameActive = true;
        dragManager.setEnabled(true);
        setControlsState(true);

        resetPieces();
    });

    // ─── Control de clasificación (evita doble conteo) ─────────────────
    const classifiedLabels = new Set();
    /**
     * Clasifica la pieza si está sobre su hueco correcto (DUP-009).
     * Único guard canónico de `isOverOwnHole`: el llamador usa el retorno
     * booleano para decidir entre clasificar o tratar como infracción.
     * @param {THREE.Mesh} mesh
     * @returns {boolean} true si se clasificó en esta llamada
     */
    function tryClassify(mesh) {
        if (!mesh || classifiedLabels.has(mesh.userData.label)) return false;
        if (rules && rules.isOverOwnHole(mesh)) {
            classifiedLabels.add(mesh.userData.label);
            if (interfaceCtrl) interfaceCtrl.onPieceClassified(mesh.userData.label);
            console.log(`✅ ¡${mesh.userData.label} clasificado!`);
            playSuccessSound();

            // Si clasificó todas las piezas -> ¡Victoria!
            if (classifiedLabels.size === HOLE_CONFIGS.length) {
                winTimeout = setTimeout(() => {
                    winTimeout = null;
                    showGameOver(true);
                }, 800); // Pequeña espera para que termine de caer
            }
            return true;
        }
        return false;
    }

    // ─── Cronómetro ────────────────────────────────────────────────────
    const timer = createTimer(() => showGameOver(false));

    // ─── Reset de piezas ──────────────────────────────────────────────
    /**
     * Reubica una pieza en `pos`: visual + física + reset de velocidades
     * (DUP-001). El triángulo usa el desfase centralizado (DUP-002) para que
     * el cuerpo físico quede como lo registra BodyFactory y la sincronización
     * visual no lo rote.
     */
    function teleportPiece(mesh, pos) {
        mesh.position.copy(pos);
        mesh.quaternion.identity();

        const body = mesh.userData.body;
        if (body) {
            body.position.set(pos.x, pos.y, pos.z);
            if (mesh.userData.pieceType === 'triangle') {
                const q = quatMeshToBody(mesh.quaternion); // identity * offset(+90°)
                body.quaternion.set(q.x, q.y, q.z, q.w);
            } else {
                body.quaternion.set(0, 0, 0, 1);
            }
            body.velocity.setZero();
            body.angularVelocity.setZero();
            body.wakeUp();
        }
    }

    function resetPieces() {
        // Cancelar una victoria pendiente antes de reiniciar (ERR-001)
        if (winTimeout) { clearTimeout(winTimeout); winTimeout = null; }

        for (const child of pieces.children) {
            if (!child.isMesh) continue;
            const orig = child.userData.originalPos;
            if (!orig) continue;

            teleportPiece(child, orig);
        }

        // Resetear clasificación + cronómetro
        classifiedLabels.clear();
        if (interfaceCtrl) interfaceCtrl.resetScores();
        timer.reset();
        console.log('🔄 Piezas reiniciadas');
    }

    // ─── Físicas (cannon-es) ───────────────────────────────────────────
    const physicsWorld = createPhysicsWorld();
    const bodyFactory = createBodyFactory(physicsWorld.world, physicsWorld.materials);

    // Cuerpos estáticos: piso y paredes del cuarto + paredes del clasificador
    // + panel con Trimesh (huecos físicos reales).
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
    // Obstáculos del arrastre y colisiones: SOLO paredes del clasificador (el panel Trimesh
    // ya detecta colisiones con huecos reales vía cannon).
    const dragObstacles = [...walls];

    // Inicializar OrbitControls para la cámara orbital
    const orbitControls = new OrbitControls(cam, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.maxPolarAngle = Math.PI / 2 - 0.05; // Evita bajar del piso
    orbitControls.minDistance = 3;
    orbitControls.maxDistance = 15;
    orbitControls.target.set(0, 1.5, 0); // Apunta al cubo clasificador
    orbitControls.update();

    // Inicializar FPS Controls (inicia desactivado)
    fpsControls = setupCameraFPS(cam, renderer, room.userData.bounds, dragObstacles, draggingRef, inputManager);

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
                hintEl.innerHTML = 'Modo WASD: WASD para caminar · Clic en pantalla para capturar mouse · Arrastrá figuras';
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
                hintEl.innerHTML = 'Modo Mouse: Arrastrá las figuras con el mouse o dedo · Mové la cámara arrastrando el fondo';
            }
        }
    }

    document.getElementById('cam-infantil-btn')?.addEventListener('click', () => setCameraMode('infantil'));
    document.getElementById('cam-experto-btn')?.addEventListener('click', () => setCameraMode('experto'));

    // Controlador unificado para el loop de animación
    const cameraController = {
        update() {
            if (currentMode === 'infantil') {
                orbitControls.enabled = !draggingRef.current && gameActive;
                orbitControls.update();
            } else {
                fpsControls.update();
            }
        }
    };

    const POST_DRAG_LOCK_DELAY = 120; // ms de espera post-suelte para evitar pointer lock accidental

    let interfaceCtrl;
    const dragManager = setupDragManager(activeCameraRef, renderer, {
        piecesGroup: pieces,
        physicsSystem,
        obstacles: dragObstacles,
        roomBounds: room.userData.bounds,
        classifierTop: WALL_HEIGHT + PANEL_DEPTH,
        classifierHalf: OUTER / 2,
        onSelect: (mesh) => {
            if (interfaceCtrl) interfaceCtrl.onPieceSelected(mesh);
        },
        onDragStart: () => {
            draggingRef.current = true;
            timer.start();
        },
        onDragEnd:   (mesh) => {
            // Evita que el click post-suelte active el pointer lock en modo FPS
            setTimeout(() => { draggingRef.current = false; }, POST_DRAG_LOCK_DELAY);
            
            // Snap posicional y rotacional Montessori si la pieza está CERCA de su hueco correcto
            if (mesh) {
                const cfg = HOLE_CONFIGS.find(c => c.label === mesh.userData.label);
                if (cfg) {
                    // Calcular distancia horizontal (X/Z) al centro de su hueco correspondiente
                    const dx = mesh.position.x - cfg.cx;
                    const dz = mesh.position.z - (-cfg.cy);
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Si está en un rango cercano (SNAP_DISTANCE) y arriba de la tapa
                    if (dist < SNAP_DISTANCE && mesh.position.y > SNAP_MIN_HEIGHT) {
                        const body = mesh.userData.body;
                        const snapX = cfg.cx;
                        const snapZ = -cfg.cy;
                        const snapY = SNAP_ALIGN_HEIGHT; // Se eleva un poco más arriba para centrarse

                        // Posición y rotación simétrica perfecta
                        mesh.position.set(snapX, snapY, snapZ);
                        mesh.quaternion.identity();

                        if (body) {
                            body.position.set(snapX, snapY, snapZ);
                            // Triángulo: desfase centralizado (DUP-002); el resto, identidad
                            if (mesh.userData.pieceType === 'triangle') {
                                body.quaternion.set(
                                    TRIANGLE_QUAT_OFFSET.x, TRIANGLE_QUAT_OFFSET.y,
                                    TRIANGLE_QUAT_OFFSET.z, TRIANGLE_QUAT_OFFSET.w,
                                );
                            } else {
                                body.quaternion.set(0, 0, 0, 1);
                            }
                            body.velocity.setZero();
                            body.angularVelocity.setZero();
                            body.wakeUp();
                        }
                        console.log(`🧲 Pieza ${mesh.userData.label} atraída y alineada simétricamente a la altura correcta.`);
                    }
                }
            }
        },
    });

    // ─── UI + Responsive + Bucle principal ─────────────────────────────
    interfaceCtrl = setupInterface({
        piecesGroup: pieces,
        buildMaterial,
        lights,
    });

    setupResize(cam, renderer);

    setupAnimationLoop({
        scene,
        renderer,
        activeCameraRef,
        fpsControl: cameraController,
        pieces,
        physicsSystem,
        inputManager,
        dragManager,
        roomBounds: room.userData.bounds,
        onPostPhysics: () => {
            for (const child of pieces.children) {
                if (!child.isMesh) continue;
                const label = child.userData.label;
                
                // Si ya fue correctamente clasificada, no hacemos nada
                if (classifiedLabels.has(label)) continue;

                // Para evitar falsos positivos con piezas que están afuera en el suelo,
                // solo verificamos infracciones si la pieza está físicamente dentro del perímetro X/Z del clasificador.
                const halfOuter = OUTER / 2;
                const isInsideClassifierXZ = Math.abs(child.position.x) < halfOuter && Math.abs(child.position.z) < halfOuter;

                // Si la pieza pasó por debajo del panel superior Y está dentro de la caja
                if (isInsideClassifierXZ && child.position.y < WALL_HEIGHT - 0.2) {
                    // Guard canónico en tryClassify (DUP-009): si no clasifica, es infracción
                    if (!tryClassify(child)) {
                        // ¡ERROR! Entró en un hueco incorrecto (porque físicamente cabía).
                        // Reproducir sonido de error
                        playErrorSound();
                        
                        // Expulsar de vuelta a su posición original
                        const orig = child.userData.originalPos;
                        if (orig) teleportPiece(child, orig);
                        console.log(`❌ ¡Infracción! ${label} entró por un hueco equivocado y fue expulsada.`);
                    }
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

    // ─── Botón + tecla 'R' para reiniciar ─────────────────────────────
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = resetPieces;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') {
            // No reiniciar si está escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            resetPieces();
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

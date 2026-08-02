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
import { createInputManager }   from './controls/InputManager.js';
import { setupCameraFPS }       from './controls/CameraFPS.js';
import { setupInterface }       from './ui/Interface.js';
import { setupResize }          from './utils/ResizeHandler.js';
import { setupAnimationLoop }   from './animations/AnimationLoop.js';
import { createPhysicsWorld }   from './physics/PhysicsWorld.js';
import { createBodyFactory }    from './physics/BodyFactory.js';
import { createPhysicsSystem }  from './physics/PhysicsSystem.js';
import { createClassifierRules } from './game/ClassifierRules.js';
import { createTimer }           from './game/Timer.js';
import { HOLE_CONFIGS }         from './data/holeConfigs.js';
import { WALL_HEIGHT, PANEL_DEPTH, OUTER } from './data/classifierDimensions.js';
import { OrbitControls }        from 'three/addons/controls/OrbitControls.js';

try {
    let currentMode = 'infantil';
    let fpsControls;

    // ─── Input · Escena · Cámara · Renderer ────────────────────────────
    const inputManager = createInputManager();
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
        'src/imagenes/wood_color.webp',
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
            console.warn('[Texturas] No se pudo cargar src/imagenes/wood_color.webp. Usando color de madera plano Montessori.');
        }
    );

    // ─── Refs compartidas entre módulos ────────────────────────────────
    const draggingRef = { current: false };
    const activeCameraRef = { current: cam };

    // ─── Sonido de éxito Montessori (Xilofón de madera) ────────────────
    function playSuccessSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            // Nota 1 (fundamental suave)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle'; // Onda suave, tipo flauta o madera
            osc1.frequency.setValueAtTime(523.25, now); // C5 (Do)
            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            // Nota 2 (Armónico alegre de quinta posterior)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5 (Mi)
            gain2.gain.setValueAtTime(0.20, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.6);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.68);
        } catch (e) {
            console.warn('Web Audio no inicializado o bloqueado por el navegador:', e);
        }
    }

    // ─── Sonido de error Montessori (Tono grave seco) ───────────────────
    function playErrorSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth'; // Sonido rasposo de zumbador
            osc.frequency.setValueAtTime(140, now); // Frecuencia baja (error)
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {
            console.warn(e);
        }
    }

    // ─── Lógica del Estado del Juego (Fin de Juego / Victoria) ─────────
    let gameActive = true;

    function showGameOver(won) {
        gameActive = false;
        timer.stop();
        dragManager.setEnabled(false);
        if (currentMode === 'infantil') {
            orbitControls.enabled = false;
        } else if (fpsControls) {
            fpsControls.setEnabled(false);
        }

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
        if (currentMode === 'infantil') {
            orbitControls.enabled = true;
        } else if (fpsControls) {
            fpsControls.setEnabled(true);
        }

        resetPieces();
    });

    // ─── Control de clasificación (evita doble conteo) ─────────────────
    const classifiedLabels = new Set();
    function tryClassify(mesh) {
        if (!mesh || classifiedLabels.has(mesh.userData.label)) return;
        if (rules && rules.isOverOwnHole(mesh)) {
            classifiedLabels.add(mesh.userData.label);
            if (interfaceCtrl) interfaceCtrl.onPieceClassified(mesh.userData.label);
            console.log(`✅ ¡${mesh.userData.label} clasificado!`);
            playSuccessSound();

            // Si clasificó todas las piezas -> ¡Victoria!
            if (classifiedLabels.size === HOLE_CONFIGS.length) {
                setTimeout(() => {
                    showGameOver(true);
                }, 800); // Pequeña espera para que termine de caer
            }
        }
    }

    // ─── Cronómetro ────────────────────────────────────────────────────
    const timer = createTimer(() => showGameOver(false));

    // ─── Reset de piezas ──────────────────────────────────────────────
    function resetPieces() {
        for (const child of pieces.children) {
            if (!child.isMesh) continue;
            const orig = child.userData.originalPos;
            if (!orig) continue;

            // Posición visual
            child.position.copy(orig);
            child.quaternion.identity();

            // Posición física
            const body = child.userData.body;
            if (body) {
                body.position.set(orig.x, orig.y, orig.z);
                body.quaternion.set(0, 0, 0, 1);
                body.velocity.setZero();
                body.angularVelocity.setZero();
                body.wakeUp();
            }
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
    const rules = createClassifierRules(panel);

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
            // Desactivar órbita
            orbitControls.enabled = false;
            // Activar FPS
            fpsControls.setEnabled(true);
            fpsControls.resetRotation();
            // Posicionar a altura de ojos (1.6)
            cam.position.set(5, 1.6, 5);

            if (infantilBtn) infantilBtn.classList.remove('active');
            if (expertoBtn) expertoBtn.classList.add('active');
            if (hintEl) {
                hintEl.innerHTML = 'Modo WASD: WASD para caminar · Clic en pantalla para capturar mouse · Arrastrá figuras';
            }
        } else {
            // Desactivar FPS
            fpsControls.setEnabled(false);
            // Activar órbita
            orbitControls.enabled = true;
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

                    // Si está en un rango cercano (0.85 unidades) y arriba de la tapa
                    if (dist < 0.85 && mesh.position.y > WALL_HEIGHT - 0.6) {
                        const body = mesh.userData.body;
                        const snapX = cfg.cx;
                        const snapZ = -cfg.cy;
                        const snapY = WALL_HEIGHT + 1.2; // Se eleva un poco más arriba para centrarse

                        // Posición y rotación simétrica perfecta
                        mesh.position.set(snapX, snapY, snapZ);
                        mesh.quaternion.identity();

                        if (body) {
                            body.position.set(snapX, snapY, snapZ);
                            // Triángulo requiere una rotación especial en Cannon-es para alinearse físicamente
                            if (mesh.userData.pieceType === 'triangle') {
                                const s = Math.SQRT1_2;
                                body.quaternion.set(0, s, 0, s);
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
                    // Verificar si está sobre su hueco correcto
                    if (rules && rules.isOverOwnHole(child)) {
                        tryClassify(child);
                    } else {
                        // ¡ERROR! Entró en un hueco incorrecto (porque físicamente cabía).
                        // Reproducir sonido de error
                        playErrorSound();
                        
                        // Expulsar de vuelta a su posición original
                        const orig = child.userData.originalPos;
                        if (orig) {
                            child.position.copy(orig);
                            child.quaternion.identity();
                            
                            const body = child.userData.body;
                            if (body) {
                                body.position.set(orig.x, orig.y, orig.z);
                                body.quaternion.set(0, 0, 0, 1);
                                body.velocity.setZero();
                                body.angularVelocity.setZero();
                                body.wakeUp();
                            }
                        }
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
        loadingPhase.innerHTML = `<h2 style="color:#ff5566;">Error al cargar la aplicación 3D</h2><p style="color:#ccc; font-size:14px; margin-top:8px;">${err.message || err}</p>`;
    }
}

# CUBO CLASIFICADOR

Juego interactivo 3D en primera persona donde debes clasificar 4 piezas geométricas dejándolas caer en el hueco correcto de un cubo clasificador.

Construido con **Three.js r160** (render 3D) y **cannon-es 0.20** (físicas), todo desde un navegador sin build tools — ES modules nativos + import map.

---

## Como jugar

| Accion | Control |
|--------|---------|
| Mirar alrededor | Click en canvas (bloquea el mouse) + mover mouse |
| Caminar | **W A S D** |
| Agarrar / soltar pieza | Click sobre la pieza → arrastrar → soltar click |
| Mover pieza agarrada | **Flechas** del teclado |
| Soltar el mouse | **ESC** |

El objetivo es llevar cada pieza al hueco que coincide con su forma. Cuando la pieza esta sobre su hueco correcto y la sueltas, el sistema de fisicas la deja caer naturalmente a traves del hueco — no hay snap posicional.

---

## Las 4 piezas

| Pieza | Geometria 3D | Forma del hueco | Color |
|-------|-------------|-------------------|-------|
| **Esfera** | `SphereGeometry` (r=0.55) | Circulo | Rojo |
| **Cubo** | `BoxGeometry` (0.9) | Cuadrado | Azul |
| **Triangulo** | `ExtrudeGeometry` (prisma triangular, r=0.65, depth=0.9) | Triangulo equilatero | Verde |
| **Estrella** | `ExtrudeGeometry` (4 puntas, r=0.5) | Estrella 4 puntas | Cian |

Cada pieza se genera con su propia geometria y color, definidos en `data/holeConfigs.js` (fuente unica de verdad).

---

## Panel de control

En el panel lateral derecho puedes modificar la pieza seleccionada:

- **Material**: Lambert (mate, sin brillo), Phong (especular con shininess=90), Standard (PBR realista con roughness=0.35, metalness=0.45)
- **Textura procedural**: Rayas, Lunares, Degradado, Madera (generadas via Canvas 2D con RepeatWrapping)
- **Wireframe**: ON / OFF
- **Luces**: alternar Direccional (sombra), Techo (point light) y Ambiental individualmente

El **HUD** en la esquina superior izquierda muestra el estado actual del objeto seleccionado.

---

## Arquitectura del proyecto

```
CUBO_CLASIFICADOR/
├── index.html                 # Entry point: import map, HUD, panel de control
├── style.css                  # Tema oscuro cyber-punk con acentos cian
└── src/
    ├── index.js              # Orquestador: conecta todos los modulos con try-catch
    │
    ├── core/                  # Nucleo Three.js
    │   ├── SceneManager.js       # Escena con fondo 0x141416
    │   ├── CameraManager.js     # PerspectiveCamera 70 FOV, posicion (5, 1.6, 5)
    │   └── RendererManager.js   # WebGLRenderer + antialiasing + PCFSoftShadowMap
    │
    ├── objects/               # Geometria del mundo
    │   ├── Room.js               # Cuarto 14x8: piso, techo, 4 paredes con materiales PBR
    │   ├── Classifier.js         # Cubo clasificador hueco (ExtrudeGeometry con 4 holes)
    │   └── Pieces.js             # Las 4 piezas con fabrica de geometrias por pieceType
    │
    ├── lights/
    │   └── Lights.js             # 3 luces: ambiental (0.4), techo PointLight (1.2), direccional con shadow map 1024
    │
    ├── textures/
    │   └── TextureFactory.js     # 4 texturas procedurales via Canvas 2D: rayas, lunares, degradado, madera
    │
    ├── materials/
    │   └── MaterialFactory.js    # Fabrica: lambert / phong / standard + textura + wireframe toggle
    │
    ├── controls/              # Input y camara
    │   ├── InputManager.js       # Input centralizado con pointer lock + fallback teclado no-QWERTY + dispose
    │   ├── CameraFPS.js          # Camara FPS: pitch/yaw, WASD, colision AABB contra obstaculos
    │   └── DragManager.js        # Arrastre con raycasting, modo kinematic, updateArrowInput
    │
    ├── physics/               # Simulacion fisica (cannon-es)
    │   ├── PhysicsWorld.js       # Mundo con gravedad -35, solver 30 iter, contact materials, sleep
    │   ├── BodyFactory.js        # Fabrica de bodies: piezas (dinamicos), paredes/panel/piso (estaticos)
    │   └── PhysicsSystem.js      # Step por frame, sync mesh-body, modo kinematic, drag trail
    │
    ├── game/
    │   ├── ClassifierRules.js    # Logica: verifica si la pieza esta sobre su hueco
    │   ├── HoleDetector.js       # Deteccion punto-en-hueco con tolerancia (circulo, cuadrado, triangulo, estrella)
    │   └── Timer.js              # Modulo desacoplado para gestion del temporizador del juego
    │
    ├── ui/
    │   └── Interface.js          # HUD + panel de control: seleccion, materiales, texturas, wireframe, luces
    │
    ├── animations/
    │   └── AnimationLoop.js      # Bucle principal: delta capped 1/30, fisicas, safety net, render
    │
    ├── utils/                 # Funciones transversales
    │   ├── ResizeHandler.js      # Responsive: resize camara + renderer optimizado con requestAnimationFrame
    │   ├── CollisionHelper.js    # Helper centralizado para consultas AABB (intersectsAnyObstacle, isPointInsideBox)
    │   ├── math.js               # Utilidad de restriccion espacial (clampToBounds)
    │   ├── geometry.js           # pointInTriangle, pointInPolygon, computeStarPoints (re-exporta SSOT)
    │   └── holeShapes.js         # Generacion de Paths Three.js para los 4 tipos de hueco
    │
    └── data/                  # Configuracion centralizada
        ├── holeConfigs.js          # FUENTE UNICA: posicion, tamanio, color de cada hueco y pieza
        ├── classifierDimensions.js # Constantes: OUTER=4, WALL_HEIGHT=2.5, PANEL_DEPTH=0.5, etc.
        ├── physicsConstants.js     # Constantes de fisica Cannon-es (restitution, friction, damping)
        └── shapeVertices.js        # Single Source of Truth para construccion de vertices 2D/3D
```

---

## Detalles tecnicos

### Renderizado

- **Three.js r160** via CDN (import map)
- **WebGLRenderer** con antialiasing, pixel ratio limitado a 2, PCFSoftShadowMap
- **Camara** perspectiva 70 FOV, near=0.1, far=100, altura de ojos 1.6
- **Luz direccional** con shadow map 1024x1024, camara de sombras con frustum ±8, near=0.5, far=25
- **Fondo** gris oscuro `0x141416`

### Fisicas (cannon-es 0.20)

- **Gravedad**: `(0, -35, 0)` — mas fuerte que la real para mejor game feel
- **Solver**: 30 iteraciones para contactos estables
- **Fixed timestep**: `world.fixedStep(1/240, dt)` con dt maximo 1/30 para evitar espiral de muerte
- **Materiales de colision**: piece, wall, panel, ground con friction y restitution configurados por par
- **Sleep**: cuerpos quietos entran en sleep (speedLimit=0.12, timeLimit=1.0) para ahorrar CPU

### Panel perforado (fisica)

El panel del clasificador construye una grilla estatica de cuerpos `CANNON.Box` compuestos que omiten las zonas con huecos mediante `isInsideAnyHole()`. Esto permite colisiones estables para todas las formas 3D (esfera, cubo, prisma triangular y estrella) sin las limitaciones de compatibilidad de `CANNON.Trimesh`.

### Huecos visuales (ExtrudeGeometry)

El panel superior usa `THREE.Shape` con el contorno exterior cuadrado y `shape.holes` poblado con paths generados por `holeShapes.js`. Cada path debe tener winding opuesto al contorno exterior para que Three.js lo reconozca como hueco.

**Gotcha conocido**: El hueco triangular requiere que los vertices se generen en sentido CW (horario: top → bottom-right → bottom-left). Con el orden original (top → bottom-left → bottom-right), el algoritmo earcut de Three.js r160 no calcula correctamente el puente del hueco cuando el poligono se queda con exactamente 3 vertices despues de filtrar puntos colineales.

### Formas fisicas de las piezas

Cada pieza mapea su `pieceType` a una forma cannon-es:
- **sphere**: `CANNON.Sphere`
- **box**: `CANNON.Box`
- **triangle**: `CANNON.Cylinder(r, r, h, 3)` — prisma triangular
- **star**: `CANNON.Cylinder(r, r, h, 8)` — aproximacion del concavo

### Sistema de arrastre (DragManager)

- **Raycasting**: selecciona piezas via `Raycaster` desde la camara
- **Modo kinematic**: al agarrar, el body pasa a `KINEMATIC` y se mueve con `setKinematicPosition()`. Al soltar, vuelve a dinamico con velocidad derivada de un trail de las ultimas 8 posiciones
- **Colision AABB contra clasificador**: verifica traslape del AABB de la pieza contra `obstacleBoxes` precomputados de las paredes
- **Deslizamiento por eje**: `clampMovement()` prueba X, Z, Y por separado para evitar que la pieza se trabe
- **limitStep**: limita el desplazamiento por frame al semi-tamanio del AABB para evitar tunneling
- **Velocidad de soltado**: suave, calculada desde el drag trail, con maximo `MAX_RELEASE_SPEED=5`
- **Flechas del teclado**: mueven la pieza seleccionada via `moveSelectedBy(dx, dz)`

### Camara FPS (CameraFPS)

- **Mouse look**: acumula yaw/pitch con pitch clampado a ±(PI/2 - 0.05), orden de rotacion YXZ
- **WASD**: vector forward con pitch, vector right horizontal puro, normalizado, escalado a speed=0.08
- **Colision AABB**: `isBlocked()` contra obstaculos (mesh del clasificador) con `COLLIDE_MARGIN=0.35`
- **Pointer lock**: se activa SOLO si no se esta arrastrando una pieza (via `draggingRef`)
- **Limites del cuarto**: clamp a `roomBounds` con margen 0.5

### InputManager

- `keys` diccionario de estado de teclas
- **Fallback teclados no-QWERTY**: mapea `e.code` (KeyW, KeyA, KeyS, KeyD) a `e.key` para compatibilidad internacional
- Previene default en WASD y flechas para evitar scroll

### Texturas procedurales

Generadas en canvas 2D de 256x256 con `RepeatWrapping` y `repeat.set(2, 2)`:

| Textura | Descripcion |
|---------|-------------|
| **Rayas** | Fondo oscuro con rayas naranjas horizontales |
| **Lunares** | Fondo verde oscuro con puntos cian en grilla |
| **Degradado** | Degradado lineal rosa → violeta → cian |
| **Madera** | Fondo marron con vetas simuladas con `Math.sin()` + ruido |

### Bucle principal (AnimationLoop)

Cada frame:
1. Calcula delta time, capado a 1/30
2. `fpsControl.update()` — actualiza camara (input WASD + mouse)
3. `physicsSystem.update(dt, draggedMesh)` — un paso de fisica + sincroniza bodies → meshes
4. `clampToRoomBounds(draggedMesh)` — safety net: si una pieza escapo del cuarto, la clampa y anula velocidad
5. Movimiento con flechas si hay pieza seleccionada
6. `renderer.render(scene, camera)`

### Logica del juego (ClassifierRules)

- `isOverOwnHole(mesh)` verifica si la pieza esta sobre su hueco correspondiente
- Filtro rapido: si `mesh.position.y < WALL_HEIGHT - 1.0`, retorna false (muy abajo)
- Convierte posicion mundial a coordenadas del Shape (`sx = x`, `sy = -z`)
- Usa `HoleDetector.isInsideHole()` con tolerancia 0.1 para compensar imprecision de camara FPS
- En `onDragEnd` de DragManager, si la pieza esta sobre su hueco, muestra mensaje en consola

---

## Como ejecutar

No requiere build ni servidor — es HTML + modulos ES nativos.

```bash
# Opcion 1: servidor local (recomendado)
python3 -m http.server 8080
# luego abre http://localhost:8080

# Opcion 2: con Node
npx serve .

# Opcion 3: abrir directamente (puede fallar por CORS)
firefox index.html
```

---

## Mejoras posibles

- Sistema de puntuacion / timer
- Feedback visual y sonoro cuando una pieza encaja
- Mas piezas y formas de hueco (rectangulo, hexagono, cono, cilindro)
- Modo multijugador o niveles progresivos
- Shaders personalizados en lugar de texturas procedurales canvas
- Instancing para multiples cubos clasificadores
- Particulas al encajar una pieza
- Animacion de camara al completar el juego

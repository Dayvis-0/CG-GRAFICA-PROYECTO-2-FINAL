# AUDITORÍA TÉCNICA — CUBO CLASIFICADOR

- **Proyecto**: `CUBO_CLASIFICADOR/` — Juego 3D de clasificación de figuras (Three.js r160 + cannon-es 0.20)
- **Tipo de auditoría**: Fase 0 — Análisis completo. Sin modificaciones.
- **Método**: Lectura exhaustiva de los 33 archivos del proyecto + verificación cruzada de imports, llamadas y referencias (grep) para sustentar cada hallazgo con evidencia.
- **Estado del repo**: Sin package.json (sin build tools, ES modules nativos + import map). Sin tests automatizados.
- **Fecha**: 2026-08-01

---

## Resumen Ejecutivo

El proyecto es un juego funcional y bien estructurado para su tamaño: separa correctamente **core** (escena/cámara/renderer), **objects**, **physics**, **controls**, **game**, **ui**, **data** y **utils**, con una clara intención de aplicar Single Source of Truth (config centralizada en `data/`). El nivel técnico es notablemente bueno: uso de reusables para evitar GC en el hot path, cacheo de half-sizes, lazy loading de texturas, modo kinematic para el arrastre con trail de velocidad, y documentación de gotchas reales (bug de earcut con triángulos de 3 vértices, limitaciones de `CANNON.Trimesh`).

Sin embargo, se detectaron **52 hallazgos** (problemas + observaciones) distribuidos en: 9 de duplicación, 10 de código muerto, 5 de documentación desactualizada, 6 de consistencia, 5 de arquitectura/acoplamiento, 6 de rendimiento, 4 de seguridad, 3 de SRP y 4 de manejo de errores. El hallazgo más relevante es que **`src/index.js` (499 líneas) es un "god module"** que concentra orquestación, estado de juego, sonidos, lógica de victoria, snap magnético y eventos DOM — violando SRP y concentrando el riesgo de la aplicación. Le siguen en importancia la **duplicación de la lógica de quaternion del triángulo en 4 archivos** (alto riesgo de regresión si se toca en un solo lugar) y la **duplicación del reset/teletransporte de piezas** en `index.js`.

El proyecto funciona hoy; la estrategia recomendada es refactorizar por fases de riesgo creciente, verificando manualmente el juego después de cada fase (no hay tests).

---

## Fortalezas detectadas

1. **Separación de responsabilidades por carpeta** correcta para el dominio (F-001, F-002, etc. no aplican — es una fortaleza).
2. **Fuente única de verdad** bien aplicada: `data/holeConfigs.js`, `data/classifierDimensions.js`, `data/physicsConstants.js` consumidos por múltiples módulos sin duplicar valores.
3. **Código de alto rendimiento consciente**: reusables (`_candBox`, `_size`, `target`, `offset`), cacheo de half-size en `DragManager` y `AnimationLoop` (WeakMap), lazy loading de texturas (`TextureFactory`), pixelRatio limitado a 2.
4. **Documentación de gotchas reales** en el código y README (bug earcut r160, limitaciones Trimesh, fallback no-QWERTY).
5. **Manejo de errores defensivo en varios puntos**: try/catch global en `index.js`, error callback en `TextureLoader`, guards `?.` y null-checks generalizados.
6. **API de teardown** (`dispose()`) presente en los módulos de input/controles (aunque no se invoca).
7. **Comentarios en español, consistentes y explicativos** del "por qué" (no del "qué").

---

## Inventario de archivos

| Archivo | Líneas | Rol |
|---|---|---|
| `index.html` | 135 | Entry point: import map, overlays, HUD, panel |
| `style.css` | 473 | Tema visual + responsividad |
| `README.md` | 232 | Documentación (desactualizada en parte) |
| `src/index.js` | 499 | Orquestador / god module |
| `src/core/SceneManager.js` | 10 | Escena |
| `src/core/CameraManager.js` | 15 | Cámara |
| `src/core/RendererManager.js` | 15 | Renderer |
| `src/objects/Room.js` | 92 | Cuarto |
| `src/objects/Classifier.js` | 112 | Cubo clasificador con huecos |
| `src/objects/Pieces.js` | 72 | 4 piezas |
| `src/lights/Lights.js` | 33 | 3 luces |
| `src/textures/TextureFactory.js` | 75 | 4 texturas procedurales lazy |
| `src/materials/MaterialFactory.js` | 30 | Fábrica de materiales |
| `src/controls/InputManager.js` | 86 | Input centralizado |
| `src/controls/CameraFPS.js` | 148 | Cámara FPS |
| `src/controls/DragManager.js` | 330 | Arrastre kinematic + colisiones |
| `src/physics/PhysicsWorld.js` | 65 | Mundo cannon + materiales |
| `src/physics/BodyFactory.js` | 273 | Fábrica de bodies (incl. grilla del panel) |
| `src/physics/PhysicsSystem.js` | 204 | Step, sync, kinematic, trail |
| `src/game/ClassifierRules.js` | 31 | Reglas (¿pieza sobre su hueco?) |
| `src/game/Timer.js` | 80 | Cronómetro |
| `src/ui/Interface.js` | 208 | HUD + panel |
| `src/animations/AnimationLoop.js` | 119 | Bucle principal |
| `src/utils/HoleDetector.js` | 61 | Detección punto-en-forma |
| `src/utils/CollisionHelper.js` | 39 | AABB helpers |
| `src/utils/ResizeHandler.js` | 32 | Responsive |
| `src/utils/geometry.js` | 16 | pointInTriangle |
| `src/utils/holeShapes.js` | 76 | Paths de huecos |
| `src/utils/math.js` | 25 | clampToBounds |
| `src/data/holeConfigs.js` | 61 | SSOT piezas/huecos |
| `src/data/classifierDimensions.js` | 9 | SSOT dimensiones |
| `src/data/physicsConstants.js` | 16 | Constantes de física |
| `src/imagenes/wood_color.webp` | — | Textura local (800×534) |

---

# FASE 1 — Problemas críticos puntuales

**Objetivo**: Corregir bugs reales y antipatrones de riesgo con cambios mínimos (3–10 líneas), verificables al instante. No requiere refactor de arquitectura.

**Lista de tareas**: ERR-001, ERR-002, ERR-003, ERR-005

**Archivos afectados**: `src/index.js`

**Justificación**: Son los únicos hallazgos que constituyen defectos funcionales o de robustez ejecutables hoy; el resto son deuda técnica. Al ser cambios puntuales, el riesgo de regresión es bajo y el beneficio inmediato.

**Impacto esperado**: Elimina el bug de victoria tras reinicio, evita el antipatrón `innerHTML` con errores, agrega fallback para navegadores sin WebGL y evita bucles de sonido.

**Prioridad**: Alta

---

### ERR-001 — El overlay de victoria puede aparecer después de reiniciar la partida
- **Categoría**: Bug funcional
- **Prioridad**: Alta
- **Archivos**: `src/index.js` (L204–206, L215–241)
- **Descripción**: Al clasificar la 4ª pieza se programa `setTimeout(() => showGameOver(true), 800)`. Si el jugador presiona R o el botón REINICIAR dentro de esa ventana de 800 ms, `resetPieces()` limpia el estado pero **no cancela el timeout**, y el overlay "COMPLETADO" se muestra sobre la partida ya reiniciada.
- **Evidencia**: `index.js` L204–206: `setTimeout(...)` sin guardar el handle; `resetPieces()` (L215–241) no lo limpia. No existe `clearTimeout` en todo el proyecto.
- **Motivo**: Estado inconsistente (overlay de victoria con partida reiniciada y controles reactivados antes de tiempo).
- **Riesgos de modificar**: Mínimo. Guardar el handle en una variable y `clearTimeout` en `resetPieces()` y en `showGameOver()`.
- **Recomendación**: `const winTimeout = setTimeout(...)` y `clearTimeout(winTimeout)` al inicio de `resetPieces()`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 1

### ERR-002 — Sin manejo de error si WebGL no está disponible
- **Categoría**: Manejo de errores
- **Prioridad**: Media
- **Archivos**: `src/core/RendererManager.js`, `src/index.js`
- **Descripción**: `new THREE.WebGLRenderer(...)` lanza una excepción si el navegador no soporta WebGL. El try/catch global de `index.js` la captura y muestra el error en el overlay, pero el mensaje sería técnico y en inglés; no hay mensaje amigable ni detección previa.
- **Evidencia**: `RendererManager.js` L9 sin try/catch propio; el catch global en `index.js` L493–498.
- **Motivo**: Experiencia de usuario y diagnóstico claro en dispositivos sin WebGL.
- **Riesgos de modificar**: Bajo. Envolver la creación en try/catch dentro de `createRenderer` y relanzar con mensaje en español, o verificar `WebGLRenderingContext`.
- **Recomendación**: Detectar soporte (`!!document.createElement('canvas').getContext('webgl2') || 'webgl'`) y mostrar un mensaje claro en el loading overlay.
- **Dependencias**: Ninguna.
- **Fase**: FASE 1

### ERR-003 — Inyección de HTML vía `innerHTML` con mensaje de error
- **Categoría**: Seguridad / Manejo de errores
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L497)
- **Descripción**: En el catch global se hace `loadingPhase.innerHTML = ... ${err.message || err}`. Si el mensaje de error contiene HTML (posible con mensajes de CDN, minificadores o proveedores de error), se inyecta en el DOM.
- **Evidencia**: `index.js` L497: interpolación directa de `err.message` en `innerHTML`.
- **Motivo**: Es un antipatrón de seguridad. Riesgo real bajo (no hay entrada de usuario en la cadena), pero la corrección es trivial y elimina la clase de bug por completo.
- **Riesgos de modificar**: Nulo. Usar `textContent` o construir nodos.
- **Recomendación**: Reemplazar por `loadingPhase.textContent = ...` o armar el mensaje con `document.createElement`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 1

### ERR-005 — `playErrorSound` puede dispararse en bucle
- **Categoría**: Robustez / Rendimiento
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L117–139, L435–460)
- **Descripción**: El sonido de error se reproduce en `onPostPhysics` cada vez que una pieza está dentro del clasificador en un hueco incorrecto. Hoy la pieza es expulsada síncronamente, por lo que suena una vez; pero si la expulsión fallara o la pieza quedara atascada (cambio de físicas, tunelado), el sonido se repetiría cada frame (60/s), creando contextos de audio en masa.
- **Evidencia**: `index.js` L442 `playErrorSound()` dentro del loop de post-física; `playErrorSound()` crea un `new AudioCtx()` por llamada (L121).
- **Motivo**: Prevención de un bucle de audio/CPU ante regresiones futuras.
- **Riesgos de modificar**: Bajo. Agregar un cooldown (timestamp de última reproducción) o marcar la pieza como "expulsada" hasta que salga del clasificador.
- **Recomendación**: Cooldown simple: `if (now - lastErrorSound < 400) return;`.
- **Dependencias**: PERF-001 (contexto de audio singleton) — se puede hacer juntos.
- **Fase**: FASE 1

---

# FASE 2 — Documentación desactualizada

**Objetivo**: Alinear README y JSDoc con la realidad del código. Cero riesgo: solo texto.

**Lista de tareas**: DOC-001, DOC-002, DOC-003, DOC-004, DOC-005

**Archivos afectados**: `README.md`, `src/data/holeConfigs.js`, `src/utils/holeShapes.js`

**Justificación**: La documentación describe piezas, archivos y comportamientos que ya no existen o nunca existieron; es la fuente de confusión número uno para quien retome el proyecto.

**Impacto esperado**: README y JSDoc verificables contra el código; on-boarding inmediato.

**Prioridad**: Media

---

### DOC-001 — README describe la pieza "Estrella" que no existe (es "Rombo")
- **Categoría**: Documentación
- **Prioridad**: Media
- **Archivos**: `README.md` (L29–30, L147–148)
- **Descripción**: El README documenta 4 piezas: Esfera, Cubo, Triángulo y **Estrella** (con forma física `CANNON.Cylinder(r,r,h,8)`). El código actual usa **Rombo** (`shape: 'rhombus'`, `pieceType: 'rhombus'`).
- **Evidencia**: `README.md` L29–30 ("Estrella", "Cyan", "4 puntas") y L147–148 (`star: CANNON.Cylinder(r, r, h, 8)`); `holeConfigs.js` L51–61 (label `'Rombo'`, `shape: 'rhombus'`, color `0xffe57f` amarillo); `Pieces.js` GEO_BUILDERS y `Classifier.js` HOLE_BUILDERS no tienen caso `star`.
- **Motivo**: La documentación miente sobre el contenido del juego.
- **Riesgos de modificar**: Nulo (solo texto).
- **Recomendación**: Actualizar tabla de piezas, colores y formas físicas a: Esfera/Círculo/Rojo, Cubo/Cuadrado/Celeste, Triángulo/Triángulo/Verde menta, Rombo/Rombo/Amarillo.
- **Dependencias**: Ninguna.
- **Fase**: FASE 2

### DOC-002 — README cita archivos y funciones inexistentes
- **Categoría**: Documentación
- **Prioridad**: Media
- **Archivos**: `README.md` (L89, L102, L109)
- **Descripción**: El árbol de arquitectura del README referencia `src/game/HoleDetector.js` (el archivo real es `src/utils/HoleDetector.js`), `src/data/shapeVertices.js` (no existe) y funciones `pointInPolygon`, `computeStarPoints` en `geometry.js` (no existen; solo está `pointInTriangle`).
- **Evidencia**: `find` del proyecto no lista `shapeVertices.js`; `geometry.js` (16 líneas) solo exporta `pointInTriangle`; grep de `computeStarPoints`/`pointInPolygon`/`shapeVertices` → solo aparece en el README.
- **Motivo**: El mapa de arquitectura es la puerta de entrada al proyecto; referencias rotas confunden.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Corregir rutas y eliminar menciones a funciones/archivos inexistentes.
- **Dependencias**: Ninguna.
- **Fase**: FASE 2

### DOC-003 — README contradice el código: "no hay snap posicional" vs. snap magnético
- **Categoría**: Documentación
- **Prioridad**: Media
- **Archivos**: `README.md` (L19), `src/index.js` (L362–398)
- **Descripción**: El README afirma "no hay snap posicional" y que la pieza cae naturalmente. El código implementa un **snap magnético**: si la pieza se suelta a menos de 0.85 unidades del centro de su hueco y por encima de la tapa, se alinea simétricamente y se reorienta (incluida la rotación especial del triángulo).
- **Evidencia**: `README.md` L19; `index.js` L363–396 (bloque del `if (dist < 0.85 && ...)` con `mesh.position.set(snapX, snapY, snapZ)` y `body.quaternion.set(...)`).
- **Motivo**: La mecánica documentada no es la real; un futuro desarrollador intentaría "arreglar" algo que es comportamiento intencional.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Documentar el snap: distancia de atracción 0.85, altura de alineación `WALL_HEIGHT + 1.2`, rotación simétrica.
- **Dependencias**: Ninguna.
- **Fase**: FASE 2

### DOC-004 — JSDoc desactualizado en `holeConfigs.js`
- **Categoría**: Documentación
- **Prioridad**: Baja
- **Archivos**: `src/data/holeConfigs.js` (L7–11)
- **Descripción**: El JSDoc del array declara `shape: 'circle'|'square'|'triangle'|'star'` y `pieceType: 'sphere'|'box'|'triangle'|'star'`; los datos reales usan `'rhombus'` (y no `'star'`).
- **Evidencia**: `holeConfigs.js` L7–11 vs L52–61.
- **Motivo**: El contrato tipado documentado es falso; cualquier refactor con ese JSDoc fallaría.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Cambiar `'star'` por `'rhombus'` en ambas uniones.
- **Dependencias**: Ninguna.
- **Fase**: FASE 2

### DOC-005 — Comentarios muertos y referencias a piezas inexistentes
- **Categoría**: Documentación
- **Prioridad**: Baja
- **Archivos**: `src/utils/holeShapes.js` (L57–62, L10)
- **Descripción**: Existe un bloque de doc "Crea un hueco en forma de estrella de N puntas" sin ninguna función asociada (resto de un refactor anterior), y `circleHole` se documenta "para Esfera y Cilindro" cuando el Cilindro no es una pieza del juego.
- **Evidencia**: `holeShapes.js` L57–61 (comentario huérfano) y L10.
- **Motivo**: Ruido que sugiere funcionalidad inexistente.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Eliminar el comentario huérfano; corregir el doc de `circleHole`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 2

---

# FASE 3 — Código muerto

**Objetivo**: Eliminar ramas, constantes, parámetros y assets que el código nunca usa, **verificando con grep antes y después** de cada eliminación.

**Lista de tareas**: DEAD-001 … DEAD-010

**Archivos afectados**: `src/data/physicsConstants.js`, `src/physics/BodyFactory.js`, `src/objects/Room.js`, `src/materials/MaterialFactory.js`, `index.html`, `src/core/CameraManager.js`, `src/game/ClassifierRules.js`

**Justificación**: El código muerto aumenta la superficie de mantenimiento y sugiere funcionalidad que no existe (fuente de confusión y de bugs futuros).

**Impacto esperado**: Menos código que mantener y documentar; menor carga de red (Google Fonts).

**Prioridad**: Media

---

### DEAD-001 — 5 constantes de `PHYSICS_CONSTANTS` sin uso
- **Categoría**: Código muerto
- **Prioridad**: Media
- **Archivos**: `src/data/physicsConstants.js` (L6–17)
- **Descripción**: `DEFAULT_RESTITUTION`, `PANEL_FRICTION`, `PIECE_FRICTION`, `PIECE_MASS` y `DEFAULT_CYLINDER_SEGMENTS` nunca se importan ni usan. Peor: la fricción que SÍ se usa está hardcodeada en `PhysicsWorld.js`, ignorando estas constantes.
- **Evidencia**: Grep de `PHYSICS_CONSTANTS` → solo 5 keys usadas en `BodyFactory` (LINEAR_DAMPING, ANGULAR_DAMPING, SLEEP_SPEED_LIMIT, SLEEP_TIME_LIMIT, MIN_WALL_THICKNESS). `PhysicsWorld.js` L37–58 usa fricciones literales (0.45, 0.6, 0.02, 0.7). `PIECE_MASS` ignorado: `index.js` L262 hardcodea `registerPiece(piece, 1.0)`.
- **Motivo**: Falsa centralización: quien edite `physicsConstants.js` creerá que cambia el juego y no cambiará nada.
- **Riesgos de modificar**: Bajo si se hace en dos pasos: primero conectar `PhysicsWorld`/`index.js` a las constantes (ver CON-002), luego eliminar las que sigan sin uso.
- **Recomendación**: Mover fricciones a las constantes y eliminar las 5 sin uso; usar `PIECE_MASS` en `index.js`.
- **Dependencias**: CON-002.
- **Fase**: FASE 3 (tras FASE 4 opcional)

### DEAD-002 — `getMeshFromBody` y el mapa `bodyIdToMesh` nunca se usan
- **Categoría**: Código muerto
- **Prioridad**: Baja
- **Archivos**: `src/physics/BodyFactory.js` (L34–35, L269–273)
- **Descripción**: El mapa inverso `bodyIdToMesh` se puebla en `registerPiece`/`registerStatic` y se expone `getMeshFromBody`, pero ningún módulo la invoca.
- **Evidencia**: Grep de `getMeshFromBody` → solo definición y retorno; ningún import.
- **Motivo**: Código sin consumidores.
- **Riesgos de modificar**: Muy bajo; es API interna. Verificar grep de `bodyIdToMesh` antes de eliminar.
- **Recomendación**: Eliminar el mapa y la función, o documentar que es API pública de reserva.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-003 — Parámetro `buildMaterial` de `createRoom` nunca se pasa
- **Categoría**: Código muerto
- **Prioridad**: Media
- **Archivos**: `src/objects/Room.js` (L9, L12, L18–46)
- **Descripción**: `createRoom` acepta `buildMaterial` opcional y tiene ramas ternarias para usarlo, pero el único llamador (`index.js` L40) invoca `createRoom({ size: 14, height: 8 })` sin él. Todo el bloque condicional es inalcanzable.
- **Evidencia**: Grep de `buildMaterial` → en `index.js` solo se crea (L53) y se pasa a `setupInterface` (L405); `createRoom` se llama sin él (L40). El propio JSDoc de `Room.js` lo anota como "(opcional, DUP-004)".
- **Motivo**: Las ramas muertas duplican la creación de materiales (DUP-004) sin beneficiar a nadie.
- **Riesgos de modificar**: Bajo. Eliminar el parámetro y las ramas ternarias, dejando los materiales fijos; o, si se quiere unificación, pasar `buildMaterial` desde `index.js` y eliminar los literales.
- **Recomendación**: Decidir entre las dos vías; la de menor riesgo es eliminar el parámetro.
- **Dependencias**: DUP-004 (contexto).
- **Fase**: FASE 3

### DEAD-004 — Casos `cone` y `cylinder` en `buildPieceShape` sin piezas asociadas
- **Categoría**: Código muerto
- **Prioridad**: Baja
- **Archivos**: `src/physics/BodyFactory.js` (L55–73)
- **Descripción**: `buildPieceShape` implementa formas para `'cone'` y `'cylinder'`, pero las únicas piezas configuradas son `sphere`, `box`, `triangle` y `rhombus`. Ningún `pieceType` actual puede alcanzar esos casos (el default cubriría cualquier otro).
- **Evidencia**: `holeConfigs.js` L17–61 (4 piezas); `BodyFactory.js` L55–73.
- **Motivo**: YAGNI — soporte para piezas que no existen, con lógica adicional que mantener.
- **Riesgos de modificar**: Bajo, siempre que el grep confirme que ningún `HOLE_CONFIGS` usa esos tipos. Si a futuro se agregan cono/cilindro, se reintroducen con su config.
- **Recomendación**: Eliminar ambos casos (o conservarlos documentando que son extensión futura).
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-005 — Google Fonts Quicksand se carga pero nunca se aplica
- **Categoría**: Código muerto / Rendimiento
- **Prioridad**: Media
- **Archivos**: `index.html` (L9–12), `style.css`
- **Descripción**: Se carga la fuente Quicksand (2 peticiones a Google Fonts + preconnect), pero `style.css` usa exclusivamente `font-family: 'Courier New', monospace` en `html, body` y en los elementos puntuales. Ninguna regla CSS referencia `Quicksand`.
- **Evidencia**: Grep de `Quicksand` → solo `index.html` L12; `style.css` L19, 101, 343, 366, 459 usan Courier New.
- **Motivo**: Peticiones de red y bloqueo de render innecesarios para una fuente que no se usa.
- **Riesgos de modificar**: Nulo visual si se elimina (el layout ya usa Courier). Si se quiere el estilo infantil, aplicar la fuente y eliminar Courier.
- **Recomendación**: Eliminar el `<link>` de Google Fonts y los preconnects, o aplicarla de verdad.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-006 — Evento `cdn-fallback` se despacha pero nunca se escucha
- **Categoría**: Código muerto
- **Prioridad**: Baja
- **Archivos**: `index.html` (L40)
- **Descripción**: El script de fallback de CDN lanza `document.dispatchEvent(new CustomEvent('cdn-fallback'))` tras reescribir el import map, pero ningún listener reacciona a ese evento.
- **Evidencia**: Grep de `cdn-fallback` → solo el dispatch en `index.html` L40.
- **Motivo**: Señalización sin receptor; el fallback funciona igual (el import map se reescribe), pero el evento sugiere una funcionalidad que no existe.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Eliminar el dispatch o agregar un listener que muestre un aviso en consola/UI.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-007 — Rama de fallback inalcanzable en `MaterialFactory`
- **Categoría**: Código muerto
- **Prioridad**: Baja
- **Archivos**: `src/materials/MaterialFactory.js` (L9)
- **Descripción**: `const tex = textures.get ? textures.get(textureKey) : (textures[textureKey] || null);` — el operador ternario contempla un `textures` sin `.get`, pero `createTextures()` siempre devuelve `{ get }`. La rama derecha es inalcanzable.
- **Evidencia**: `TextureFactory.js` L30 `return { get };`; `MaterialFactory.js` L9.
- **Motivo**: Complejidad muerta que sugiere dos contratos.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Simplificar a `textures.get(textureKey)`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-008 — Posición inicial de cámara sobrescrita al instante (Observación)
- **Categoría**: Código muerto (observación)
- **Prioridad**: Baja
- **Archivos**: `src/core/CameraManager.js` (L13), `src/index.js` (L37)
- **Descripción**: `createCamera()` posiciona la cámara en `(5, 1.6, 5)`, pero `index.js` la reubica en `(0, 4.5, 6.0)` inmediatamente después (y `setCameraMode` volverá a reubicarla). El valor de `CameraManager` nunca se ve.
- **Evidencia**: `CameraManager.js` L13; `index.js` L37; `index.js` L314.
- **Motivo**: Valor muerto que induce a error (el JSDoc de CameraManager describe la posición como la real).
- **Riesgos de modificar**: Nulo; es solo inicialización.
- **Recomendación**: Eliminar el `position.set` de `CameraManager` (la posición la define el modo de cámara) o mover la lógica de posición inicial de `index.js` a `CameraManager`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-009 — Parámetro `panelMesh` de `createClassifierRules` usado solo como guard (Observación)
- **Categoría**: Código muerto (observación)
- **Prioridad**: Baja
- **Archivos**: `src/game/ClassifierRules.js` (L11, L19)
- **Descripción**: `createClassifierRules(panelMesh)` recibe el mesh del panel pero solo lo usa en el null-check `if (!panelMesh || !mesh ...)`. No se utiliza para ningún cálculo.
- **Evidencia**: `ClassifierRules.js` L19 — única aparición de `panelMesh` tras la firma.
- **Motivo**: Contrato engañoso; el parámetro parece necesario cuando no lo es para la lógica.
- **Riesgos de modificar**: Bajo; si se elimina, quitar también el guard o conservarlo como validación semántica.
- **Recomendación**: Eliminar el parámetro o documentar que es una validación de precondición.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

### DEAD-010 — APIs `dispose()` nunca invocadas (Observación)
- **Categoría**: Código muerto (observación)
- **Prioridad**: Baja
- **Archivos**: `src/controls/InputManager.js` (L81), `src/controls/CameraFPS.js` (L126), `src/controls/DragManager.js` (L325), `src/utils/ResizeHandler.js` (L28)
- **Descripción**: Los cuatro módulos exponen `dispose()` para remover listeners, pero la aplicación nunca lo llama (no hay teardown; la app vive hasta cerrar la pestaña). No es un defecto hoy, pero es deuda para un futuro HMR/testing.
- **Evidencia**: Grep de `dispose` → solo definiciones; `index.js` no lo invoca.
- **Motivo**: Sin consumidores, el código de teardown no se ejercita y puede pudrirse.
- **Riesgos de modificar**: Nulo; es solo documentación o eliminación.
- **Recomendación**: Documentar como "reserva para HMR/tests" o eliminarlo. No invertir en wiring hoy.
- **Dependencias**: Ninguna.
- **Fase**: FASE 3

---

# FASE 4 — Consistencia y convenciones

**Objetivo**: Unificar convenciones de nombres, fuentes de constantes y estilos CSS. Cambios mecánicos y verificables.

**Lista de tareas**: CON-001 … CON-006

**Archivos afectados**: Módulos `src/` en general, `style.css`, `src/data/physicsConstants.js`, `src/physics/PhysicsWorld.js`

**Justificación**: Dos convenciones de fábrica, dos fuentes para la fricción y CSS mixto (vars + hex) aumentan la fricción de mantenimiento y el riesgo de editar el lugar equivocado.

**Impacto esperado**: Convenciones únicas; cambiar fricción desde un solo lugar.

**Prioridad**: Media

---

### CON-001 — Dos convenciones de fábrica: `create*` vs `setup*`
- **Categoría**: Consistencia
- **Prioridad**: Media
- **Archivos**: 9 módulos `create*` (SceneManager, CameraManager, RendererManager, Room, Classifier, Pieces, Lights, TextureFactory, MaterialFactory, InputManager, PhysicsWorld, BodyFactory, PhysicsSystem, ClassifierRules, Timer) vs 5 módulos `setup*` (DragManager, CameraFPS, Interface, ResizeHandler, AnimationLoop)
- **Descripción**: No hay criterio explícito que distinga `setupDragManager` de `createPhysicsWorld`. La diferencia aparente es que `setup*` recibe dependencias y `create*` no, pero `createBodyFactory(world, materials)` también recibe dependencias.
- **Evidencia**: Imports de `index.js` L2–21 muestran ambas familias mezcladas sin patrón claro.
- **Motivo**: Nombres predecibles aceleran la lectura del grafo de dependencias.
- **Riesgos de modificar**: Bajo si es solo renombrado con alias de import; mayor si se renombra en todos los archivos a la vez (hacerlo fase a fase).
- **Recomendación**: Definir convención única (`create*` para fábricas puras, `setup*` para las que registran listeners/side-effects) y documentarla en el README; o renombrar todo a `create*`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 4

### CON-002 — Fricción en dos fuentes: `PhysicsWorld` hardcodea lo que `physicsConstants` define
- **Categoría**: Consistencia
- **Prioridad**: Media
- **Archivos**: `src/physics/PhysicsWorld.js` (L37–58), `src/data/physicsConstants.js`
- **Descripción**: Los ContactMaterials usan valores literales (friction 0.45/0.6/0.7, restitution 0.05/0.02) mientras `PHYSICS_CONSTANTS` define `PANEL_FRICTION`/`PIECE_FRICTION`/`DEFAULT_RESTITUTION` que nadie usa.
- **Evidencia**: `PhysicsWorld.js` L37–58; ver DEAD-001.
- **Motivo**: "Single source of truth" roto: editar las constantes no produce efecto.
- **Riesgos de modificar**: Bajo si se respetan los valores actuales (mover literales a constantes sin cambiar números).
- **Recomendación**: Mover los valores de los ContactMaterial a `PHYSICS_CONSTANTS` y consumirlos; verificar que el comportamiento físico no cambia.
- **Dependencias**: DEAD-001 (se resuelven juntos).
- **Fase**: FASE 4

### CON-003 — Carpeta `src/imagenes/` en español, resto del árbol en inglés
- **Categoría**: Consistencia / Organización
- **Prioridad**: Baja
- **Archivos**: `src/imagenes/wood_color.webp`, `src/index.js` (L58)
- **Descripción**: El resto de las carpetas usa inglés (`objects`, `utils`, `data`, `controls`, `physics`, `game`, `ui`, `core`, `textures`, `materials`, `animations`, `lights`); `imagenes` rompe la convención y además mezcla assets con código fuente.
- **Evidencia**: Árbol de carpetas; la ruta `'src/imagenes/wood_color.webp'` se referencia en `index.js` L58.
- **Motivo**: Convención única de carpetas; separar assets del código.
- **Riesgos de modificar**: Medio si se mueve el archivo: la ruta es relativa al HTML y se rompería la carga. Debe hacerse junto con la actualización de la ruta en `index.js` y la carga de la textura deja de fallar.
- **Recomendación**: Mover a `src/assets/` o `src/textures/` y actualizar la ruta; verificar que la textura de madera siga cargando (sin el console.warn de fallback).
- **Dependencias**: Ninguna.
- **Fase**: FASE 4

### CON-004 — CSS mezcla variables de tema con hex hardcodeados
- **Categoría**: Consistencia
- **Prioridad**: Baja
- **Archivos**: `style.css`
- **Descripción**: Se definen `--color-primary: #5be3ff`, `--color-danger`, etc., pero ~15 reglas usan `#5be3ff`, `#9be8a0`, `#ff5566` literales (p. ej. L174, L203, L237, L273–274, L305, L351, L466).
- **Evidencia**: `style.css` L1–12 (vars) vs usos literales en L174, 203, 237, 269–276, 305, 312, 326, 351, 356, 466–469.
- **Motivo**: Cambiar el tema requiere editar N lugares en lugar de 1.
- **Riesgos de modificar**: Bajo; mapear cada hex a su variable correspondiente sin cambiar valores.
- **Recomendación**: Reemplazar literales por `var(--color-*)`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 4

### CON-005 — Números mágicos del snap y defaults duplicados
- **Categoría**: Consistencia
- **Prioridad**: Baja
- **Archivos**: `src/index.js` (L349, L363–396), `src/controls/DragManager.js` (L14–16)
- **Descripción**: El snap usa literales (distancia 0.85, `WALL_HEIGHT - 0.6`, `WALL_HEIGHT + 1.2`); `DragManager` define defaults `classifierTop = 3.0` y `classifierHalf = 2.0` que son exactamente `WALL_HEIGHT + PANEL_DEPTH` y `OUTER / 2`, pero escritos como números.
- **Evidencia**: `index.js` L372, L376; `DragManager.js` L14–16; `classifierDimensions.js` (OUTER=4, WALL_HEIGHT=2.5, PANEL_DEPTH=0.5).
- **Motivo**: Si cambia una dimensión en `classifierDimensions.js`, los literales de DragManager e index.js dejan de ser consistentes silenciosamente.
- **Riesgos de modificar**: Bajo; importar las constantes y derivar los defaults.
- **Recomendación**: Quitar los defaults literales de `setupDragManager` y calcular desde `classifierDimensions`; centralizar el rango de snap (0.85) y la altura de alineación en una constante nombrada.
- **Dependencias**: Ninguna.
- **Fase**: FASE 4

### CON-006 — Cobertura de JSDoc irregular (Observación)
- **Categoría**: Consistencia (observación)
- **Prioridad**: Baja
- **Archivos**: Todo `src/`
- **Descripción**: Algunos módulos tienen JSDoc completo con tipos de retorno (PhysicsWorld, CameraFPS, Timer), otros mínimo (math.js, CollisionHelper) y `SceneManager`/`CameraManager`/`RendererManager` solo tienen una línea.
- **Evidencia**: Comparación de cabeceras de los módulos.
- **Motivo**: La cobertura de tipos ayudaría a un futuro paso a TypeScript; no es bloqueante.
- **Riesgos de modificar**: Nulo (solo documentación).
- **Recomendación**: Definir un estándar mínimo de JSDoc (firma + @param + @returns) y aplicarlo en refactors futuros.
- **Dependencias**: Ninguna.
- **Fase**: FASE 4

---

# FASE 5 — Código duplicado

**Objetivo**: Eliminar la duplicación de mayor riesgo (quaternion del triángulo y reset de piezas) extrayendo helpers centrales, y las duplicaciones menores de constantes/lógica.

**Lista de tareas**: DUP-001 … DUP-009

**Archivos afectados**: `src/index.js`, `src/physics/BodyFactory.js`, `src/physics/PhysicsSystem.js`, `src/animations/AnimationLoop.js`, `src/controls/DragManager.js`, `src/utils/math.js`, `src/objects/Room.js`, `src/ui/Interface.js`

**Justificación**: La lógica del triángulo está en 4 lugares: cualquier ajuste de física requiere tocar 4 archivos y el riesgo de divergencia es alto. El reset de piezas está duplicado dos veces casi literalmente.

**Impacto esperado**: Cambios de física en un solo lugar; menos superficie de bug.

**Prioridad**: Alta

---

### DUP-001 — Lógica de teletransporte/reset de pieza duplicada en `index.js`
- **Categoría**: Código duplicado
- **Prioridad**: Alta
- **Archivos**: `src/index.js` (L215–241 y L444–457)
- **Descripción**: El bloque "reubicar pieza en su posición original + identity quaternion + reset de velocidades + wakeUp" aparece dos veces: en `resetPieces()` (para todas las piezas) y en el handler de infracción de `onPostPhysics` (para una pieza).
- **Evidencia**: `index.js` L222–233 vs L447–456 — bloques casi idénticos (position.copy, quaternion.identity, body.position.set, velocity.setZero, angularVelocity.setZero, wakeUp).
- **Motivo**: Si se agrega un paso al reset (p. ej. limpiar `userData` o animar la transición), hay que recordar ambos lugares.
- **Riesgos de modificar**: Bajo; extraer `teleportPiece(mesh, pos)` y usarlo en ambos sitios conservando el orden exacto de las operaciones.
- **Recomendación**: Crear `function teleportPiece(mesh, pos)` en un módulo compartido (p. ej. `src/game/pieceUtils.js`) o como helper interno de `index.js` si no se quiere más archivos.
- **Dependencias**: SRP-001 (la extracción de `index.js` aprovechará este helper).
- **Fase**: FASE 5

### DUP-002 — Desfase de quaternion del triángulo en 4 archivos
- **Categoría**: Código duplicado
- **Prioridad**: Alta
- **Archivos**: `src/physics/BodyFactory.js` (L117–121), `src/physics/PhysicsSystem.js` (L45–52 y L178–188), `src/index.js` (L385–390)
- **Descripción**: El offset de +90° en Y para alinear el `CANNON.Cylinder(3)` con el triángulo visual se aplica en cuatro sitios con constantes duplicadas (`Math.SQRT1_2`, `setFromAxisAngle(...)`, `Math.PI / 2`).
- **Evidencia**: Grep de `Math.SQRT1_2|quatOffset|0, s, 0, s` → 8 coincidencias en 3 archivos (4 bloques lógicos).
- **Motivo**: Es la lógica más delicada del proyecto (gotcha documentado en README); tocarla en un solo archivo rompe la sincronización visual/física sin error visible.
- **Riesgos de modificar**: Medio: requiere entender los dos sentidos (+90 al escribir en el body, −90 al leer). Extraer `TRIANGLE_QUAT_OFFSET` y funciones `quatMeshToBody`/`quatBodyToMesh` en un módulo (`src/physics/triangleQuat.js` o en `utils`), con nombres explícitos y tests de valor (si se puede, verificación numérica en consola).
- **Recomendación**: Centralizar en un único módulo con dos funciones documentadas; reemplazar los 4 usos y verificar el encaje del triángulo manualmente.
- **Dependencias**: Ninguna, pero hacerla después de FASE 1 (proyecto estable).
- **Fase**: FASE 5

### DUP-003 — Clamp de límites duplicado: `clampToBounds` vs. lógica inline en `AnimationLoop`
- **Categoría**: Código duplicado
- **Prioridad**: Media
- **Archivos**: `src/utils/math.js` (L13–26), `src/animations/AnimationLoop.js` (L63–65)
- **Descripción**: `utils/math.js` exporta `clampToBounds` (usado por DragManager y CameraFPS), pero `AnimationLoop.clampToRoomBounds` reimplementa el clamp X/Z inline con la misma aritmética y el mismo margen.
- **Evidencia**: `math.js` L19–25 vs `AnimationLoop.js` L63–65.
- **Motivo**: La safety net de física podría divergir del clamp de arrastre (p. ej. si se cambia el margen en un solo lugar).
- **Riesgos de modificar**: Bajo; refactorizar `clampToBounds` para aceptar el half-size y usarlo en `AnimationLoop`.
- **Recomendación**: Extender `clampToBounds` para cubrir Y y reutilizarlo; o extraer un `clampPieceToRoom`.
- **Dependencias**: DUP-004 (margen centralizado).
- **Fase**: FASE 5

### DUP-004 — Constante de margen 0.5 repetida en 4+ lugares
- **Categoría**: Código duplicado
- **Prioridad**: Media
- **Archivos**: `src/objects/Room.js` (L89), `src/controls/DragManager.js` (L72), `src/animations/AnimationLoop.js` (L37), `src/utils/math.js` (L15)
- **Descripción**: El margen de colisión contra paredes (0.5) está literalmente en 4 sitios, además del default `margin: 0.5` en `clampToBounds`. `CameraFPS` lo consume indirectamente desde `room.userData.bounds`.
- **Evidencia**: `Room.js` L89 `margin: 0.5`; `DragManager.js` L72 `ROOM_MARGIN = 0.5`; `AnimationLoop.js` L37 `MARGIN = 0.5`; `math.js` L15 `bounds.margin ?? 0.5`.
- **Motivo**: Cambiar el margen de colisión requiere 4 ediciones coordinadas.
- **Riesgos de modificar**: Bajo; centralizar en `classifierDimensions.js` (o una nueva `constants.js`) y consumir en los 4 sitios.
- **Recomendación**: Agregar `ROOM_MARGIN` a `data/` y reemplazar literales.
- **Dependencias**: Ninguna.
- **Fase**: FASE 5

### DUP-005 — Activación/desactivación de controles de cámara duplicada
- **Categoría**: Código duplicado
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L144–152, L176–190, L288–324)
- **Descripción**: El patrón "habilitar/deshabilitar orbitControls + fpsControls según modo y estado del juego" se repite en `showGameOver`, en el handler del botón del overlay y en `setCameraMode`.
- **Evidencia**: `index.js` L147–152, L182–187, L294–316 — los mismos `orbitControls.enabled` / `fpsControls.setEnabled` / clases `active`.
- **Motivo**: Tres caminos para cambiar el mismo estado; fácil olvidar uno (de hecho, el estado `gameActive` se gestiona a mano en los tres).
- **Riesgos de modificar**: Bajo si se extrae una función `setControlsState({orbit, fps, activeClass})` única.
- **Recomendación**: Unificar en un método `applyCameraMode()` o un mini state machine de cámara.
- **Dependencias**: ARQ-001 (contexto).
- **Fase**: FASE 5

### DUP-006 — Escritura a `#hint` en dos módulos
- **Categoría**: Código duplicado
- **Prioridad**: Baja
- **Archivos**: `src/ui/Interface.js` (L185–188), `src/index.js` (L306, L321)
- **Descripción**: `Interface.js` escribe el texto del hint al inicializar, y `setCameraMode` lo reescribe según el modo. Como `setCameraMode('infantil')` se llama al final (L492), la escritura de `Interface.js` queda inmediatamente sobrescrita.
- **Evidencia**: `Interface.js` L187; `index.js` L305–306 y L320–321; orden de ejecución L403 (setupInterface) → L492 (setCameraMode).
- **Motivo**: Escritura muerta + responsabilidad duplicada del texto de ayuda.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Mover el texto del hint por modo a `setCameraMode` (único dueño) y eliminar el set de `Interface.js`.
- **Dependencias**: Ninguna.
- **Fase**: FASE 5

### DUP-007 — Estructura de creación de audio duplicada entre sonidos
- **Categoría**: Código duplicado
- **Prioridad**: Baja
- **Archivos**: `src/index.js` (L80–139)
- **Descripción**: `playSuccessSound` y `playErrorSound` duplican la creación de `AudioContext`, osciladores, gains y el ramp de volumen; solo cambian notas/ondas/duración.
- **Evidencia**: `index.js` L82–84 vs L119–121 (mismo patrón `new AudioCtx()`), L88–110 vs L124–135.
- **Motivo**: DRY y base para PERF-001 (singleton de AudioContext).
- **Riesgos de modificar**: Bajo; extraer `scheduleNote(ctx, {freq, start, duration, type, gain})`.
- **Recomendación**: Crear `src/audio/SoundController.js` (o `utils/audio.js`) con `playSuccess()`/`playError()` y un único `AudioContext` lazily creado (ver PERF-001).
- **Dependencias**: PERF-001.
- **Fase**: FASE 5

### DUP-008 — Cálculo de AABB/half-size en 3 módulos
- **Categoría**: Código duplicado
- **Prioridad**: Baja
- **Archivos**: `src/controls/DragManager.js` (L192–194), `src/animations/AnimationLoop.js` (L50–56), `src/physics/BodyFactory.js` (L41–43)
- **Descripción**: Tres módulos calculan el bounding box y el half-size de las piezas con `Box3().setFromObject()`: DragManager (precacheo por drag), AnimationLoop (WeakMap cache) y BodyFactory (para la forma física).
- **Evidencia**: `DragManager.js` L192–194; `AnimationLoop.js` L50–56; `BodyFactory.js` L41–43.
- **Motivo**: La geometría no cambia en runtime; un solo helper cacheado por mesh evitaría recomputar.
- **Riesgos de modificar**: Bajo; no es crítico (cada uno cachea ya), pero un helper compartido eliminaría la duplicación de la aritmética.
- **Recomendación**: Extraer `getHalfSize(mesh, cache)` en `utils` con WeakMap interno.
- **Dependencias**: Ninguna.
- **Fase**: FASE 5

### DUP-009 — Doble verificación de `isOverOwnHole` (Observación)
- **Categoría**: Código duplicado (observación)
- **Prioridad**: Baja
- **Archivos**: `src/index.js` (L196 y L437)
- **Descripción**: `onPostPhysics` ya verifica `rules.isOverOwnHole(child)` antes de llamar a `tryClassify`, y `tryClassify` vuelve a verificar `rules.isOverOwnHole(mesh)` como guard.
- **Evidencia**: `index.js` L437 → `tryClassify(child)` L438... en realidad L437-438: `if (rules.isOverOwnHole(child)) { tryClassify(child); }` y dentro L196: `if (rules && rules.isOverOwnHole(mesh))`.
- **Motivo**: Redundancia defensiva; con un solo llamador, la doble verificación es ruido.
- **Riesgos de modificar**: Bajo; conservar la verificación en `tryClassify` (defensa si se agregan llamadores) y simplificar el llamador, o viceversa. Decisión de diseño.
- **Recomendación**: Documentar cuál es el guard canónico y eliminar el otro.
- **Dependencias**: SRP-001.
- **Fase**: FASE 5

---

# FASE 6 — Rendimiento ✅ (completada)

**Objetivo**: Eliminar los costos reales medibles (creación de AudioContext, descarga de fuentes) y documentar los límites del enfoque actual. Sin micro-optimizaciones innecesarias.

**Lista de tareas**: PERF-001 … PERF-006

**Archivos afectados**: `src/index.js`, `index.html`, `src/physics/PhysicsSystem.js`, `style.css`

**Justificación**: El proyecto ya es eficiente; los hallazgos son puntuales. El único de impacto real es PERF-001 (contexto de audio nuevo por sonido).

**Impacto esperado**: Menos consumo de CPU/GPU en móvil y menos peticiones de red.

**Prioridad**: Media

---

### PERF-001 — Se crea un `AudioContext` nuevo por cada sonido
- **Categoría**: Rendimiento
- **Prioridad**: Alta
- **Archivos**: `src/index.js` (L82–84, L119–121)
- **Descripción**: `playSuccessSound` y `playErrorSound` instancian `new AudioCtx()` en cada llamada. Los navegadores limitan la cantidad de contextos de audio concurrentes (Chrome ~6) y la creación es costosa; además, contextos no cerrados (`ctx.close()`) pueden quedar consumiendo recursos.
- **Evidencia**: `index.js` L84 y L121 — `const ctx = new AudioCtx();` en cada reproducción.
- **Motivo**: Riesgo real de degradación o pérdida de audio en partidas largas (muchas clasificaciones + errores).
- **Riesgos de modificar**: Bajo; crear un contexto lazy singleton (reutilizado, `resume()` si está `suspended`) y programar notas sobre él.
- **Recomendación**: Módulo de audio compartido (ver DUP-007) con `getContext()` singleton y `ctx.resume()` tras interacción del usuario (requisito de autoplay).
- **Dependencias**: DUP-007.
- **Fase**: FASE 6
- **Estado**: ✅ Resuelto (DUP-007) — `src/utils/audio.js` con `getContext()` lazy singleton + `resume()` si `suspended`.

### PERF-002 — `backdrop-filter: blur()` en paneles (Observación)
- **Categoría**: Rendimiento (observación)
- **Prioridad**: Baja
- **Archivos**: `style.css` (L28, L339, L424)
- **Descripción**: `#hud`, `#timer` y `#game-over-overlay` usan `backdrop-filter: blur(8px)` — costoso en GPU, especialmente en móviles y con la escena 3D detrás repintándose a 60fps.
- **Evidencia**: `style.css` L28 (glass-panel), L339 (#timer), L424 (#game-over-overlay).
- **Motivo**: Medible solo en dispositivos débiles; no bloqueante.
- **Riesgos de modificar**: Bajo; prueba visual de degradación (usar fondo semi-opaco más sólido).
- **Recomendación**: Evaluar `backdrop-filter` solo en desktop o reducir el radio de blur.
- **Dependencias**: Ninguna.
- **Fase**: FASE 6
- **Estado**: ✅ Resuelto — blur solo en desktop vía `@media (hover: hover) and (pointer: fine)` (`style.css`); los fondos semi-opacos ya garantizan legibilidad en móvil.

### PERF-003 — Broadphase Naive + panel compuesto ~200 shapes (Observación)
- **Categoría**: Rendimiento (observación)
- **Prioridad**: Baja
- **Archivos**: `src/physics/PhysicsWorld.js` (L20), `src/physics/BodyFactory.js` (L201–211)
- **Descripción**: Con `NaiveBroadphase`, cada step compara todos los pares de bodies. El panel compuesto genera ~200 cajas (grilla 0.25 en 4×4) pero es un solo body, así que el costo por pieza es bajo. El cuello de botella futuro sería el paso fijo a 240 Hz.
- **Evidencia**: `PhysicsWorld.js` L20; grilla `for (sx...) for (sy...)` con `cellSize=0.25` sobre extensión 4 → ~16×16 = 256 celdas.
- **Motivo**: Documentar el límite de escalabilidad (instancing de múltiples clasificadores está en el README como mejora).
- **Riesgos de modificar**: Nulo (solo documentación/medición).
- **Recomendación**: Documentar el tradeoff y, si se agregan más clasificadores, evaluar `SAPBroadphase` o reducir celdas.
- **Dependencias**: Ninguna.
- **Fase**: FASE 6
- **Estado**: 📝 Observación documentada — aceptado como límite; con 4 piezas el costo es despreciable.

### PERF-004 — Carga de Google Fonts sin uso (ver DEAD-005)
- **Categoría**: Rendimiento
- **Prioridad**: Media
- **Archivos**: `index.html` (L9–12)
- **Descripción**: 2–3 peticiones de red (CSS + woff2 + preconnects) para una fuente que ninguna regla CSS aplica.
- **Evidencia**: Grep de `Quicksand` → solo `index.html`; `style.css` usa Courier New en todo.
- **Motivo**: Tiempo de carga y render blocking innecesarios.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Eliminar o aplicar (misma resolución que DEAD-005).
- **Dependencias**: DEAD-005.
- **Fase**: FASE 6
- **Estado**: ✅ Resuelto (DEAD-005) — Google Fonts Quicksand eliminado de `index.html`.

### PERF-005 — `setKinematicPosition` despierta todas las piezas en cada movimiento (Observación)
- **Categoría**: Rendimiento (observación)
- **Prioridad**: Baja
- **Archivos**: `src/physics/PhysicsSystem.js` (L151–156)
- **Descripción**: Cada `pointermove` durante el drag recorre `piecesGroup.children` y hace `wakeUp()` de todas las piezas. Con 4 piezas es trivial, pero es O(n) por evento de puntero.
- **Evidencia**: `PhysicsSystem.js` L151–156 (loop + `other.wakeUp()`).
- **Motivo**: Solo relevante si crece el número de piezas.
- **Riesgos de modificar**: Bajo; despertar solo piezas dentro de un radio o delegar en cannon.
- **Recomendación**: Documentar; optimizar solo si se agregan más piezas.
- **Dependencias**: Ninguna.
- **Fase**: FASE 6
- **Estado**: 📝 Observación documentada — O(4) por pointermove, trivial hoy.

### PERF-006 — `HOLE_CONFIGS.find` por pieza por frame en `onPostPhysics` (Observación)
- **Categoría**: Rendimiento (observación)
- **Prioridad**: Baja
- **Archivos**: `src/index.js` (L421–462)
- **Descripción**: Por cada pieza, por cada frame, se hace `HOLE_CONFIGS.find(c => c.label === ...)` (implícito en `isOverOwnHole`) — O(4) por frame, despreciable.
- **Evidencia**: `ClassifierRules.js` L21 (`HOLE_CONFIGS.find`); `index.js` loop de post-física.
- **Motivo**: Micro-coste; no justifica optimizar hoy.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Cachear el config por label (Map) si se agregan más piezas.
- **Dependencias**: Ninguna.
- **Fase**: FASE 6
- **Estado**: 📝 Observación documentada — micro-coste O(4) por frame, aceptado.

---

# FASE 7 — Seguridad ✅ (completada)

**Objetivo**: Endurecer el frente web: integridad de dependencias, política de contenido y eliminación de `innerHTML`.

**Lista de tareas**: SEC-001 … SEC-004

**Archivos afectados**: `index.html`, `src/index.js`

**Justificación**: El juego corre 100% desde CDN sin hashes de integridad; un compromiso del CDN compromete a todos los jugadores.

**Impacto esperado**: Cadena de suministro verificada; superficie de XSS eliminada.

**Prioridad**: Media

---

### SEC-001 — Dependencias CDN sin SRI (Subresource Integrity)
- **Categoría**: Seguridad
- **Prioridad**: Alta
- **Archivos**: `index.html` (L18–26, L28–43)
- **Descripción**: `three@0.160.0` y `cannon-es@0.20.0` se cargan de jsdelivr con fallback a unpkg, sin atributos `integrity`/`crossorigin`. Un archivo comprometido en el CDN se ejecutaría con plenos privilegios de página.
- **Evidencia**: `index.html` L18–26 (import map sin integrity; los import maps no soportan SRI nativamente) y L28–43 (fallback reescribe el map).
- **Motivo**: Riesgo de supply-chain; el import map nativo no permite SRI, por lo que la mitigación es otra.
- **Riesgos de modificar**: Medio: cambiar el mecanismo de carga (p. ej. importar módulos con URLs con hash, o usar un `es-module-shims` + `integrity`, o auto-hospedar los bundles) cambia la arquitectura de entrega.
- **Recomendación**: Evaluar auto-hospedar `three` y `cannon-es` (versiones pines) o verificar el hash del bundle antes de importar. Documentar el tradeoff: hoy es aceptable para un proyecto educativo, pero no para producción.
- **Dependencias**: Ninguna.
- **Fase**: FASE 7
- **Estado**: 📝 Decisión documentada (Opción B) — se mantiene el CDN (jsdelivr + fallback unpkg) y se acepta el riesgo supply-chain para un proyecto educativo sin despliegue productivo. Auto-hospedar (~1.5MB de bundles pineados) queda documentado como paso previo si el juego llega a producción.

### SEC-002 — Sin Content-Security-Policy (Observación)
- **Categoría**: Seguridad (observación)
- **Prioridad**: Baja
- **Archivos**: `index.html`
- **Descripción**: No hay meta CSP ni cabecera. Con import map inline, scripts inline y 3 orígenes CDN, una política estricta requeriría `unsafe-inline` para el import map/fallback (lo que la debilita).
- **Evidencia**: `index.html` — ausencia de meta CSP; script inline L28–43; import map inline L18–26.
- **Motivo**: Mitigación de XSS; pero la arquitectura actual hace difícil una CSP estricta sin refactor.
- **Riesgos de modificar**: Medio si se aplica mal (rompe el juego: los scripts inline quedarían bloqueados).
- **Recomendación**: Mover el fallback a un archivo externo y aplicar CSP con `script-src 'self' https://cdn.jsdelivr.net https://unpkg.com`; evaluar en FASE 7 con prueba manual.
- **Dependencias**: SEC-001 (decisión de entrega).
- **Fase**: FASE 7
- **Estado**: 📝 Evaluada y descartada — se intentó CSP vía meta con hash SHA-256 del import map inline, pero resultó frágil: el hash rompe con cualquier cambio del map y `frame-ancestors` no se permite vía meta (bloqueó la carga). Se mantiene el fallback en `fallback.js` externo (mejora real sin riesgo). Si se quiere CSP en producción, debe ir por cabecera HTTP del servidor, no por meta.

### SEC-003 — `innerHTML` con mensaje de error (reiteración de ERR-003)
- **Categoría**: Seguridad
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L497)
- **Descripción**: La única inyección de contenido dinámico del proyecto es `innerHTML` con `err.message`; el resto usa `textContent` correctamente (nombre de usuario, L475).
- **Evidencia**: `index.js` L497; contraste con L475 (`hudTitle.textContent`).
- **Motivo**: Eliminar la clase de bug; mantener el patrón seguro que ya se usa en el resto.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: `loadingPhase.textContent`.
- **Dependencias**: ERR-003 (mismo cambio).
- **Fase**: FASE 7
- **Estado**: ✅ Resuelto — los 2 `innerHTML` restantes (hints de modo WASD/Mouse, strings estáticos en `setCameraMode`) migrados a `textContent`. `grep innerHTML` en `src/` e `index.html` = 0 (solo un comentario del fix ERR-003).

### SEC-004 — Sin datos sensibles ni persistencia (Observación)
- **Categoría**: Seguridad (observación)
- **Prioridad**: Baja
- **Archivos**: Todo el proyecto
- **Descripción**: El juego no persiste datos, no usa cookies, no hace peticiones de red propias (solo CDN) y el único dato del usuario es el nombre, mostrado con `textContent`. Superficie de ataque mínima.
- **Evidencia**: Sin `localStorage`, sin fetch, sin formularios con envío real (el form solo oculta un overlay).
- **Motivo**: Confirmación de que no hay frentes adicionales que proteger.
- **Riesgos de modificar**: Nulo.
- **Recomendación**: Ninguna acción; documentar.
- **Dependencias**: Ninguna.
- **Fase**: FASE 7
- **Estado**: 📝 Observación confirmada — sin cambios necesarios.

---

# FASE 8 — SRP y modularización ✅ (completada)

**Objetivo**: Reducir el "god module" `index.js` extrayendo dominios cohesivos, y dividir `BodyFactory` en su parte de panel. Es la fase con mayor valor arquitectónico.

**Lista de tareas**: SRP-001, SRP-002, SRP-003

**Archivos afectados**: `src/index.js` (499 → ~150 líneas), nuevos módulos en `src/game/`, `src/audio/`, `src/physics/BodyFactory.js`

**Justificación**: `index.js` concentra 6 responsabilidades distintas; cualquier cambio de juego toca el archivo de composición. La división propuesta sigue el patrón ya usado en el resto del proyecto (módulos cohesivos).

**Impacto esperado**: Composición legible; lógica de juego testeable de forma aislada.

**Prioridad**: Alta

---

### SRP-001 — `index.js` es un "god module" (6 responsabilidades)
- **Categoría**: SRP
- **Prioridad**: Alta
- **Archivos**: `src/index.js`
- **Descripción**: Además de orquestar la creación de módulos (su responsabilidad declarada), `index.js` contiene:
  1. Estado de juego: `classifiedLabels`, `gameActive`, `tryClassify` (L193–209)
  2. Lógica de victoria/derrota: `showGameOver`, handler del overlay (L141–190)
  3. Sonidos: `playSuccessSound`, `playErrorSound` (L80–139)
  4. Snap magnético del `onDragEnd` (L362–398)
  5. Reset de piezas + expulsión por infracción (L215–241, L444–457)
  6. Manejo de modo de cámara y eventos DOM (L288–327, L466–492)
- **Evidencia**: Desglose de líneas arriba; el archivo pasa de "conectar" a "implementar" en 6 dominios.
- **Motivo**: SRP: cada cambio de reglas/audio/snap obliga a tocar el compositor, aumentando el riesgo de romper la inicialización. La lógica de juego no es testeable sin montar toda la escena.
- **Riesgos de modificar**: Medio-Alto: requiere mover funciones con sus dependencias cerradas. Mitigación: extraer un módulo a la vez, verificando el juego tras cada extracción.
- **Recomendación**: Extraer en orden de menor riesgo:
  - `src/audio/SoundController.js` → sonidos (ya no depende de nada del juego)
  - `src/game/GameState.js` → `classifiedLabels`, `tryClassify`, victoria, reset, expulsión (recibe callbacks de UI/audio)
  - `src/game/SnapHelper.js` → lógica del snap del `onDragEnd`
  - Dejar `index.js` solo con composición + modo de cámara + wiring de eventos.
- **Dependencias**: DUP-001, DUP-007, FASE 5 (los helpers extraídos primero).
- **Fase**: FASE 8
- **Estado**: ✅ Resuelto — `index.js` 467 → 360 líneas, solo composición + modo de cámara + wiring. Se crearon: `src/game/GameState.js` (clasificación, victoria, reset, expulsión — recibe callbacks `onClassified`/`onResetScores`/`onGameOver` y `dragManagerRef`, resolviendo ARQ-001/ARQ-002), `src/game/SnapHelper.js` (`snapToHole` reusa `teleportPiece`, eliminando la duplicación residual del snap de FASE 5), `src/game/pieceUtils.js` (`teleportPiece` compartido por reset/expulsión/snap, DUP-001). El audio ya estaba en `src/utils/audio.js` (DUP-007).

### SRP-002 — Rama `panel` de `registerStatic` demasiado grande (grilla compuesta)
- **Categoría**: SRP / Modularización
- **Prioridad**: Media
- **Archivos**: `src/physics/BodyFactory.js` (L171–217)
- **Descripción**: La rama `if (kind === 'panel')` (~47 líneas) construye la grilla de cajas del panel perforado: cálculo de bbox, iteración de celdas, consulta `isInsideAnyHole` y `addShape`. Mezcla dos responsabilidades: registro de bodies y geometría de grilla.
- **Evidencia**: `BodyFactory.js` L171–217.
- **Motivo**: La generación de grilla es lógica independiente (podría probarse sola y variar el `gridCellSize`); dentro de `registerStatic` oscurece el flujo principal.
- **Riesgos de modificar**: Medio: el panel es crítico para el juego (huecos físicos). Extraer con los mismos parámetros y verificar que las piezas sigan cayendo por los huecos y apoyándose en la superficie.
- **Recomendación**: Extraer `buildPanelGrid(panelMesh, opts)` en `src/physics/PanelGridBuilder.js` devolviendo el `compoundBody`; `registerStatic` lo consume.
- **Dependencias**: Ninguna.
- **Fase**: FASE 8
- **Estado**: ✅ Resuelto — `src/physics/PanelGridBuilder.js` con `buildPanelGrid(panelMesh, opts, material)` (misma lógica: bbox, grilla, `isInsideAnyHole`, `addShape`); `registerStatic` lo consume. BodyFactory −66 líneas.

### SRP-003 — `Interface.js` mezcla HUD, panel de control y toggle (Observación)
- **Categoría**: SRP (observación)
- **Prioridad**: Baja
- **Archivos**: `src/ui/Interface.js`
- **Descripción**: `setupInterface` maneja HUD de puntajes, panel de materiales/texturas/luces y el toggle de visibilidad del panel. Son 3 vistas distintas con 3 estados distintos (scores, selección, luces).
- **Evidencia**: `Interface.js` L21–25 (scores), L52–105 (materiales), L148–155 (luces), L174–182 (toggle).
- **Motivo**: Aceptable por tamaño (208 líneas); la división solo se justifica si el panel crece.
- **Riesgos de modificar**: Bajo; dividir por vistas manteniendo la API pública actual.
- **Recomendación**: Posponer; documentar como candidata a dividir si se agregan más controles.
- **Dependencias**: Ninguna.
- **Fase**: FASE 8
- **Estado**: 📝 Pospuesta (documentada) — 208 líneas sigue siendo aceptable; se dividirá solo si el panel crece.

---

# FASE 9 — Arquitectura y acoplamiento

**Objetivo**: Reducir el acoplamiento temporal y los estados compartidos frágiles de la composición, y formalizar el contexto del juego.

**Lista de tareas**: ARQ-001 … ARQ-005

**Archivos afectados**: `src/index.js`, `src/controls/DragManager.js`, `src/controls/CameraFPS.js`, `src/animations/AnimationLoop.js`, `src/game/Timer.js`

**Justificación**: Es la fase de mayor riesgo porque toca el cableado completo; por eso va al final, sobre un código ya modularizado y estable.

**Impacto esperado**: Composición ordenada, sin referencias "fantasma" (usadas antes de existir).

**Prioridad**: Media

---

### ARQ-001 — Acoplamiento temporal: `interfaceCtrl` usado antes de asignarse
- **Categoría**: Arquitectura / Acoplamiento
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L198, L238, L343, L403)
- **Descripción**: `tryClassify` y `resetPieces` referencian `interfaceCtrl`, declarada con `let` en L343, mucho después de su primer uso potencial (L198) y solo asignada en L403. Funciona porque esos callbacks se ejecutan post-inicialización, pero es una bomba de tiempo: cualquier llamada temprana (o reordenamiento) lanza `Cannot access 'interfaceCtrl' before initialization`.
- **Evidencia**: `index.js` L343 `let interfaceCtrl;` vs L198 `interfaceCtrl.onPieceClassified(...)` y L238 `interfaceCtrl.resetScores()`.
- **Motivo**: Orden frágil de inicialización; el compilador no protege (JS no tiene análisis estático de esto).
- **Riesgos de modificar**: Medio: la solución (inyectar callbacks en lugar de capturar variables externas) toca el wiring.
- **Recomendación**: Pasar los callbacks de UI como parámetros a los módulos (GameState recibe `{ onClassified, onReset }`), eliminando la dependencia de variables tardías.
- **Dependencias**: SRP-001 (la extracción de GameState resuelve esto naturalmente).
- **Fase**: FASE 9

### ARQ-002 — Refs compartidas mutables `{ current }` como acoplamiento implícito
- **Categoría**: Arquitectura / Acoplamiento
- **Prioridad**: Media
- **Archivos**: `src/index.js` (L76–77), `src/controls/CameraFPS.js` (L33, L41), `src/controls/DragManager.js` (L178, L206), `src/animations/AnimationLoop.js`
- **Descripción**: `draggingRef` y `activeCameraRef` (`{ current }`) se comparten por identidad de objeto entre DragManager, CameraFPS y AnimationLoop. Es un patrón válido (evita recrear listeners), pero crea acoplamiento invisible: cambiar la propiedad `current` en cualquier lugar afecta a todos.
- **Evidencia**: `index.js` L76–77; `CameraFPS.js` L33, L41; `DragManager.js` L178, L206, L207.
- **Motivo**: Sin documentación, el contrato implícito ("si estás arrastrando, la cámara no responde") es difícil de rastrear.
- **Riesgos de modificar**: Medio: reemplazar por un `GameContext` o callbacks de estado requiere tocar 3 módulos.
- **Recomendación**: Agrupar en un único objeto `context = { dragging: false, camera: null }` documentado, o exponer eventos (`onDragStateChange`); mínimo: documentar el contrato en las cabeceras JSDoc.
- **Dependencias**: Ninguna.
- **Fase**: FASE 9

### ARQ-003 — DI manual con demasiados parámetros en `setupDragManager` (Observación)
- **Categoría**: Arquitectura (observación)
- **Prioridad**: Baja
- **Archivos**: `src/controls/DragManager.js` (L10–20), `src/index.js` (L344–400)
- **Descripción**: `setupDragManager` recibe 9+ parámetros y 4 callbacks. Funciona, pero el límite de legibilidad está cerca.
- **Evidencia**: Firma de `setupDragManager` L10–20 + objeto de opciones en `index.js` L344–400 (~56 líneas de configuración).
- **Motivo**: Si se agregan más opciones, conviene agrupar en un objeto de contexto (ver ARQ-002).
- **Riesgos de modificar**: Bajo; solo reorganización de firma.
- **Recomendación**: A futuro, pasar un único objeto `deps` con las dependencias; no urgente.
- **Dependencias**: ARQ-002.
- **Fase**: FASE 9

### ARQ-004 — Reglas de juego parcialmente fuera de `game/` (Observación)
- **Categoría**: Arquitectura (observación)
- **Prioridad**: Baja
- **Archivos**: `src/index.js` (L362–398, L421–462), `src/game/ClassifierRules.js`
- **Descripción**: `ClassifierRules` vive en `game/`, pero el snap (cuándo atraer y a qué altura) y la política de expulsión por infracción están implementadas en `index.js`, fuera de la capa de reglas.
- **Evidencia**: Snap en `index.js` L363–396; expulsión en L444–457; `ClassifierRules.js` solo tiene `isOverOwnHole`.
- **Motivo**: La "fuente única de reglas" declarada no contiene todas las reglas.
- **Riesgos de modificar**: Medio; mover la lógica del snap/expulsión a `game/` es parte natural de SRP-001.
- **Recomendación**: Migrar snap y expulsión a `game/` junto con GameState (FASE 8).
- **Dependencias**: SRP-001.
- **Fase**: FASE 9

### ARQ-005 — Config de juego (tiempo límite) hardcodeada en dos lugares (Observación)
- **Categoría**: Arquitectura (observación)
- **Prioridad**: Baja
- **Archivos**: `src/game/Timer.js` (L13–14, L55–56, L69–75), `index.html` (L87)
- **Descripción**: La duración inicial (1:00), el rango (1–5 min) y el display inicial `01:00` están duplicados entre `Timer.js` y el HTML; no hay config central.
- **Evidencia**: `Timer.js` L13–14 (`minutes=1`, `seconds=0`), L55–56 (reset), L69–77 (rango 1–5); `index.html` L87 (`01:00`).
- **Motivo**: Cambiar la duración requiere editar JS + HTML coordinadamente.
- **Riesgos de modificar**: Bajo; `Timer.js` ya recibe `onTimeUp`; podría recibir `{ initialMinutes, maxMinutes }`.
- **Recomendación**: Parametrizar `createTimer` con la configuración y dejar el HTML leyendo el estado inicial del módulo.
- **Dependencias**: Ninguna.
- **Fase**: FASE 9

---

## PLAN GENERAL

Ordenado de menor a mayor riesgo para refactorizar con seguridad. **Regla de verificación**: después de cada fase, ejecutar el juego (`python3 -m http.server 8080`) y validar: (1) arranca sin errores en consola, (2) las 4 piezas caen por sus huecos, (3) snap magnético funciona, (4) victoria/derrota y reinicio funcionan, (5) modo WASD y modo Mouse funcionan.

| Fase | Objetivo | Riesgo | Prioridad | Dependencias |
|------|----------|--------|-----------|--------------|
| FASE 1 | Correcciones críticas puntuales (bug de victoria, innerHTML, guard WebGL, cooldown de sonido) | Bajo | Alta | Ninguna |
| FASE 2 | Documentación alineada al código (README + JSDoc) | Muy bajo | Media | Ninguna |
| FASE 3 | Código muerto (constantes, ramas, parámetros, fuentes, assets) | Bajo | Media | CON-002 (para DEAD-001) |
| FASE 4 | Consistencia de convenciones (create/setup, fricción, carpetas, CSS, números mágicos) | Bajo | Media | Ninguna |
| FASE 5 | Código duplicado (quaternion triángulo, teleport, clamps, margen, audio) | Medio | Alta | FASE 4 (margen/constantes) |
| FASE 6 | Rendimiento (AudioContext singleton, fuentes sin uso, documentación de límites) ✅ | Medio | Media | DUP-007 (para PERF-001) |
| FASE 7 | Seguridad (SRI/CDN, CSP, textContent) ✅ | Medio | Media | SEC-001 → SEC-002 encadenadas |
| FASE 8 | SRP y modularización (extraer GameState, SoundController, SnapHelper, PanelGridBuilder) ✅ | Medio-Alto | Alta | FASE 5 (helpers extraídos) |
| FASE 9 | Arquitectura y acoplamiento (interfaceCtrl, refs compartidas, reglas en game/) | Alto | Media | FASE 8 |

---

## ANEXO — Índice completo de hallazgos

| ID | Categoría | Prioridad | Fase |
|----|-----------|-----------|------|
| ERR-001 | Bug funcional | Alta | 1 |
| ERR-002 | Manejo de errores | Media | 1 |
| ERR-003 | Seguridad / errores | Media | 1 |
| ERR-005 | Robustez | Media | 1 |
| DOC-001 … DOC-005 | Documentación | Media/Baja | 2 |
| DEAD-001 … DEAD-010 | Código muerto | Media/Baja | 3 |
| CON-001 … CON-006 | Consistencia | Media/Baja | 4 |
| DUP-001 … DUP-009 | Duplicación | Alta/Baja | 5 |
| PERF-001 … PERF-006 | Rendimiento | Alta/Baja | 6 |
| SEC-001 … SEC-004 | Seguridad | Alta/Baja | 7 |
| SRP-001 … SRP-003 | SRP / Modularización | Alta/Baja | 8 |
| ARQ-001 … ARQ-005 | Arquitectura / Acoplamiento | Media/Baja | 9 |

**Nota sobre observaciones**: Los ítems marcados como "Observación" (DEAD-008, DEAD-010, CON-006, DUP-009, PERF-002, PERF-003, PERF-005, PERF-006, SEC-002, SEC-004, SRP-003, ARQ-003, ARQ-004, ARQ-005) no son defectos confirmados: son decisiones de diseño legítimas o costos aceptables. Se documentan para que cada fase decida conscientemente si intervenirlos o no.

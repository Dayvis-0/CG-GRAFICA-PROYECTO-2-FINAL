// Fuente ÚNICA de verdad para los 4 huecos del clasificador y sus piezas.
// Tanto Classifier.js como Pieces.js importan de acá.
// Si cambiás un tamaño de hueco, ajustalo SOLO en este archivo.

/** @type {Array<{
 *   label:       string,
 *   shape:       'circle'|'square'|'triangle'|'rhombus',
 *   cx:          number,
 *   cy:          number,
 *   hole:        object,
 *   pieceType:   'sphere'|'box'|'triangle'|'rhombus',
 *   pieceArgs:   number[],        // argumentos para el constructor de la geometría
 *   pieceColor:  number,
 *   piecePos:    {x:number, z:number},
 *   pieceY:      number,
 * }>} */
export const HOLE_CONFIGS = [
    {
        label: 'Esfera',
        shape: 'circle',
        cx: -1.1, cy: 1.1,
        hole: { r: 0.6 },
        pieceType: 'sphere',
        pieceArgs: [0.55, 32, 32],
        pieceColor: 0xff8a80,
        piecePos: { x: 4.5, z: 0 },
        pieceY: 0.55,
    },
    {
        label: 'Cubo',
        shape: 'square',
        cx: 1.1, cy: 1.1,
        hole: { side: 1.0 },
        pieceType: 'box',
        pieceArgs: [0.9, 0.9, 0.9],
        pieceColor: 0x82b1ff,
        piecePos: { x: 2.25, z: 3.9 },
        pieceY: 0.45,
    },
    {
        label: 'Triángulo',
        shape: 'triangle',
        cx: -1.1, cy: -1.1,
        hole: { r: 0.85 },
        pieceType: 'triangle',
        pieceArgs: [0.65, 0.9],
        pieceColor: 0xb9f6ca,
        piecePos: { x: -2.25, z: 3.9 },
        pieceY: 0.45,
    },
    {
        label: 'Rombo',
        shape: 'rhombus',
        cx: 1.1, cy: -1.1,
        hole: { width: 1.2, height: 0.85 },
        pieceType: 'rhombus',
        pieceArgs: [1.0, 0.7, 0.9],
        pieceColor: 0xffe57f,
        piecePos: { x: 2.25, z: -3.9 },
        pieceY: 0.45,
    },
];

/** Lista extendida de 8 piezas coloridas para el juego */
export const PIECE_CONFIGS = [
    {
        label: 'Esfera 1',
        shape: 'circle',
        pieceType: 'sphere',
        pieceArgs: [0.55, 32, 32],
        pieceColor: 0xff4081, // Coral rosa radiante
        piecePos: { x: 4.2, z: 1.5 },
        pieceY: 0.55,
    },
    {
        label: 'Esfera 2',
        shape: 'circle',
        pieceType: 'sphere',
        pieceArgs: [0.55, 32, 32],
        pieceColor: 0xab47bc, // Violeta magenta brillante
        piecePos: { x: -4.2, z: -1.5 },
        pieceY: 0.55,
    },
    {
        label: 'Cubo 1',
        shape: 'square',
        pieceType: 'box',
        pieceArgs: [0.9, 0.9, 0.9],
        pieceColor: 0x00b0ff, // Azul cian neón
        piecePos: { x: 2.5, z: 4.2 },
        pieceY: 0.45,
    },
    {
        label: 'Cubo 2',
        shape: 'square',
        pieceType: 'box',
        pieceArgs: [0.9, 0.9, 0.9],
        pieceColor: 0x1de9b6, // Turquesa esmeralda
        piecePos: { x: -2.5, z: -4.2 },
        pieceY: 0.45,
    },
    {
        label: 'Triángulo 1',
        shape: 'triangle',
        pieceType: 'triangle',
        pieceArgs: [0.65, 0.9],
        pieceColor: 0x76ff03, // Verde lima brillante
        piecePos: { x: -3.8, z: 3.2 },
        pieceY: 0.45,
    },
    {
        label: 'Triángulo 2',
        shape: 'triangle',
        pieceType: 'triangle',
        pieceArgs: [0.65, 0.9],
        pieceColor: 0xffd600, // Amarillo sol radiante
        piecePos: { x: 3.8, z: -3.2 },
        pieceY: 0.45,
    },
    {
        label: 'Rombo 1',
        shape: 'rhombus',
        pieceType: 'rhombus',
        pieceArgs: [1.0, 0.7, 0.9],
        pieceColor: 0xff6d00, // Naranja fuego radiante
        piecePos: { x: 3.2, z: -4.5 },
        pieceY: 0.45,
    },
    {
        label: 'Rombo 2',
        shape: 'rhombus',
        pieceType: 'rhombus',
        pieceArgs: [1.0, 0.7, 0.9],
        pieceColor: 0xf50057, // Fucsia intenso
        piecePos: { x: -3.2, z: 4.5 },
        pieceY: 0.45,
    },
];
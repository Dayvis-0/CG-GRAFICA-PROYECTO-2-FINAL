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
        pieceColor: 0xff8a80, // Coral pastel suave
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
        pieceColor: 0x82b1ff, // Celeste pastel suave
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
        pieceColor: 0xb9f6ca, // Verde menta suave
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
        pieceColor: 0xffe57f, // Amarillo pastel suave
        piecePos: { x: 2.25, z: -3.9 },
        pieceY: 0.45,
    },
];
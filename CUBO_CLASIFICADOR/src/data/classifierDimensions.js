// Dimensiones del cubo clasificador. Single source of truth para la geometría
// del clasificador: la consumen Classifier.js (malla) y ClassifierRules.js
// (lógica), desacoplando objects/ de game/.

export const OUTER       = 4;      // ancho y fondo exterior
export const WALL_THICK  = 0.08;   // grosor de cada pared
export const WALL_HEIGHT = 2.5;    // altura de las paredes (sin tapa)
export const PANEL_DEPTH = 0.5;    // grosor del panel superior con huecos
export const MID         = OUTER / 2;

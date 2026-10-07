// Mundo em "pixels de arte": 20x12 tiles de 16px + uma faixa de 16px no topo para o HUD.
export const TILE = 16;
export const COLS = 20;
export const ROWS = 12;
export const OY = 16;
export const MUNDO_L = COLS * TILE; // 320
export const MUNDO_A = ROWS * TILE + OY; // 208

// A tela real é 3x maior: a arte fica nítida e os textos do HUD ficam legíveis.
export const ZOOM = 3;
export const TELA_L = MUNDO_L * ZOOM; // 960
export const TELA_A = MUNDO_A * ZOOM; // 624

export const FONTE = '"Press Start 2P", monospace';

export const CORES = {
  fundo: 0x07050b,
  texto: '#f4ead6',
  textoApagado: '#8a7c90',
  chama: '#ffb43a',
  cera: '#f2e3c2',
  perigo: '#ff5a4a',
  ouro: '#ffd23f',
};

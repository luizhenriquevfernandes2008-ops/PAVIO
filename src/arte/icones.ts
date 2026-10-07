import Phaser from 'phaser';
import { D } from '../dados';

// Ícones dos itens, desenhados com formas simples numa grade de 14x14
// e depois contornados automaticamente (todos ficam com o mesmo estilo).
// "c" é a cor do item (definida em itens.json).

const T = 14;
type Buf = (string | null)[][];
type Pinta = (x: number, y: number, cor: string) => void;

interface Pincel {
  px: Pinta;
  ret: (x: number, y: number, w: number, h: number, cor: string) => void;
  disco: (cx: number, cy: number, r: number, cor: string) => void;
  linha: (x0: number, y0: number, x1: number, y1: number, cor: string, grossa?: boolean) => void;
  chama: (x: number, y: number) => void;
  apagar: (x: number, y: number, w: number, h: number) => void;
}

const CERA = '#f4ead6';
const PRETO = '#1b1325';
const METAL = '#7d8494';
const METAL_E = '#3b3f4a';
const MADEIRA = '#8a5a2b';
const OURO = '#ffd23f';

const DESENHOS: Record<string, (p: Pincel, c: string) => void> = {
  pavio2: (p) => {
    p.ret(3, 6, 3, 7, CERA);
    p.ret(8, 6, 3, 7, CERA);
    p.chama(4, 5);
    p.chama(9, 5);
  },
  candelabro: (p, c) => {
    p.ret(1, 9, 12, 1, c);
    p.ret(6, 9, 2, 4, c);
    p.ret(4, 12, 6, 1, c);
    for (const x of [1, 6, 11]) p.ret(x, 5, 2, 4, CERA);
    for (const x of [1, 6, 11]) p.chama(x, 4);
  },
  olho: (p, c) => {
    p.disco(7, 7, 5, '#ffffff');
    p.disco(7, 7, 3, c);
    p.disco(7, 7, 1, PRETO);
    p.px(6, 5, '#ffffff');
  },
  mola: (p, c) => {
    for (let i = 0; i < 5; i++) p.linha(3, 2 + i * 2, 10, 3 + i * 2, i % 2 ? METAL : c, true);
  },
  cristal: (p, c) => {
    for (let y = 1; y <= 12; y++) {
      const w = y <= 5 ? y * 2 : (13 - y) * 1.4;
      p.ret(Math.round(7 - w / 2), y, Math.max(1, Math.round(w)), 1, c);
    }
    p.linha(5, 4, 7, 10, '#ffffff');
  },
  bomba: (p) => {
    p.disco(7, 8, 4, METAL_E);
    p.px(5, 6, METAL);
    p.linha(9, 4, 11, 2, MADEIRA);
    p.px(12, 1, '#ffe066');
    p.px(11, 1, '#ff9a2e');
  },
  floco: (p, c) => {
    p.linha(7, 1, 7, 12, c);
    p.linha(1, 7, 12, 7, c);
    p.linha(3, 3, 11, 11, c);
    p.linha(11, 3, 3, 11, c);
    p.px(7, 7, '#ffffff');
  },
  raio: (p, c) => {
    p.linha(9, 1, 5, 7, c, true);
    p.linha(5, 7, 9, 7, c, true);
    p.linha(9, 7, 5, 12, c, true);
  },
  fantasma: (p, c) => {
    p.disco(7, 6, 4, c);
    p.ret(3, 6, 9, 5, c);
    for (const x of [3, 6, 9]) p.ret(x, 11, 2, 1, c);
    p.px(5, 6, PRETO);
    p.px(9, 6, PRETO);
  },
  bumerangue: (p, c) => {
    p.ret(2, 2, 3, 10, c);
    p.ret(2, 9, 10, 3, c);
    p.px(3, 3, '#ffffff');
  },
  lente: (p, c) => {
    p.disco(6, 6, 4, METAL);
    p.disco(6, 6, 3, c);
    p.px(5, 4, '#ffffff');
    p.linha(9, 9, 12, 12, MADEIRA, true);
  },
  frasco: (p, c) => {
    p.ret(6, 1, 3, 3, '#cfd8dc');
    p.disco(7, 9, 4, c);
    p.px(5, 7, '#ffffff');
  },
  chama: (p, c) => {
    p.disco(7, 9, 4, c);
    p.disco(7, 6, 3, c);
    p.ret(7, 2, 1, 2, c);
    p.disco(7, 9, 2, '#ffffff');
  },
  coracao: (p, c) => {
    p.disco(4, 5, 3, c);
    p.disco(9, 5, 3, c);
    for (let y = 6; y <= 12; y++) p.ret(7 - (12 - y), y, (12 - y) * 2 + 1, 1, c);
    p.px(3, 4, '#ffffff');
  },
  gota_sangue: (p, c) => {
    p.disco(7, 9, 4, c);
    for (let y = 2; y <= 6; y++) p.ret(7 - Math.floor((y - 2) / 2), y, Math.floor((y - 2) / 2) * 2 + 1, 1, c);
    p.px(5, 8, '#ffffff');
  },
  relogio: (p, c) => {
    p.disco(7, 6, 5, c);
    p.disco(7, 6, 4, '#fff4d6');
    p.linha(7, 6, 7, 3, PRETO);
    p.linha(7, 6, 9, 6, PRETO);
    p.ret(4, 10, 2, 3, c);
    p.ret(9, 10, 1, 2, c);
  },
  oculos: (p) => {
    p.ret(1, 5, 5, 4, METAL_E);
    p.ret(8, 5, 5, 4, METAL_E);
    p.ret(6, 5, 2, 1, METAL_E);
    p.px(2, 6, METAL);
    p.px(9, 6, METAL);
  },
  chapeu: (p, c) => {
    p.ret(1, 11, 12, 2, '#3a1a5c');
    for (let y = 1; y <= 10; y++) p.ret(7 - Math.floor(y / 2), y, Math.floor(y / 2) * 2 + 1, 1, c);
    p.ret(4, 9, 7, 1, OURO);
  },
  coroa: (p, c) => {
    p.ret(2, 7, 10, 5, c);
    p.ret(2, 3, 2, 4, c);
    p.ret(6, 2, 2, 5, c);
    p.ret(10, 3, 2, 4, c);
    p.px(4, 9, '#e2452b');
    p.px(7, 9, '#4f7dff');
    p.px(10, 9, '#e2452b');
  },
  pente: (p, c) => {
    p.ret(4, 3, 6, 10, METAL_E);
    p.ret(5, 1, 4, 2, '#d9a441');
    p.ret(5, 5, 4, 1, c);
    p.ret(5, 8, 4, 1, c);
  },
  mao: (p, c) => {
    p.disco(7, 9, 4, c);
    p.ret(3, 3, 2, 6, c);
    p.ret(6, 1, 2, 7, c);
    p.ret(9, 2, 2, 6, c);
    p.ret(12, 5, 1, 4, '#ffffff');
  },
  gatilho: (p, c) => {
    p.disco(7, 8, 4, METAL_E);
    p.apagar(5, 7, 4, 4);
    p.linha(6, 3, 5, 9, c, true);
  },
  gatilho2: (p, c) => {
    p.disco(7, 8, 5, METAL_E);
    p.apagar(4, 7, 7, 4);
    p.linha(5, 3, 4, 9, c, true);
    p.linha(9, 3, 8, 9, c, true);
  },
  asas: (p, c) => {
    p.disco(3, 6, 3, c);
    p.disco(10, 6, 3, c);
    p.disco(4, 10, 2, c);
    p.disco(9, 10, 2, c);
    p.ret(6, 3, 2, 9, MADEIRA);
  },
  pavio: (p) => {
    p.linha(7, 4, 7, 12, PRETO);
    p.linha(6, 12, 8, 12, PRETO);
    p.chama(7, 4);
  },
  vela: (p, c) => {
    p.ret(4, 5, 6, 8, c);
    p.ret(8, 5, 2, 8, '#00000033');
    p.chama(7, 4);
  },
  vidro: (p, c) => {
    p.linha(2, 12, 6, 2, c, true);
    p.linha(6, 2, 11, 9, c, true);
    p.linha(11, 9, 2, 12, c, true);
    p.px(6, 5, '#ffffff');
  },
  orbe: (p, c) => {
    p.disco(7, 7, 5, c);
    p.disco(7, 7, 3, '#fff4d6');
    p.px(5, 5, '#ffffff');
  },
  gemea: (p) => {
    p.ret(2, 5, 5, 8, CERA);
    p.ret(9, 8, 3, 5, CERA);
    p.chama(4, 4);
    p.chama(10, 7);
    p.px(3, 8, PRETO);
    p.px(5, 8, PRETO);
  },
  ima: (p, c) => {
    p.ret(2, 2, 3, 9, c);
    p.ret(9, 2, 3, 9, c);
    p.ret(2, 9, 10, 3, c);
    p.ret(2, 2, 3, 2, '#cfd8dc');
    p.ret(9, 2, 3, 2, '#cfd8dc');
  },
  pote: (p, c) => {
    p.ret(3, 5, 8, 8, c);
    p.ret(3, 3, 8, 2, MADEIRA);
    p.ret(5, 5, 1, 4, '#ffffff');
  },
  chumbo: (p, c) => {
    p.disco(7, 7, 5, c);
    p.disco(6, 6, 2, '#cfd8dc');
  },
  ampulheta: (p, c) => {
    p.ret(2, 1, 10, 1, MADEIRA);
    p.ret(2, 12, 10, 1, MADEIRA);
    for (let y = 2; y <= 6; y++) p.ret(2 + (y - 2), y, 10 - (y - 2) * 2, 1, '#cfe8ff');
    for (let y = 7; y <= 11; y++) p.ret(7 - (y - 6), y, (y - 6) * 2, 1, '#cfe8ff');
    p.ret(5, 9, 4, 2, c);
    p.ret(6, 4, 2, 2, c);
  },
  espelho: (p, c) => {
    p.ret(3, 1, 8, 12, MADEIRA);
    p.ret(4, 2, 6, 10, c);
    p.linha(5, 3, 8, 10, '#ffffff');
    p.linha(8, 4, 5, 8, PRETO);
  },
  trevo: (p, c) => {
    p.disco(5, 4, 2, c);
    p.disco(9, 4, 2, c);
    p.disco(5, 8, 2, c);
    p.disco(9, 8, 2, c);
    p.linha(7, 8, 9, 13, '#2e8a45');
  },
  lagrima: (p, c) => {
    p.disco(7, 5, 4, c);
    for (let y = 9; y <= 12; y++) p.ret(7 - (12 - y), y, (12 - y) * 2 + 1, 1, c);
    p.px(5, 4, '#ffffff');
  },
  polvora: (p, c) => {
    for (let y = 6; y <= 12; y++) p.ret(7 - (y - 6), y, (y - 6) * 2 + 1, 1, c);
    p.px(5, 10, PRETO);
    p.px(8, 11, PRETO);
    p.px(7, 8, PRETO);
  },
  brasa: (p, c) => {
    p.disco(7, 9, 4, '#3a2418');
    p.linha(4, 9, 10, 9, c);
    p.linha(7, 6, 7, 12, c);
    p.chama(7, 4);
  },
  lamparina: (p, c) => {
    p.ret(4, 4, 6, 9, METAL_E);
    p.ret(5, 5, 4, 7, c);
    p.ret(6, 1, 2, 3, METAL);
    p.ret(3, 12, 8, 1, METAL);
  },
  // ---- itens de vida e itens malditos ----
  bolo: (p, c) => {
    p.ret(2, 7, 10, 5, '#d9a441');
    p.ret(2, 6, 10, 2, c);
    p.ret(3, 8, 1, 2, c);
    p.ret(8, 8, 1, 1, c);
    p.ret(6, 3, 2, 3, CERA);
    p.chama(6, 2);
  },
  votiva: (p, c) => {
    p.ret(3, 6, 8, 7, '#9fd0ff');
    p.ret(4, 6, 6, 6, c);
    p.ret(6, 4, 2, 2, CERA);
    p.chama(6, 3);
    p.px(4, 7, '#ffffff');
  },
  vela_grossa: (p, c) => {
    p.ret(2, 5, 10, 8, c);
    p.ret(9, 5, 3, 8, '#e0cfa8');
    p.chama(6, 4);
  },
  pacto: (p, c) => {
    p.disco(7, 7, 5, PRETO);
    p.disco(7, 7, 4, c);
    p.linha(7, 3, 4, 11, '#1b1325');
    p.linha(7, 3, 10, 11, '#1b1325');
    p.linha(3, 6, 11, 6, '#1b1325');
    p.linha(3, 6, 10, 11, '#1b1325');
    p.linha(11, 6, 4, 11, '#1b1325');
  },
  pavio_curto: (p, c) => {
    p.ret(4, 7, 6, 6, CERA);
    p.ret(7, 6, 1, 1, PRETO);
    p.disco(7, 4, 2, c);
    p.px(7, 2, '#ffe066');
    p.px(9, 3, '#ffe066');
    p.px(5, 2, '#ffe066');
  },
  coracao_partido: (p, c) => {
    p.disco(4, 5, 3, c);
    p.disco(9, 5, 3, c);
    for (let y = 6; y <= 12; y++) p.ret(7 - (12 - y), y, (12 - y) * 2 + 1, 1, c);
    p.linha(7, 3, 6, 6, PRETO);
    p.linha(6, 6, 8, 9, PRETO);
    p.linha(8, 9, 7, 12, PRETO);
  },
  sapato: (p, c) => {
    p.ret(4, 2, 5, 7, c);
    p.ret(4, 8, 9, 4, c);
    p.ret(4, 11, 9, 1, METAL_E);
    p.px(5, 3, '#cfd8dc');
  },
  faminta: (p, c) => {
    p.disco(7, 7, 5, c);
    p.ret(3, 7, 9, 3, PRETO);
    for (const x of [4, 6, 8, 10]) p.px(x, 7, '#ffffff');
    for (const x of [5, 7, 9]) p.px(x, 9, '#ffffff');
    p.px(5, 4, '#ffe066');
    p.px(9, 4, '#ffe066');
  },
  ampola: (p, c) => {
    p.ret(6, 1, 2, 3, '#cfd8dc');
    p.ret(5, 4, 4, 8, '#cfe8ff');
    p.ret(5, 7, 4, 5, c);
    p.px(7, 12, c);
    p.px(7, 13, c);
  },
  olho_apagador: (p, c) => {
    p.disco(7, 7, 5, PRETO);
    p.disco(7, 7, 3, '#23324a');
    p.ret(4, 6, 2, 2, c);
    p.ret(8, 6, 2, 2, c);
  },
  moeda: (p, c) => {
    p.disco(7, 7, 5, '#c08a10');
    p.disco(7, 7, 4, c);
    p.ret(6, 4, 2, 7, '#c08a10');
    p.px(5, 4, '#ffffff');
    p.px(10, 10, '#9b3bff');
    p.px(11, 9, '#9b3bff');
  },
  dinamite: (p, c) => {
    p.ret(2, 5, 4, 8, c);
    p.ret(6, 5, 4, 8, c);
    p.ret(2, 8, 8, 1, PRETO);
    p.linha(8, 5, 11, 1, MADEIRA);
    p.px(12, 1, '#ffe066');
    p.px(11, 0, '#ff9a2e');
  },
  escudo: (p, c) => {
    p.ret(2, 2, 10, 6, c);
    for (let y = 8; y <= 12; y++) p.ret(2 + (y - 8), y, 10 - (y - 8) * 2, 1, c);
    p.ret(6, 3, 2, 7, '#e2452b');
    p.ret(4, 5, 6, 2, '#e2452b');
  },
  // ---------- itens ativos ----------
  sopro: (p, c) => {
    p.linha(1, 4, 9, 4, c);
    p.linha(9, 4, 11, 2, c);
    p.linha(2, 7, 12, 7, '#ffffff');
    p.linha(12, 7, 12, 5, '#ffffff');
    p.linha(1, 10, 8, 10, c);
    p.linha(8, 10, 10, 12, c);
  },
  relogio_p: (p, c) => {
    p.ret(6, 0, 2, 2, METAL);
    p.disco(7, 8, 5, METAL_E);
    p.disco(7, 8, 4, c);
    p.linha(7, 8, 7, 5, PRETO);
    p.linha(7, 8, 9, 9, PRETO);
    p.ret(3, 3, 2, 1, '#e2452b');
  },
  reserva: (p, c) => {
    for (let i = 0; i < 4; i++) p.ret(3, 4 + i * 2, 8, 1, i % 2 ? c : CERA);
    p.ret(2, 4, 1, 7, MADEIRA);
    p.ret(11, 4, 1, 7, MADEIRA);
    p.linha(7, 3, 9, 1, '#2a2a3a');
    p.chama(10, 1);
  },
  espelho_m: (p, c) => {
    p.disco(6, 5, 5, OURO);
    p.disco(6, 5, 4, c);
    p.linha(4, 3, 6, 2, '#ffffff');
    p.linha(9, 9, 12, 12, MADEIRA, true);
  },
  barril: (p, c) => {
    p.ret(3, 3, 8, 10, MADEIRA);
    p.ret(2, 5, 10, 6, MADEIRA);
    p.ret(2, 5, 10, 1, METAL_E);
    p.ret(2, 10, 10, 1, METAL_E);
    p.ret(5, 6, 4, 3, c);
    p.linha(7, 3, 9, 0, '#2a2a3a');
    p.px(9, 0, '#ffe066');
  },
  fugaz: (p, c) => {
    p.ret(8, 5, 4, 7, CERA);
    p.chama(10, 4);
    for (let i = 0; i < 3; i++) p.linha(1, 6 + i * 2, 5 - i, 6 + i * 2, c);
  },
  dado: (p, c) => {
    p.ret(2, 2, 10, 10, c);
    p.ret(2, 2, 10, 1, '#ffffff');
    for (const [x, y] of [[4, 4], [9, 4], [6, 7], [4, 9], [9, 9]]) p.ret(x, y, 1, 1, PRETO);
  },
  castical_p: (p, c) => {
    p.ret(3, 12, 8, 1, c);
    p.ret(6, 8, 2, 4, c);
    p.ret(4, 8, 6, 1, c);
    p.ret(6, 4, 2, 4, CERA);
    p.chama(7, 3);
    p.ret(1, 6, 2, 1, '#ffe066');
    p.ret(11, 6, 2, 1, '#ffe066');
  },
  sino: (p, c) => {
    p.ret(6, 1, 2, 1, METAL);
    for (let y = 2; y <= 10; y++) {
      const w = 4 + Math.floor((y - 2) * 0.9);
      p.ret(7 - Math.floor(w / 2), y, w, 1, c);
    }
    p.ret(2, 11, 10, 1, PRETO);
    p.ret(6, 12, 2, 1, METAL);
    p.px(5, 4, '#ffffff');
  },
  // ---------- objetos dos itens gerados ----------
  anel: (p, c) => {
    p.disco(7, 8, 5, c);
    p.disco(7, 8, 3, null as unknown as string);
    p.apagar(5, 6, 5, 5);
    p.ret(5, 1, 4, 3, '#ffffff');
    p.ret(6, 2, 2, 1, c);
  },
  colar: (p, c) => {
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI * (i / 8);
      p.px(7 + Math.cos(a) * 5, 3 + Math.sin(a) * 5, METAL);
    }
    p.disco(7, 10, 2, c);
    p.px(6, 9, '#ffffff');
  },
  amuleto: (p, c) => {
    p.linha(3, 1, 7, 5, METAL);
    p.linha(11, 1, 7, 5, METAL);
    for (let y = 5; y <= 12; y++) {
      const w = y < 9 ? (y - 4) * 2 : (13 - y) * 2;
      p.ret(7 - w / 2, y, Math.max(1, w), 1, c);
    }
    p.px(7, 8, '#ffffff');
  },
  pena: (p, c) => {
    p.linha(3, 12, 11, 2, CERA);
    for (let i = 0; i < 6; i++) p.linha(5 + i, 10 - i * 1.5, 8 + i, 11 - i * 1.5, c);
  },
  dente: (p, c) => {
    p.ret(3, 2, 8, 6, CERA);
    p.ret(3, 8, 3, 4, CERA);
    p.ret(8, 8, 3, 4, CERA);
    p.ret(4, 3, 2, 1, c);
  },
  chave: (p, c) => {
    p.disco(4, 4, 3, c);
    p.apagar(3, 3, 2, 2);
    p.linha(6, 6, 12, 12, c, true);
    p.ret(9, 11, 2, 2, c);
    p.ret(11, 9, 2, 2, c);
  },
  pergaminho: (p, c) => {
    p.ret(3, 2, 8, 10, '#e8d8b0');
    p.ret(2, 1, 10, 2, MADEIRA);
    p.ret(2, 11, 10, 2, MADEIRA);
    for (let y = 4; y <= 9; y += 2) p.ret(4, y, 6, 1, c);
  },
  runa: (p, c) => {
    p.disco(7, 7, 6, '#5a5468');
    p.linha(7, 3, 7, 11, c);
    p.linha(7, 5, 10, 3, c);
    p.linha(7, 8, 4, 6, c);
  },
  osso: (p, c) => {
    p.linha(3, 3, 11, 11, CERA, true);
    for (const [x, y] of [[2, 2], [4, 1], [1, 4], [12, 10], [10, 12], [12, 12]]) p.ret(x, y, 2, 2, CERA);
    p.px(7, 7, c);
  },
  mascara: (p, c) => {
    p.ret(2, 3, 10, 7, c);
    p.ret(3, 10, 8, 2, c);
    p.ret(4, 5, 2, 2, PRETO);
    p.ret(8, 5, 2, 2, PRETO);
    p.ret(6, 8, 2, 1, PRETO);
  },
  capa: (p, c) => {
    p.ret(4, 1, 6, 2, OURO);
    for (let y = 3; y <= 12; y++) p.ret(4 - Math.floor((y - 3) / 3), y, 6 + Math.floor((y - 3) / 3) * 2, 1, c);
    p.linha(7, 3, 7, 12, PRETO);
  },
  carta: (p, c) => {
    p.ret(3, 1, 8, 12, '#ffffff');
    p.ret(3, 1, 8, 1, PRETO);
    p.disco(7, 7, 2, c);
    p.px(4, 2, c);
    p.px(9, 11, c);
  },
  bussola: (p, c) => {
    p.disco(7, 7, 6, OURO);
    p.disco(7, 7, 5, '#f4ead6');
    p.linha(7, 7, 7, 3, c);
    p.linha(7, 7, 7, 11, METAL_E);
  },
  pedra: (p, c) => {
    p.disco(7, 8, 5, '#7d8494');
    p.ret(4, 6, 3, 2, '#9a93a3');
    p.px(9, 9, c);
    p.px(5, 10, c);
  },
  // ---------- itens de referência ----------
  cogumelo: (p, c) => {
    p.disco(7, 6, 5, c);
    p.apagar(0, 7, 14, 7);
    p.ret(2, 6, 10, 1, c);
    p.ret(4, 7, 6, 5, CERA);
    p.ret(5, 8, 1, 2, PRETO);
    p.ret(8, 8, 1, 2, PRETO);
    p.disco(4, 4, 1, '#ffffff');
    p.disco(10, 4, 1, '#ffffff');
  },
  estrela: (p, c) => {
    for (let y = 1; y <= 12; y++) {
      const w = y <= 4 ? y : y <= 6 ? 12 : y <= 9 ? 8 : 4 + (y - 9) * 2;
      p.ret(7 - w / 2, y, w, 1, c);
    }
    p.ret(5, 6, 1, 2, PRETO);
    p.ret(8, 6, 1, 2, PRETO);
  },
  triangulo: (p, c) => {
    const tri = (x: number, y: number) => { for (let i = 0; i < 4; i++) p.ret(x + 3 - i, y + i, 1 + i * 2, 1, c); };
    tri(4, 2);
    tri(1, 6);
    tri(7, 6);
  },
  cubo: (p, c) => {
    p.ret(2, 3, 10, 9, c);
    p.ret(2, 3, 10, 2, '#ffffff');
    p.disco(7, 8, 2, '#ffffff');
    p.px(7, 8, c);
  },
  pato: (p, c) => {
    p.disco(8, 9, 4, c);
    p.disco(5, 5, 3, c);
    p.ret(1, 5, 2, 2, '#ff9a2e');
    p.px(5, 4, PRETO);
  },
  xicara: (p, c) => {
    p.ret(2, 5, 8, 7, c);
    p.ret(3, 5, 6, 1, '#5c3a1a');
    p.disco(11, 8, 2, c);
    p.apagar(11, 8, 1, 1);
    for (const x of [4, 7]) p.linha(x, 1, x + 1, 3, '#cfd8dc');
  },
  pilula: (p, c) => {
    p.linha(3, 10, 10, 3, c, true);
    p.linha(3, 11, 10, 4, c, true);
    p.linha(7, 6, 10, 3, '#ffffff', true);
  },
  livro: (p, c) => {
    p.ret(3, 1, 9, 12, c);
    p.ret(3, 1, 1, 12, '#7d8494');
    p.ret(5, 4, 5, 1, '#ffffff');
    p.ret(5, 6, 4, 1, '#ffffff');
  },
  rosquinha: (p, c) => {
    p.disco(7, 7, 5, '#e8b070');
    p.disco(7, 7, 4, c);
    p.disco(7, 7, 1, null as unknown as string);
    p.apagar(6, 6, 3, 3);
    for (const [x, y] of [[4, 5], [9, 4], [10, 8], [5, 10]]) p.px(x, y, '#ffffff');
  },
  esfera: (p, c) => {
    p.disco(7, 7, 5, c);
    p.ret(5, 4, 2, 2, '#ffffff');
    p.px(8, 8, '#e2452b');
    p.px(6, 9, '#e2452b');
  },
  chapeu_palha: (p, c) => {
    p.ret(1, 9, 12, 2, c);
    p.ret(4, 4, 6, 5, c);
    p.ret(4, 7, 6, 1, '#e2452b');
  },
  bandana: (p, c) => {
    p.ret(1, 5, 12, 4, c);
    p.ret(4, 5, 6, 4, '#cfd8dc');
    p.linha(5, 7, 8, 7, METAL_E);
    p.ret(12, 7, 2, 4, c);
  },
};

function pincel(buf: Buf): Pincel {
  const px: Pinta = (x, y, cor) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < T && y < T) buf[y][x] = cor;
  };
  const p: Pincel = {
    px,
    ret: (x, y, w, h, cor) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, cor);
    },
    disco: (cx, cy, r, cor) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, cor);
    },
    linha: (x0, y0, x1, y1, cor, grossa = false) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const y = y0 + ((y1 - y0) * i) / n;
        px(x, y, cor);
        if (grossa) px(x + 1, y, cor);
      }
    },
    chama: (x, y) => {
      px(x, y - 3, '#ffe066');
      px(x - 1, y - 2, '#ff9a2e');
      px(x, y - 2, '#ffe066');
      px(x + 1, y - 2, '#ff9a2e');
      px(x, y - 1, '#ff9a2e');
      px(x, y, PRETO);
    },
    apagar: (x, y, w, h) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (buf[y + j]?.[x + i] !== undefined) buf[y + j][x + i] = null;
    },
  };
  return p;
}

/** Gera a textura "icone_<id>" de cada item (passivos e ativos). */
export function gerarIcones(scene: Phaser.Scene) {
  for (const it of [...D.itens, ...D.ativos]) {
    const chave = `icone_${it.id}`;
    if (scene.textures.exists(chave)) continue;
    // familiares: o ícone é o próprio bichinho, encolhido para caber
    const pronta = 'iconeTextura' in it ? it.iconeTextura : undefined;
    if (pronta && scene.textures.exists(pronta)) {
      const fr = scene.textures.getFrame(pronta);
      const tex = scene.textures.createCanvas(chave, T + 2, T + 2);
      if (!tex) continue;
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      const esc = Math.min(1, T / Math.max(fr.cutWidth, fr.cutHeight));
      const w = Math.round(fr.cutWidth * esc);
      const h = Math.round(fr.cutHeight * esc);
      ctx.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, Math.floor((T + 2 - w) / 2), Math.floor((T + 2 - h) / 2), w, h);
      tex.refresh();
      continue;
    }
    const buf: Buf = Array.from({ length: T }, () => new Array(T).fill(null));
    (DESENHOS[it.icone] ?? DESENHOS.orbe)(pincel(buf), it.cor);
    if ('raridade' in it && it.raridade >= 3) for (const [x, y] of [[12, 1], [11, 2], [12, 2], [13, 2], [12, 3]]) buf[y][x] = '#ffe066';
    // contorno: pinta de escuro todo vazio que encosta num pixel colorido
    const contorno: [number, number][] = [];
    for (let y = -1; y <= T; y++) {
      for (let x = -1; x <= T; x++) {
        if (buf[y]?.[x]) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => buf[y + dy]?.[x + dx])) contorno.push([x, y]);
      }
    }
    const tex = scene.textures.createCanvas(chave, T + 2, T + 2);
    if (!tex) continue;
    const ctx = tex.getContext();
    for (const [x, y] of contorno) {
      ctx.fillStyle = PRETO;
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const cor = buf[y][x];
        if (!cor) continue;
        ctx.fillStyle = cor;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
    tex.refresh();
  }
}

// Gera o ícone do programa (build/icon.png e build/icon.ico) a partir do desenho da Velinha
// que está em src/arte/texturas.ts: a vela 2x num quadrado escuro com o brilho da chama.
// Uso: node scripts/icone.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';

const fonte = fs.readFileSync('src/arte/texturas.ts', 'utf8');
const grade = (nome) => {
  const m = fonte.match(new RegExp(`export const ${nome}: Grade = \\[([\\s\\S]*?)\\];`));
  return [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]);
};
const pal = {};
for (const [, k, v] of fonte.match(/export const PAL[\s\S]*?\n};/)[0].matchAll(/(\w): '(#[0-9a-fA-F]{6})'/g)) pal[k] = v;
const vela = [...grade('CHAMA_A'), ...grade('CORPO'), ...grade('PES_PARADO')]; // 16x16

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const N = 32;
const px = Array.from({ length: N * N }, () => [0, 0, 0, 0]);
const pinta = (x, y, rgba) => (px[y * N + x] = rgba);

// fundo: quadrado de cantos redondos, escuro, com o brilho alaranjado da chama
const [cx, cy] = [15.5, 7];
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const canto = (a, b) => Math.hypot(a, b) > 5.2;
    const dx = Math.max(0, 5 - x, x - (N - 6));
    const dy = Math.max(0, 5 - y, y - (N - 6));
    if (dx && dy && canto(dx, dy)) continue;
    const borda = x === 0 || y === 0 || x === N - 1 || y === N - 1 || (dx && dy && Math.hypot(dx, dy) > 4.2);
    const d = Math.hypot(x - cx, y - cy);
    const brilho = Math.max(0, 1 - d / 17);
    const base = [27, 19, 37];
    const laranja = [255, 140, 40];
    const c = base.map((v, i) => Math.round(v + (laranja[i] - v) * brilho * 0.55));
    pinta(x, y, borda ? [7, 5, 11, 255] : [...c, 255]);
  }
}
// a vela em 2x, centralizada
vela.forEach((linha, y) => {
  for (let x = 0; x < linha.length; x++) {
    const cor = pal[linha[x]];
    if (!cor) continue;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const X = x * 2 + a;
      const Y = y * 2 + b - 1;
      if (X >= 0 && Y >= 0 && X < N && Y < N) pinta(X, Y, [...hex(cor), 255]);
    }
  }
});

// ---------- PNG ----------
const tabela = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = tabela[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloco = (tipo, dados) => {
  const t = Buffer.from(tipo, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(Buffer.concat([t, dados])));
  return Buffer.concat([len, t, dados, c]);
};
function png(escala) {
  const L = N * escala;
  const linhas = Buffer.alloc((L * 4 + 1) * L);
  for (let y = 0; y < L; y++) {
    linhas[y * (L * 4 + 1)] = 0;
    for (let x = 0; x < L; x++) {
      const p = px[Math.floor(y / escala) * N + Math.floor(x / escala)];
      p.forEach((v, i) => (linhas[y * (L * 4 + 1) + 1 + x * 4 + i] = v));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(L, 0);
  ihdr.writeUInt32BE(L, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', zlib.deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- ICO (com PNGs dentro: 256, 128, 64 e 32) ----------
const tamanhos = [8, 4, 2, 1].map((e) => [N * e, png(e)]);
const cab = Buffer.alloc(6);
cab.writeUInt16LE(0, 0);
cab.writeUInt16LE(1, 2);
cab.writeUInt16LE(tamanhos.length, 4);
let offset = 6 + 16 * tamanhos.length;
const entradas = tamanhos.map(([lado, dados]) => {
  const e = Buffer.alloc(16);
  e[0] = lado >= 256 ? 0 : lado;
  e[1] = lado >= 256 ? 0 : lado;
  e.writeUInt16LE(1, 4); // planos
  e.writeUInt16LE(32, 6); // bits por pixel
  e.writeUInt32LE(dados.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += dados.length;
  return e;
});
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync('build/icon.ico', Buffer.concat([cab, ...entradas, ...tamanhos.map(([, d]) => d)]));
fs.writeFileSync('build/icon.png', tamanhos[0][1]);
console.log('build/icon.png e build/icon.ico gerados');

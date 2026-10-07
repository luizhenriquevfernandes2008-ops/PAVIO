import Phaser from 'phaser';
import { D } from '../dados';

// Lê o atlas do pack 0x72 (um PNG + uma lista "nome x y largura altura")
// e monta texturas com os mesmos nomes que o jogo usa (esqueleto, piso, bau...).
// Se o atlas não existir, nada é criado e o jogo usa a arte embutida.

interface Quadro {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const Atlas = {
  ok: false,
  quadros: new Map<string, Quadro>(),
  /** índices dos quadros de cada personagem: parado e andar */
  herois: new Map<string, { parado: number[]; andar: number[] }>(),
};

function lerLista(texto: string) {
  for (const linha of texto.split('\n')) {
    const p = linha.trim().split(/\s+/);
    if (p.length < 5) continue;
    const [nome, x, y, w, h] = p;
    Atlas.quadros.set(nome, { x: +x, y: +y, w: +w, h: +h });
  }
}

/** Nomes dos quadros de uma animação: prefixo_f0, prefixo_f1, ... */
export function quadrosDaAnim(prefixo: string): string[] {
  const nomes: string[] = [];
  for (let i = 0; Atlas.quadros.has(`${prefixo}_f${i}`); i++) nomes.push(`${prefixo}_f${i}`);
  return nomes;
}

/** Copia quadros do atlas para uma textura nova (quadros 0..n-1, alinhados pela base). */
function copiar(scene: Phaser.Scene, chave: string, nomes: string[]): boolean {
  const qs = nomes.map((n) => Atlas.quadros.get(n));
  if (!qs.length || qs.some((q) => !q)) {
    if (nomes.length) console.warn(`[PAVIO] Quadros não encontrados para "${chave}":`, nomes.filter((_, i) => !qs[i]));
    return false;
  }
  if (scene.textures.exists(chave)) scene.textures.remove(chave);
  const w = Math.max(...qs.map((q) => q!.w));
  const h = Math.max(...qs.map((q) => q!.h));
  const tex = scene.textures.createCanvas(chave, w * qs.length, h);
  if (!tex) return false;
  const ctx = tex.getContext();
  const img = scene.textures.get('dungeon').getSourceImage() as HTMLImageElement;
  qs.forEach((q, i) => {
    const dx = i * w + Math.floor((w - q!.w) / 2);
    const dy = h - q!.h;
    ctx.drawImage(img, q!.x, q!.y, q!.w, q!.h, dx, dy, q!.w, q!.h);
    tex.add(i, 0, i * w, 0, w, h);
  });
  tex.refresh();
  return true;
}

export function prepararAtlas(scene: Phaser.Scene) {
  if (!scene.textures.exists('dungeon')) return;
  const lista = scene.cache.text.get('dungeon_lista') as string | undefined;
  if (!lista) return;
  lerLista(lista);
  Atlas.ok = true;
  const v = D.visual;

  for (const [chave, def] of Object.entries(v.inimigos)) copiar(scene, chave, quadrosDaAnim(def.anim));

  for (const p of v.personagens) {
    if (!p.atlas) continue;
    const parado = quadrosDaAnim(`${p.atlas}_idle_anim`);
    const andar = quadrosDaAnim(`${p.atlas}_run_anim`);
    if (copiar(scene, `heroi_${p.id}`, [...parado, ...andar])) {
      Atlas.herois.set(p.id, {
        parado: parado.map((_, i) => i),
        andar: andar.map((_, i) => parado.length + i),
      });
    }
  }

  for (const [chave, nomes] of Object.entries(v.cenario)) copiar(scene, chave, nomes);
}

/** Escala/corpo vindos do visual.json (o demônio do pack já é grande, não precisa de escala 2). */
export function ajusteVisual(chaveSprite: string) {
  return Atlas.ok ? D.visual.inimigos[chaveSprite] : undefined;
}

import Phaser from 'phaser';
import { D, ArmaDef, arma as acharArma, registrarArma } from '../dados';

// A bigorna junta duas armas numa só: o melhor de cada uma, um desenho meio-a-meio
// e um tier acima. Algumas duplas têm nome próprio.

const NOMES_ESPECIAIS: Record<string, [string, string]> = {
  'nix+tete': ['Briga de Cão e Gato', 'Latidos e miados ao mesmo tempo. Ninguém sai ileso.'],
  'tete+yuumi': ['Bagunça na Sala', 'A TETE e a YUUMI correndo pela casa. Destrói tudo.'],
  'nix+yuumi': ['Gatas do Apocalipse', 'Duas gatas, nenhuma paciência.'],
};

// atributos em que "mais" é melhor e em que "menos" é melhor
const MAIOR = ['dano', 'pente', 'projeteis', 'velocidade', 'alcance', 'empurrao', 'tremor'] as const;
const MENOR = ['cadencia', 'recarga', 'dispersao', 'recuo'] as const;

export function idFusao(a: string, b: string) {
  return `fusao_${a}__${b}`;
}

export function ehFusao(id: string) {
  return id.startsWith('fusao_');
}

/** Cria (ou devolve, se já existe) a arma fundida e o desenho dela. */
export function fundir(scene: Phaser.Scene, idA: string, idB: string): ArmaDef {
  const id = idFusao(idA, idB);
  const pronta = D.armas.find((w) => w.id === id);
  if (pronta) return pronta;
  const a = acharArma(idA);
  const b = acharArma(idB);
  // a de tier maior manda no tipo de bala e no som
  const [forte, fraca] = b.raridade > a.raridade ? [b, a] : [a, b];
  const def: ArmaDef = { ...fraca, ...forte };
  // efeitos especiais das duas (números: o maior; sim/não: se qualquer uma tiver)
  for (const [k, v] of Object.entries(fraca) as [string, unknown][]) {
    const atual = (def as unknown as Record<string, unknown>)[k];
    if (typeof v === 'number' && typeof atual === 'number') (def as unknown as Record<string, unknown>)[k] = Math.max(v, atual);
    if (typeof v === 'boolean') (def as unknown as Record<string, unknown>)[k] = v || !!atual;
  }
  for (const k of MAIOR) def[k] = Math.max(a[k], b[k]);
  for (const k of MENOR) def[k] = Math.min(a[k], b[k]);
  def.dano = Math.round(def.dano * 1.1 * 10) / 10;
  def.municao = a.municao < 0 || b.municao < 0 ? -1 : Math.max(a.municao, b.municao);
  def.raridade = Math.min(5, Math.max(a.raridade, b.raridade) + 1);
  def.aquecimento = a.aquecimento && b.aquecimento ? Math.min(a.aquecimento, b.aquecimento) : undefined;
  def.exclusivo = undefined;
  def.id = id;
  const chaveNome = [idA, idB].sort().join('+');
  const especial = NOMES_ESPECIAIS[chaveNome];
  def.nome = especial?.[0] ?? `${a.nome} + ${b.nome}`;
  def.desc = especial?.[1] ?? `Fusão de ${a.nome} com ${b.nome}: o melhor das duas.`;
  def.cor = misturar(a.cor, b.cor);
  def.sprite = desenharFusao(scene, id, a.sprite, b.sprite);
  registrarArma(def);
  return def;
}

function misturar(c1: string, c2: string) {
  const a = Phaser.Display.Color.HexStringToColor(c1);
  const b = Phaser.Display.Color.HexStringToColor(c2);
  return Phaser.Display.Color.RGBToString(Math.round((a.red + b.red) / 2), Math.round((a.green + b.green) / 2), Math.round((a.blue + b.blue) / 2));
}

/** Desenho meio-a-meio: a traseira da arma A e a frente (o cano) da arma B. */
function desenharFusao(scene: Phaser.Scene, chave: string, texA: string, texB: string) {
  if (scene.textures.exists(chave)) return chave;
  const fa = scene.textures.getFrame(texA);
  const fb = scene.textures.getFrame(texB);
  const w = Math.max(fa.cutWidth, fb.cutWidth);
  const h = Math.max(fa.cutHeight, fb.cutHeight);
  const tex = scene.textures.createCanvas(chave, w, h);
  if (!tex) return texA;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  // A inteira, encostada embaixo
  ctx.drawImage(fa.source.image as CanvasImageSource, fa.cutX, fa.cutY, fa.cutWidth, fa.cutHeight, 0, h - fa.cutHeight, fa.cutWidth, fa.cutHeight);
  // metade da frente de B por cima (apaga antes para não misturar contornos)
  const meio = Math.floor(fb.cutWidth / 2);
  const ox = w - fb.cutWidth;
  ctx.clearRect(ox + meio, 0, w - (ox + meio), h);
  ctx.drawImage(fb.source.image as CanvasImageSource, fb.cutX + meio, fb.cutY, fb.cutWidth - meio, fb.cutHeight, ox + meio, h - fb.cutHeight, fb.cutWidth - meio, fb.cutHeight);
  // costura brilhante entre as duas metades
  ctx.fillStyle = 'rgba(255, 210, 63, 0.9)';
  for (let y = 0; y < h; y++) {
    const px = ctx.getImageData(ox + meio, y, 1, 1).data;
    if (px[3] > 0) ctx.fillRect(ox + meio, y, 1, 1);
  }
  tex.refresh();
  return chave;
}

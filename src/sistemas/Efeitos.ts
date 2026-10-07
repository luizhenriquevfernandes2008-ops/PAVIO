import Phaser from 'phaser';
import { D, ArmaDef, Mods, item as acharItem, arma as acharArma } from '../dados';
import { Estado, popup, avisar } from '../estado';
import { modsDoTiro, sinergiasAtivas } from './Itens';
import type { Jogador } from '../entidades/Jogador';
import type { Inimigo } from '../entidades/Inimigo';
import { Som } from '../som';
import { MUNDO_L, MUNDO_A, OY, TILE, ROWS, COLS } from '../constantes';

// Motor de efeitos dos itens.
// - EFEITOS: peças pequenas (explosão, nuvem, lâminas, cães, meteoros...) com parâmetros.
// - GATILHOS: quando um item dispara um efeito (ao matar, ao acertar, ao dar dash...).
// - PASSIVOS: regras especiais que ficam ligadas (golpe duplo, "Infinito", três espadas...).
// Itens ativos usam a mesma lista de efeitos.

export type Efeito = [string, Record<string, number | string | boolean>?];
export type Quando =
  | 'acertar' | 'critico' | 'matar' | 'dano' | 'dash' | 'parry' | 'tiro' | 'tempo' | 'sala' | 'limpar'
  | 'chamaBaixa' | 'combo' | 'recarregar';

export interface Gatilho {
  quando: Quando;
  efeitos: Efeito[];
  chance?: number; // 0..1 (padrão 1)
  cd?: number; // segundos de espera entre um disparo e outro
  cada?: number; // a cada N vezes (tiros) ou N segundos (tempo / chamaBaixa)
}

export interface Contexto {
  x: number;
  y: number;
  alvo?: Inimigo;
  gatilho?: boolean; // veio de um item (não de um ativo): escudo e cura têm tempo mínimo
}

type Sprite = Phaser.Physics.Arcade.Sprite;

/** O que o motor usa da cena Jogo (vários são privados lá). */
interface JogoFx extends Phaser.Scene {
  jogador: Jogador;
  listaInimigos(): Inimigo[];
  ferirInimigo(ini: Inimigo, dano: number, dir: Phaser.Math.Vector2 | null, fonte?: 'queima' | 'veneno' | 'explosao' | 'raio', empurrao?: number, semPopup?: boolean): void;
  explodir(x: number, y: number, raio: number, dano: number, mods?: Mods): void;
  raio(x: number, y: number, dano: number, saltos: number, ja: Set<Inimigo>): void;
  criarBala(x: number, y: number, ang: number, vel: number, vida: number, def: ArmaDef, mods: Mods, dano: number, fragmento?: boolean): Sprite;
  disparar(def: ArmaDef, mods: Mods): void;
  soltarCera(x: number, y: number, n: number): void;
  faiscas(x: number, y: number, cor: number, n: number, alcance?: number): void;
  anelLuz(x: number, y: number, cor: number, raio: number): void;
  piscar(r: number, g: number, b: number, ms: number): void;
  tremer(ms: number, intensidade: number): void;
  camaraLenta(escala: number, msReal: number): void;
  estourarProjetil(p: Sprite): void;
  matarInimigo(ini: Inimigo): void;
  posicaoLivre(x: number, y: number, dist: number): { x: number; y: number };
  marcaAlvo(x: number, y: number, raio: number, ms: number): void;
  encherMunicao(pentes: number): void;
  criarBauEm(x: number, y: number): void;
  itemSurpresa(x: number, y: number): void;
  rolarDado(): void;
  explosaoNasParedes(x: number, y: number, raio: number): void;
  posicionarFamiliares(): void;
  projeteis: Phaser.Physics.Arcade.Group;
  grade: string[][];
  escudoAtivo: boolean;
  flashes: { x: number; y: number; r: number; t?: number; cor?: number }[];
}

interface Nuvem { x: number; y: number; r: number; t: number; dps: number; tipo: string; g: Phaser.GameObjects.Ellipse; tick: number }
interface Lamina { img: Phaser.GameObjects.Image; t: number; dano: number; fase: number }
/** Como o bichinho age: morde (cães e gatas), voa (morcego), gira em volta (mariposa), atira (fantasma), ilumina (vagalume) ou dá rasantes (coruja). */
type TipoBicho = 'mordida' | 'voo' | 'orbita' | 'atirador' | 'luz' | 'rasante';
interface Cao { spr: Phaser.GameObjects.Sprite; sombra: Phaser.GameObjects.Ellipse; t: number; permanente: boolean; vx: number; vy: number; cd: number; fase: number; bote: number; tipo: TipoBicho; chave?: string }

/** Itens de familiar: passivo → [desenho, jeito de agir]. */
const FAMILIARES: Record<string, [string, TipoBicho]> = {
  familiar_tete: ['arma_tete', 'mordida'],
  familiar_nix: ['arma_nix', 'mordida'],
  familiar_yuumi: ['arma_yuumi', 'mordida'],
  familiar_morcego: ['fam_morcego', 'voo'],
  familiar_mariposa: ['fam_mariposa', 'orbita'],
  familiar_fantasma: ['fam_fantasma', 'atirador'],
  familiar_vagalume: ['fam_vagalume', 'luz'],
  familiar_coruja: ['fam_coruja', 'rasante'],
};
interface Clone { spr: Phaser.GameObjects.Image; t: number; lado: number }
interface Mina { x: number; y: number; dano: number; armar: number; img: Phaser.GameObjects.Image }
interface Buff { stat: 'dano' | 'cadencia' | 'velocidade'; mult: number; t: number }
interface Ativo { g: Gatilho; cdAte: number; conta: number; tempo: number }

const COR = (hex: string | number | boolean | undefined, padrao: number) =>
  typeof hex === 'string' ? Phaser.Display.Color.HexStringToColor(hex).color : typeof hex === 'number' ? hex : padrao;

export class MotorEfeitos {
  private nuvens: Nuvem[] = [];
  private laminas: Lamina[] = [];
  private caes: Cao[] = [];
  private clones: Clone[] = [];
  private minas: Mina[] = [];
  private buffs: Buff[] = [];
  private laserGiro: { t: number; dano: number; ang: number; tick: number } | null = null;
  private cortes: { t: number; dano: number; tick: number } | null = null;
  private gatilhos: Ativo[] = [];
  private passivos = new Set<string>();
  private criticos = 0;
  private auraT = 0;
  private relogio = 0;
  private limite = new Map<string, number>(); // tempo mínimo entre efeitos fortes vindos de itens
  private gfx: Phaser.GameObjects.Graphics;

  constructor(private readonly cena: Phaser.Scene) {
    this.gfx = cena.add.graphics().setDepth(5150).setBlendMode(Phaser.BlendModes.ADD);
  }

  private get j() {
    return this.cena as unknown as JogoFx;
  }

  private get s() {
    return Estado.run!.stats;
  }

  // ===================== itens: gatilhos e passivos =====================

  /** Refaz a lista de gatilhos e passivos a partir dos itens da partida. */
  recarregarItens() {
    const run = Estado.run!;
    const antigos = new Map(this.gatilhos.map((a) => [a.g, a]));
    this.gatilhos = [];
    this.passivos.clear();
    for (const id of run.itens) {
      const it = acharItem(id);
      if (!it) continue;
      for (const p of it.passivos ?? []) this.passivos.add(p);
      for (const g of it.gatilhos ?? []) this.gatilhos.push(antigos.get(g) ?? { g, cdAte: 0, conta: 0, tempo: 0 });
    }
    // sinergias e transformações também trazem passivos e gatilhos
    for (const sg of sinergiasAtivas(run.itens)) {
      if (sg.arma) continue;
      for (const p of sg.passivos ?? []) this.passivos.add(p);
      for (const g of sg.gatilhos ?? []) this.gatilhos.push(antigos.get(g) ?? { g, cdAte: 0, conta: 0, tempo: 0 });
    }
    // cães permanentes (Cães Divinos)
    const querCaes = this.passivos.has('caes') ? 2 : 0;
    const temCaes = this.caes.filter((c) => c.permanente && !c.chave).length;
    for (let k = temCaes; k < querCaes; k++) this.criarCao(0, k % 2 ? 0x1b1325 : 0xf4ead6);
    // familiares: um de cada item (e some se o item sair, como no Altar da Troca)
    for (const [chave, [tex, tipo]] of Object.entries(FAMILIARES)) {
      const tem = this.caes.find((c) => c.chave === chave);
      if (this.passivos.has(chave) && !tem) this.criarCao(0, 0xf4ead6, tex, tipo, chave);
      if (!this.passivos.has(chave) && tem) {
        tem.spr.destroy();
        tem.sombra.destroy();
        this.caes = this.caes.filter((c) => c !== tem);
      }
    }
  }

  tem(passivo: string) {
    return this.passivos.has(passivo);
  }

  /** Um evento do jogo: confere os gatilhos dos itens. */
  evento(quando: Quando, ctx: Contexto) {
    const agora = this.cena.time.now / 1000;
    for (const a of this.gatilhos) {
      const g = a.g;
      if (g.quando !== quando) continue;
      if (agora < a.cdAte) continue;
      if (g.cada) {
        a.conta++;
        if (a.conta < g.cada) continue;
        a.conta = 0;
      }
      if (g.chance !== undefined && Math.random() >= g.chance * (1 + this.s.sorte * 0.1)) continue;
      a.cdAte = agora + (g.cd ?? 0);
      for (const e of g.efeitos) this.executar(e, { ...ctx, gatilho: true });
    }
  }

  // ===================== modificadores consultados pelo jogo =====================

  mult(stat: Buff['stat']) {
    let m = 1;
    for (const b of this.buffs) if (b.stat === stat) m *= b.mult;
    return m;
  }

  /** Um crítico garantido (de "criticos")? Gasta um. */
  usarCritico() {
    if (this.criticos <= 0) return false;
    this.criticos--;
    return true;
  }

  /** Três espadas e clones: cada tiro seu também sai deles. */
  aoDisparar(x: number, y: number, ang: number, def: ArmaDef, mods: Mods, dano: number) {
    const j = this.j;
    if (this.tem('santoryu')) {
      for (const d of [-0.28, 0.28]) {
        const b = j.criarBala(x, y, ang + d, 260, 0.45, acharArma('serra'), { perfura: 2 }, dano * 0.6);
        b.setTint(0xcfd8dc).setScale(0.8);
      }
    }
    for (const c of this.clones) {
      const b = j.criarBala(c.spr.x, c.spr.y - 4, ang, def.velocidade * (mods.velBala ?? 1), (def.alcance * this.s.alcance) / def.velocidade, def, mods, dano * 0.6);
      b.setAlpha(0.7);
    }
  }

  /** Golpe duplo e ressonância: depois de cada acerto de bala. */
  aposAcerto(ini: Inimigo, dano: number) {
    const j = this.j;
    if (this.tem('golpeDuplo') && !ini.morto) {
      this.cena.time.delayedCall(180, () => {
        if (ini.morto || !ini.active) return;
        j.ferirInimigo(ini, dano * 0.5, null, 'raio', 0, true);
        j.faiscas(ini.x, ini.y, 0x4f9dff, 4);
      });
    }
    if (this.tem('ressonancia') && Math.random() < 0.3) {
      const outros = j.listaInimigos().filter((o) => o !== ini && !o.morto);
      const o = outros[Math.floor(Math.random() * outros.length)];
      if (o) {
        j.ferirInimigo(o, dano * 0.6, null, 'raio', 0);
        this.linha(ini.x, ini.y, o.x, o.y, 0xff8ac8);
      }
    }
  }

  /** Mera Mera e Perna do Diabo: o dash vira ataque. */
  duranteDash() {
    const j = this.j;
    const jg = j.jogador;
    if (this.tem('mera') && Math.random() < 0.5) this.nuvem(jg.x, jg.y + 4, 12, 1.5, 3, 'fogo');
    if (this.tem('diableJambe')) {
      for (const ini of j.listaInimigos()) {
        if (ini.morto || ini.getData('chutado')) continue;
        if (Phaser.Math.Distance.Between(ini.x, ini.y, jg.x, jg.y) < 16) {
          ini.setData('chutado', true);
          this.cena.time.delayedCall(400, () => ini.active && ini.setData('chutado', false));
          j.ferirInimigo(ini, 4 * this.s.dano, jg.dashDir.clone(), undefined, 260);
          ini.aplicarStatus('queima', 2.5);
          popup(ini.x, ini.y - 12, 'CHUTE!', '#ff7a2e', 8);
        }
      }
    }
  }

  // ===================== loop =====================

  atualizar(dt: number) {
    const j = this.j;
    const jg = j.jogador;
    const s = this.s;
    const run = Estado.run!;
    this.gfx.clear();
    this.relogio += dt;

    // gatilhos por tempo
    for (const a of this.gatilhos) {
      if (a.g.quando !== 'tempo' && a.g.quando !== 'chamaBaixa') continue;
      if (a.g.quando === 'chamaBaixa' && run.chama > s.chamaMax * 0.3) continue;
      a.tempo += dt;
      if (a.tempo >= (a.g.cada ?? 6)) {
        a.tempo = 0;
        if (j.listaInimigos().some((i) => !i.morto) || a.g.quando === 'chamaBaixa')
          for (const e of a.g.efeitos) this.executar(e, { x: jg.x, y: jg.y, gatilho: true });
      }
    }

    this.buffs = this.buffs.filter((b) => (b.t -= dt) > 0);

    // nuvens (fogo, veneno, gelo) ferem os monstros dentro
    this.nuvens = this.nuvens.filter((n) => {
      n.t -= dt;
      n.tick -= dt;
      if (n.t < 0.5) n.g.setAlpha(Math.max(0, n.t));
      if (n.t <= 0) {
        n.g.destroy();
        return false;
      }
      if (n.tick <= 0) {
        n.tick = 0.3;
        for (const ini of j.listaInimigos()) {
          if (ini.morto || Phaser.Math.Distance.Between(ini.x, ini.y, n.x, n.y) > n.r + 4) continue;
          j.ferirInimigo(ini, n.dps * 0.3 * s.dano, null, n.tipo === 'veneno' ? 'veneno' : 'queima', 0, true);
          if (n.tipo === 'gelo') ini.aplicarStatus('congelado', 0.5);
          if (n.tipo === 'fogo') ini.aplicarStatus('queima', 1);
          if (n.tipo === 'veneno') ini.aplicarStatus('veneno', 1);
        }
      }
      return true;
    });

    // lâminas girando em volta da vela
    this.laminas = this.laminas.filter((l) => {
      l.t -= dt;
      if (l.t <= 0) {
        l.img.destroy();
        return false;
      }
      const a = this.relogio * 5 + l.fase;
      l.img.setPosition(jg.maoX + Math.cos(a) * 22, jg.maoY + Math.sin(a) * 22).setRotation(a * 3);
      for (const ini of j.listaInimigos()) {
        if (ini.morto || ini.getData('laminaCd') > this.relogio) continue;
        if (Phaser.Math.Distance.Between(ini.x, ini.y, l.img.x, l.img.y) < 10) {
          ini.setData('laminaCd', this.relogio + 0.25);
          j.ferirInimigo(ini, l.dano * s.dano, null, undefined, 40);
        }
      }
      return true;
    });

    // bichinhos: cães, a TETE, a NIX, a YUUMI e os familiares
    this.caes = this.caes.filter((c, i) => {
      if (!c.permanente) c.t -= dt;
      if (!c.permanente && c.t <= 0) {
        j.faiscas(c.spr.x, c.spr.y, 0xffffff, 6);
        c.spr.destroy();
        c.sombra.destroy();
        return false;
      }
      c.cd -= dt;
      this.atualizarBicho(c, i, dt);
      return true;
    });

    // clones seguem a vela dos lados
    this.clones = this.clones.filter((c) => {
      c.t -= dt;
      if (c.t <= 0) {
        j.faiscas(c.spr.x, c.spr.y, 0xb06bff, 8);
        c.spr.destroy();
        return false;
      }
      c.spr.x += (jg.x + c.lado * 16 - c.spr.x) * Math.min(1, dt * 8);
      c.spr.y += (jg.y + 2 - c.spr.y) * Math.min(1, dt * 8);
      c.spr.setTexture(jg.texture.key, jg.frame.name).setFlipX(jg.flipX).setDepth(9 + c.spr.y);
      return true;
    });

    // minas suas: explodem quando um monstro chega perto
    this.minas = this.minas.filter((m) => {
      m.armar -= dt;
      m.img.setAlpha(m.armar > 0 ? 0.5 : 0.7 + 0.3 * Math.sin(this.relogio * 12));
      if (m.armar > 0) return true;
      const alvo = this.maisPerto(m.x, m.y, 18);
      if (!alvo) return true;
      j.explodir(m.x, m.y, 26, m.dano * s.dano);
      m.img.destroy();
      return false;
    });

    // laser girando
    if (this.laserGiro) {
      const l = this.laserGiro;
      l.t -= dt;
      l.ang += dt * 4.5;
      l.tick -= dt;
      const fx = jg.maoX + Math.cos(l.ang) * 220;
      const fy = jg.maoY + Math.sin(l.ang) * 220;
      this.gfx.lineStyle(5, 0xff5af0, 0.6).lineBetween(jg.maoX, jg.maoY, fx, fy);
      this.gfx.lineStyle(1.5, 0xffffff, 1).lineBetween(jg.maoX, jg.maoY, fx, fy);
      if (l.tick <= 0) {
        l.tick = 0.08;
        for (const ini of j.listaInimigos()) {
          if (ini.morto) continue;
          const dx = Math.cos(l.ang);
          const dy = Math.sin(l.ang);
          const t = (ini.x - jg.maoX) * dx + (ini.y - jg.maoY) * dy;
          if (t < 0) continue;
          if (Phaser.Math.Distance.Between(jg.maoX + dx * t, jg.maoY + dy * t, ini.x, ini.y) < 10) j.ferirInimigo(ini, l.dano * s.dano * 0.4, null, 'raio', 0, true);
        }
      }
      if (l.t <= 0) this.laserGiro = null;
    }

    // Santuário: cortes riscando a sala inteira
    if (this.cortes) {
      const c = this.cortes;
      c.t -= dt;
      c.tick -= dt;
      if (c.tick <= 0) {
        c.tick = 0.07;
        const x = 16 + Math.random() * (MUNDO_L - 32);
        const y = OY + 16 + Math.random() * (MUNDO_A - OY - 32);
        const a = Math.random() * Math.PI;
        const g = this.cena.add.graphics().setDepth(5200);
        g.lineStyle(2, 0xffffff, 1).lineBetween(x - Math.cos(a) * 40, y - Math.sin(a) * 40, x + Math.cos(a) * 40, y + Math.sin(a) * 40);
        g.lineStyle(4, 0xe2452b, 0.5).lineBetween(x - Math.cos(a) * 40, y - Math.sin(a) * 40, x + Math.cos(a) * 40, y + Math.sin(a) * 40);
        this.cena.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
        for (const ini of j.listaInimigos()) {
          if (!ini.morto && Phaser.Math.Distance.Between(ini.x, ini.y, x, y) < 40) j.ferirInimigo(ini, c.dano * s.dano, null, undefined, 0);
        }
        if (Math.random() < 0.3) Som.tocar('serra');
      }
      if (c.t <= 0) this.cortes = null;
    }

    // Infinito: balas inimigas perto de você ficam quase paradas
    if (this.tem('infinito')) {
      for (const obj of j.projeteis.getChildren()) {
        const p = obj as Sprite;
        if (p.getData('infinito') || Phaser.Math.Distance.Between(p.x, p.y, jg.maoX, jg.maoY) > 30) continue;
        p.setData('infinito', true);
        p.body!.velocity.scale(0.2);
        p.setTint(0x7fd7ff);
      }
      this.gfx.lineStyle(1, 0x7fd7ff, 0.25).strokeCircle(jg.maoX, jg.maoY, 30);
    }

    // aura que queima quem chega perto
    if (this.tem('aura')) {
      this.auraT -= dt;
      this.gfx.lineStyle(1, 0xff7a2e, 0.35 + 0.15 * Math.sin(this.relogio * 6)).strokeCircle(jg.maoX, jg.maoY, 34);
      if (this.auraT <= 0) {
        this.auraT = 0.5;
        for (const ini of j.listaInimigos()) {
          if (!ini.morto && Phaser.Math.Distance.Between(ini.x, ini.y, jg.x, jg.y) < 34) j.ferirInimigo(ini, 0.8 * s.dano, null, 'queima', 0, true);
        }
      }
    }
  }

  /** Luzes dos efeitos (para a camada de escuridão). */
  luzes(): [number, number, number, number][] {
    const l: [number, number, number, number][] = [];
    for (const n of this.nuvens) l.push([n.x, n.y, n.r * 1.4, n.tipo === 'veneno' ? 0x7fff4f : n.tipo === 'gelo' ? 0x7fd7ff : 0xff7a2e]);
    for (const m of this.laminas) l.push([m.img.x, m.img.y, 12, 0xcfd8dc]);
    for (const m of this.minas) l.push([m.x, m.y, 10, 0xff4a2e]);
    this.luzesBichos(l);
    return l;
  }

  /** Troca de sala: some tudo que é temporário (os cães permanentes vêm junto). */
  limparSala() {
    const jg = this.j.jogador;
    for (const n of this.nuvens) n.g.destroy();
    for (const m of this.minas) m.img.destroy();
    this.nuvens = [];
    this.minas = [];
    this.cortes = null;
    this.laserGiro = null;
    for (const c of this.caes) {
      c.spr.setPosition(jg.x - 14, jg.y + 4);
      c.sombra.setPosition(jg.x - 14, jg.y + 10);
    }
  }

  // ===================== os efeitos =====================

  /** Executa um efeito num ponto (a posição do monstro, da vela...). */
  executar([tipo, p = {}]: Efeito, ctx: Contexto) {
    // equilíbrio: vindo de itens, o escudo volta no máximo a cada 6s e a cura a cada 0,8s
    if (ctx.gatilho && (tipo === 'escudo' || tipo === 'curar' || tipo === 'invulneravel')) {
      const agora = this.cena.time.now;
      const espera = tipo === 'escudo' ? 6000 : tipo === 'invulneravel' ? 2500 : 800;
      if (agora < (this.limite.get(tipo) ?? 0)) return;
      this.limite.set(tipo, agora + espera);
    }
    const j = this.j;
    const jg = j.jogador;
    const s = this.s;
    const n = (k: string, padrao: number) => (typeof p[k] === 'number' ? (p[k] as number) : padrao);
    const onde = (): [number, number] => {
      if (p.onde === 'jogador') return [jg.x, jg.y];
      if (p.onde === 'mira') return this.mira();
      if (p.onde === 'inimigo') {
        const vivos = j.listaInimigos().filter((i) => !i.morto);
        const alvo = vivos[Math.floor(Math.random() * vivos.length)];
        if (alvo) return [alvo.x, alvo.y];
      }
      return [ctx.x, ctx.y];
    };
    switch (tipo) {
      case 'explosao': {
        const [x, y] = onde();
        j.explodir(x, y, n('raio', 26), n('dano', 5) * s.dano);
        break;
      }
      case 'anel': {
        const [x, y] = onde();
        const qtd = n('n', 8);
        const cor = COR(p.cor, 0xffe066);
        const tex = typeof p.tex === 'string' ? p.tex : 'bala';
        const def = { ...acharArma('pistola'), bala: tex };
        for (let k = 0; k < qtd; k++) {
          const b = j.criarBala(x, y, (k / qtd) * Math.PI * 2 + Math.random() * 0.2, n('vel', 220), 0.6, def, { perfura: n('perfura', 0) }, n('dano', 1.2) * s.dano);
          b.setTint(cor).setData('cor', cor);
        }
        break;
      }
      case 'leque': {
        // um leque de balas para onde você mira (com fogo, gelo ou veneno, se pedir)
        const qtd = n('n', 12);
        const abre = Phaser.Math.DegToRad(n('abertura', 60));
        const ang0 = jg.mira.angle();
        const cor = COR(p.cor, 0xffb43a);
        const mods: Mods = { queima: !!p.queima, congela: n('congela', 0), veneno: !!p.veneno, perfura: n('perfura', 0) };
        const def = { ...acharArma('pistola'), bala: typeof p.tex === 'string' ? p.tex : 'bala_grande' };
        for (let k = 0; k < qtd; k++) {
          const b = j.criarBala(jg.maoX, jg.maoY, ang0 + abre * (qtd > 1 ? k / (qtd - 1) - 0.5 : 0), n('vel', 240), 0.9, def, mods, n('dano', 2) * s.dano);
          b.setTint(cor).setData('cor', cor);
        }
        break;
      }
      case 'teleguiadas':
      case 'quicantes': {
        const [x, y] = onde();
        const qtd = n('n', 3);
        const cor = COR(p.cor, tipo === 'teleguiadas' ? 0xff5a8a : 0xb0b0c8);
        const mods: Mods = tipo === 'teleguiadas' ? { teleguiado: 3 } : { ricochete: 4 };
        for (let k = 0; k < qtd; k++) {
          const b = j.criarBala(x, y - 4, Math.random() * Math.PI * 2, 200, 1.4, acharArma('pistola'), mods, n('dano', 1.5) * s.dano);
          b.setTint(cor).setData('cor', cor);
        }
        break;
      }
      case 'raios': {
        const [x, y] = onde();
        j.raio(x, y, n('dano', 2) * s.dano, n('saltos', 3), new Set());
        break;
      }
      case 'raioCeu': {
        // raios caem do céu em monstros aleatórios
        const vivos = j.listaInimigos().filter((i) => !i.morto);
        for (let k = 0; k < n('n', 3) && vivos.length; k++) {
          const ini = vivos[Math.floor(Math.random() * vivos.length)];
          this.linha(ini.x, OY, ini.x, ini.y, 0xffe066, 3);
          j.ferirInimigo(ini, n('dano', 4) * s.dano, null, 'raio');
        }
        Som.tocar('tesla');
        j.piscar(255, 240, 160, 60);
        break;
      }
      case 'congelar':
      case 'queimar':
      case 'envenenar': {
        const [x, y] = onde();
        const r = n('raio', 999);
        const st = tipo === 'congelar' ? 'congelado' : tipo === 'queimar' ? 'queima' : 'veneno';
        for (const ini of j.listaInimigos()) if (!ini.morto && Phaser.Math.Distance.Between(ini.x, ini.y, x, y) < r) ini.aplicarStatus(st, n('seg', 2));
        if (r < 999) j.anelLuz(x, y, tipo === 'congelar' ? 0x8fe3ff : tipo === 'queimar' ? 0xff7a2e : 0x9cff6b, r / 3);
        else j.piscar(...(tipo === 'congelar' ? [140, 220, 255] : tipo === 'queimar' ? [255, 140, 60] : [140, 255, 100]) as [number, number, number], 120);
        break;
      }
      case 'nuvem': {
        const [x, y] = onde();
        this.nuvem(x, y, n('raio', 22), n('seg', 3), n('dps', 2), String(p.tipo ?? 'fogo'));
        break;
      }
      case 'empurrar': {
        const [x, y] = onde();
        const r = n('raio', 60);
        for (const ini of j.listaInimigos()) {
          if (ini.morto || Phaser.Math.Distance.Between(ini.x, ini.y, x, y) > r) continue;
          j.ferirInimigo(ini, n('dano', 0.5) * s.dano, new Phaser.Math.Vector2(ini.x - x, ini.y - y).normalize(), undefined, n('forca', 240));
        }
        for (const obj of j.projeteis.getChildren().slice()) {
          const pr = obj as Sprite;
          if (Phaser.Math.Distance.Between(pr.x, pr.y, x, y) < r) j.estourarProjetil(pr);
        }
        j.anelLuz(x, y, 0xc8f0e0, r / 3);
        break;
      }
      case 'curar': {
        const q = n('qtd', 4);
        Estado.run!.chama = Math.min(s.chamaMax, Estado.run!.chama + q);
        popup(jg.x, jg.y - 20, `+${Math.round(q)}`, '#ffb43a', 8);
        break;
      }
      case 'chamaMax':
        Estado.run!.stats.chamaMax += n('qtd', 5);
        Estado.run!.chama += n('qtd', 5);
        break;
      case 'cera': {
        const [x, y] = onde();
        j.soltarCera(x, y, n('n', 2));
        break;
      }
      case 'escudo':
        if (!j.escudoAtivo) {
          j.escudoAtivo = true;
          popup(jg.x, jg.y - 20, 'ESCUDO', '#a0784a', 8);
        }
        break;
      case 'invulneravel':
        jg.invencivel = Math.max(jg.invencivel, n('seg', 1));
        break;
      case 'lento':
        j.camaraLenta(n('escala', 0.4), n('ms', 700));
        break;
      case 'buff': {
        const stat = (p.stat ?? 'dano') as Buff['stat'];
        this.buffs.push({ stat, mult: n('mult', 1.5), t: n('seg', 5) });
        break;
      }
      case 'criticos':
        this.criticos += n('n', 3);
        popup(jg.x, jg.y - 20, 'CRÍTICO!', '#ffd23f', 8);
        break;
      case 'eco': {
        const run = Estado.run!;
        const a = run.armas[run.armaAtual];
        j.disparar(acharArma(a.id), modsDoTiro(run.itens, a.id));
        break;
      }
      case 'laminas':
        for (let k = 0; k < n('n', 2); k++) {
          const img = this.cena.add.image(jg.x, jg.y, 'serra').setDepth(4600).setScale(0.9).setTint(COR(p.cor, 0xcfd8dc));
          this.laminas.push({ img, t: n('seg', 4), dano: n('dano', 1.2), fase: (k / n('n', 2)) * Math.PI * 2 + Math.random() });
        }
        break;
      case 'caes':
        for (let k = 0; k < n('n', 2); k++) this.criarCao(n('seg', 8), COR(p.cor, k % 2 ? 0x1b1325 : 0xf4ead6));
        break;
      case 'clone':
        for (const lado of [-1, 1]) {
          const spr = this.cena.add.image(jg.x + lado * 16, jg.y, jg.texture.key, jg.frame.name).setTintFill(0xb06bff).setAlpha(0.55).setDepth(10);
          this.clones.push({ spr, t: n('seg', 6), lado });
        }
        break;
      case 'meteoro': {
        const vivos = j.listaInimigos().filter((i) => !i.morto);
        for (let k = 0; k < n('n', 3); k++) {
          const alvo = vivos[k % Math.max(1, vivos.length)];
          const x = alvo ? alvo.x : 40 + Math.random() * (MUNDO_L - 80);
          const y = alvo ? alvo.y : OY + 30 + Math.random() * 140;
          j.marcaAlvo(x, y, n('raio', 24), 600);
          this.cena.time.delayedCall(600 + k * 80, () => j.explodir(x, y, n('raio', 24), n('dano', 8) * s.dano));
        }
        break;
      }
      case 'laserGiro':
        this.laserGiro = { t: n('seg', 3), dano: n('dano', 6), ang: jg.mira.angle(), tick: 0 };
        Som.tocar('laser');
        break;
      case 'buracoNegro': {
        const [x, y] = p.onde === 'jogador' ? [jg.x, jg.y] : this.mira();
        const b = j.criarBala(x, y, 0, 0, n('seg', 3), acharArma('vazio'), { atrator: true, explosao: n('raio', 40), perfura: 99 }, n('dano', 6) * s.dano);
        b.setScale(2);
        break;
      }
      case 'minas':
        for (let k = 0; k < n('n', 3); k++) {
          const a = (k / n('n', 3)) * Math.PI * 2;
          const x = Phaser.Math.Clamp(jg.x + Math.cos(a) * 24, 20, MUNDO_L - 20);
          const y = Phaser.Math.Clamp(jg.y + Math.sin(a) * 18, OY + 20, MUNDO_A - 20);
          const img = this.cena.add.image(x, y, 'granada').setDepth(9).setTint(0xffb43a);
          this.minas.push({ x, y, dano: n('dano', 8), armar: 0.6, img });
        }
        break;
      case 'apagarBalas': {
        const converter = !!p.converter;
        for (const obj of j.projeteis.getChildren().slice()) {
          const pr = obj as Sprite;
          if (converter) {
            const alvo = this.maisPerto(pr.x, pr.y, 999);
            const ang = alvo ? Math.atan2(alvo.y - pr.y, alvo.x - pr.x) : Math.random() * Math.PI * 2;
            const b = j.criarBala(pr.x, pr.y, ang, 260, 1, acharArma('pistola'), { teleguiado: 1 }, 1.5 * s.dano);
            b.setTint(0xffe066);
          }
          j.estourarProjetil(pr);
        }
        j.piscar(255, 255, 255, 80);
        break;
      }
      case 'teleporte': {
        let x = jg.x;
        let y = jg.y;
        if (p.para === 'inimigo') {
          const alvo = this.maisLonge(jg.x, jg.y);
          if (alvo) [x, y] = [alvo.x, alvo.y];
          if (alvo) alvo.setPosition(jg.x, jg.y);
        } else if (p.para === 'aleatorio') ({ x, y } = j.posicaoLivre(jg.x, jg.y, 80));
        else [x, y] = this.livre(...this.mira());
        j.faiscas(jg.x, jg.y, 0xb06bff, 12);
        jg.setPosition(x, y);
        jg.invencivel = Math.max(jg.invencivel, 0.4);
        j.posicionarFamiliares();
        break;
      }
      case 'sangria': {
        const alvo = this.maisPerto(ctx.x, ctx.y, 140);
        if (alvo) {
          this.linha(jg.maoX, jg.maoY, alvo.x, alvo.y, 0xc0303a, 2);
          j.ferirInimigo(alvo, n('dano', 3) * s.dano, null, 'raio');
          this.executar(['curar', { qtd: n('cura', 2) }], ctx);
        }
        break;
      }
      case 'matarFracos':
        for (const ini of j.listaInimigos()) if (!ini.morto && !ini.ehChefe && ini.vida < ini.vidaMax * n('fracao', 0.3)) j.matarInimigo(ini);
        break;
      case 'danoTodos':
        for (const ini of j.listaInimigos()) if (!ini.morto) j.ferirInimigo(ini, n('dano', 5) * s.dano, null, 'raio');
        j.piscar(255, 255, 255, 60);
        break;
      case 'cortes':
        this.cortes = { t: n('seg', 3), dano: n('dano', 2.5), tick: 0 };
        j.piscar(200, 30, 30, 200);
        Som.tocar('chefeRugido');
        break;
      case 'paralisar':
        for (const ini of j.listaInimigos()) {
          if (ini.morto) continue;
          ini.atordoado = ini.ehChefe ? Math.min(1, n('seg', 3) * 0.3) : n('seg', 3);
          ini.setVelocity(0, 0);
        }
        j.tremer(300, 0.01);
        break;
      case 'terremoto':
        j.tremer(700, 0.02);
        for (const ini of j.listaInimigos()) {
          if (ini.morto) continue;
          j.ferirInimigo(ini, n('dano', 8) * s.dano, null, 'explosao');
          ini.atordoado = ini.ehChefe ? 0.4 : 1.2;
        }
        for (const obj of j.projeteis.getChildren().slice()) j.estourarProjetil(obj as Sprite);
        j.explosaoNasParedes(jg.x, jg.y, 400);
        Som.tocar('explosao');
        break;
      case 'dashLongo':
        jg.dashT = 0.4;
        jg.dashDir.copy(jg.mira).normalize();
        jg.invencivel = Math.max(jg.invencivel, 0.6);
        Som.tocar('dash');
        break;
      case 'projetilGigante': {
        const ang = jg.mira.angle();
        const b = j.criarBala(jg.maoX, jg.maoY, ang, n('vel', 180), 2.5, acharArma('vazio'), { perfura: 99, espectral: true }, n('dano', 30) * s.dano);
        b.setScale(n('tam', 4)).setTint(COR(p.cor, 0xb06bff)).setData('cor', COR(p.cor, 0xb06bff));
        Som.tocar('vazio');
        j.tremer(200, 0.01);
        break;
      }
      case 'trocarArma': {
        const run = Estado.run!;
        const opcoes = D.armas.filter((a) => a.raridade > 0 && !run.armas.some((w) => w.id === a.id));
        const nova = opcoes[Math.floor(Math.random() * opcoes.length)];
        if (nova) {
          run.armas[run.armaAtual] = { id: nova.id, pente: nova.pente, reserva: nova.municao < 0 ? -1 : nova.municao };
          avisar(nova.nome.toUpperCase(), '#ffd23f');
        }
        break;
      }
      case 'rolarItens':
        j.rolarDado();
        break;
      case 'revelarMapa':
        for (const no of Estado.masmorra!.salas.values()) no.conhecida = true;
        avisar('MAPA REVELADO', '#9fd0ff');
        break;
      case 'municao':
        j.encherMunicao(99);
        avisar('MUNIÇÃO CHEIA', '#a3d977');
        break;
      case 'bau': {
        const pos = j.posicaoLivre(jg.x, jg.y, 30);
        j.criarBauEm(pos.x, pos.y);
        break;
      }
      case 'itemSurpresa': {
        const pos = j.posicaoLivre(jg.x, jg.y, 30);
        j.itemSurpresa(pos.x, pos.y);
        break;
      }
      case 'aleatorio': {
        // Teclado do Criador: um efeito surpresa
        const surpresas: Efeito[] = [
          ['explosao', { onde: 'inimigo', raio: 34, dano: 10 }], ['raios', { saltos: 5, dano: 4 }], ['laminas', { n: 3, seg: 4, dano: 2 }],
          ['meteoro', { n: 3, dano: 8 }], ['anel', { n: 14, dano: 2 }], ['teleguiadas', { n: 6, dano: 2 }], ['congelar', { seg: 1.5 }],
          ['nuvem', { onde: 'inimigo', raio: 30, seg: 4, dps: 3, tipo: 'fogo' }], ['criticos', { n: 5 }], ['curar', { qtd: 6 }],
        ];
        this.executar(surpresas[Math.floor(Math.random() * surpresas.length)], ctx);
        popup(jg.x, jg.y - 26, '[TECLA!]', '#7fdc8a', 8);
        break;
      }
      case 'custo':
        Estado.run!.chama = Math.max(1, Estado.run!.chama - n('chama', 10));
        popup(jg.x, jg.y - 30, `-${n('chama', 10)}`, '#e2452b', 8);
        break;
    }
  }

  // ===================== ajudas =====================

  private nuvem(x: number, y: number, r: number, seg: number, dps: number, tipo: string) {
    if (this.nuvens.length > 30) return;
    const cor = tipo === 'veneno' ? 0x7fff4f : tipo === 'gelo' ? 0x8fe3ff : 0xff7a2e;
    const g = this.cena.add.ellipse(x, y, r * 2, r * 1.3, cor, 0.28).setStrokeStyle(1, cor, 0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.nuvens.push({ x, y, r, t: seg, dps, tipo, g, tick: 0 });
  }

  /** Cada bichinho age do seu jeito. */
  private atualizarBicho(c: Cao, i: number, dt: number) {
    const j = this.j;
    const jg = j.jogador;
    const s = this.s;
    // no desafio Pacifista, eles são a sua arma
    const forca = Estado.run?.desafio === 'pacifista' ? 3 : 1;
    const voa = c.tipo !== 'mordida';
    const mover = (tx: number, ty: number, velMax: number, ganho = 6) => {
      const d = Phaser.Math.Distance.Between(c.spr.x, c.spr.y, tx, ty) || 1;
      const vel = Math.min(d * ganho, velMax);
      if (d > 0.5) {
        c.spr.x += ((tx - c.spr.x) / d) * vel * dt;
        c.spr.y += ((ty - c.spr.y) / d) * vel * dt;
      }
      return d;
    };
    const somMordida = () => {
      const tex = c.spr.texture.key;
      if (tex === 'arma_tete') Som.tocar(Math.random() < 0.15 ? 'latido' : 'latidoMordida');
      else if ((tex === 'arma_nix' || tex === 'arma_yuumi') && Math.random() < 0.3) Som.tocar('miau');
    };
    let alvoVisto: Inimigo | null = null;

    switch (c.tipo) {
      case 'mordida': {
        // rodeiam o monstro mais perto pela BORDA dele, cada um num lado, e dão botes;
        // ficam desenhados por cima do monstro para nunca sumirem dentro de um chefe grande
        c.bote = Math.max(0, c.bote - dt * 3);
        const alvo = this.maisPerto(c.spr.x, c.spr.y, 220);
        alvoVisto = alvo;
        let tx: number;
        let ty: number;
        if (alvo) {
          const raio = alvo.displayWidth * 0.42 + 10 - c.bote * 8;
          const ang = this.relogio * 0.9 + c.fase * 0.15 + (i * Math.PI * 2) / Math.max(1, this.caes.length);
          tx = alvo.x + Math.cos(ang) * raio;
          ty = alvo.y - alvo.displayHeight * 0.25 + Math.sin(ang) * raio * 0.75;
        } else {
          // sem monstro: seguem a vela, um ao lado do outro
          tx = jg.x - 16 - i * 12;
          ty = jg.y + 6;
        }
        const d = mover(tx, ty, alvo ? 190 : 130);
        c.spr.setFlipX((alvo ? alvo.x : jg.x) < c.spr.x);
        c.spr.setScale(c.spr.getData('escala') * (1 + Math.abs(Math.sin(this.relogio * 12 + i)) * 0.06));
        if (alvo && d < 14 && c.cd <= 0) {
          c.cd = 0.5;
          c.bote = 1;
          j.ferirInimigo(alvo, 2.2 * s.dano * forca, new Phaser.Math.Vector2(alvo.x - c.spr.x, alvo.y - c.spr.y).normalize(), undefined, alvo.ehChefe ? 0 : 90);
          j.faiscas(c.spr.x, c.spr.y, 0xffffff, 3);
          somMordida();
        }
        break;
      }
      case 'voo': {
        // morcego: ziguezagueia em volta do monstro, mordendo rápido
        c.fase += dt * 7;
        const alvo = this.maisPerto(c.spr.x, c.spr.y, 200);
        alvoVisto = alvo;
        const [cx, cy] = alvo ? [alvo.x, alvo.y - 4] : [jg.x, jg.y - 20];
        const r = alvo ? 9 + Math.sin(c.fase * 0.5) * 4 : 14;
        mover(cx + Math.cos(c.fase) * r, cy + Math.sin(c.fase * 2) * r * 0.5, 260, 10);
        c.spr.setScale(1, 0.7 + Math.abs(Math.sin(c.fase * 2)) * 0.3); // bate as asas
        c.spr.setFlipX(Math.cos(c.fase) < 0);
        if (alvo && c.cd <= 0 && Phaser.Math.Distance.Between(c.spr.x, c.spr.y, alvo.x, alvo.y) < 14) {
          c.cd = 0.35;
          j.ferirInimigo(alvo, 1.3 * s.dano * forca, null, undefined, 0, true);
          j.faiscas(c.spr.x, c.spr.y, 0x8d5fb5, 2);
        }
        break;
      }
      case 'orbita': {
        // mariposa: gira em volta da chama e come as balas que encostar
        c.fase += dt * 3.2;
        mover(jg.x + Math.cos(c.fase) * 20, jg.y - 6 + Math.sin(c.fase) * 14, 400, 14);
        c.spr.setScale(1, 0.75 + Math.abs(Math.sin(this.relogio * 18)) * 0.25);
        for (const o of j.projeteis.getChildren().slice()) {
          const pr = o as Sprite;
          if (!pr.active) continue;
          if (Math.abs(pr.x - c.spr.x) < 7 && Math.abs(pr.y - c.spr.y) < 7) {
            j.estourarProjetil(pr);
            j.faiscas(c.spr.x, c.spr.y, 0xffe066, 4);
          }
        }
        const perto = this.maisPerto(c.spr.x, c.spr.y, 10);
        if (perto && c.cd <= 0) {
          c.cd = 0.4;
          j.ferirInimigo(perto, 0.6 * s.dano * forca, null, 'queima', 0, true);
        }
        break;
      }
      case 'atirador': {
        // fantasminha: flutua atrás de você e atira
        const atras = jg.flipX ? 16 : -16;
        mover(jg.x + atras, jg.y - 14 + Math.sin(this.relogio * 2 + i) * 3, 200, 4);
        c.spr.setAlpha(0.75 + Math.sin(this.relogio * 3) * 0.15).setFlipX(jg.flipX);
        if (c.cd <= 0) {
          const alvo = this.maisPerto(c.spr.x, c.spr.y, 150);
          if (alvo) {
            c.cd = 1;
            const ang = Math.atan2(alvo.y - c.spr.y, alvo.x - c.spr.x);
            j.criarBala(c.spr.x, c.spr.y, ang, 220, 0.8, acharArma('pistola'), {}, 1.2 * s.dano * forca).setTint(0xbfe8ff);
            Som.tocar('pistola');
          }
        }
        break;
      }
      case 'luz': {
        // vagalume: voa perto da cabeça, ilumina e dá choquinhos
        mover(jg.x + Math.cos(this.relogio * 1.3 + i) * 12, jg.y - 22 + Math.sin(this.relogio * 2.1) * 5, 200, 5);
        c.spr.setFlipX(Math.cos(this.relogio * 1.3 + i) < 0);
        if (c.cd <= 0) {
          const alvo = this.maisPerto(c.spr.x, c.spr.y, 80);
          if (alvo) {
            c.cd = 1.6;
            this.linha(c.spr.x, c.spr.y, alvo.x, alvo.y, 0xd8ff6b, 1);
            j.ferirInimigo(alvo, 1.2 * s.dano * forca, null, 'raio', 0);
          }
        }
        break;
      }
      case 'rasante': {
        // coruja: fica no ombro e mergulha nos monstros
        if (c.bote > 0) {
          c.bote -= dt;
          const d = mover(c.vx, c.vy, 320, 20);
          if (d < 8) {
            const alvo = this.maisPerto(c.spr.x, c.spr.y, 16);
            if (alvo) {
              j.ferirInimigo(alvo, 3 * s.dano * forca, new Phaser.Math.Vector2(alvo.x - c.spr.x, alvo.y - c.spr.y).normalize(), undefined, 80);
              j.faiscas(c.spr.x, c.spr.y, 0xe8c890, 5);
            }
            c.bote = 0;
          }
        } else {
          mover(jg.x + (jg.flipX ? -9 : 9), jg.y - 18, 220, 6);
          c.spr.setFlipX(jg.flipX);
          if (c.cd <= 0) {
            const alvo = this.maisPerto(c.spr.x, c.spr.y, 160);
            if (alvo) {
              c.cd = 2.2;
              c.vx = alvo.x;
              c.vy = alvo.y;
              c.bote = 0.8;
              c.spr.setFlipX(alvo.x < c.spr.x);
            }
          }
        }
        break;
      }
    }

    // profundidade: por cima do monstro que estão atacando; os que voam ficam acima de tudo
    const base = alvoVisto ? Math.max(10 + c.spr.y, alvoVisto.depth + 2) : 10 + c.spr.y;
    c.spr.setDepth(c.tipo === 'luz' ? 5060 : voa ? 10 + c.spr.y + 30 : base);
    const alturaVoo = voa ? 12 : c.spr.displayHeight * 0.45;
    c.sombra.setPosition(c.spr.x, c.spr.y + alturaVoo).setDepth(9).setAlpha(voa ? 0.18 : 0.35).setScale(voa ? 0.6 : 1, 1);
  }

  /** O Criador desiste: TETE, NIX e YUUMI vêm lutar do seu lado (no Pacifista, ficam para sempre). */
  bichinhos(permanentes = false) {
    for (const tex of ['arma_tete', 'arma_nix', 'arma_yuumi']) {
      if (permanentes && this.caes.some((c) => c.chave === `bichinho_${tex}`)) continue;
      this.criarCao(permanentes ? 0 : 60, 0xf4ead6, tex, 'mordida', permanentes ? `bichinho_${tex}` : undefined);
    }
  }

  private criarCao(seg: number, cor: number, textura = 'arma_tete', tipo: TipoBicho = 'mordida', chave?: string) {
    const jg = this.j.jogador;
    // os bichinhos de verdade (TETE, NIX, YUUMI) ficam maiores que os cães comuns
    const escala = textura === 'arma_tete' && cor !== 0xf4ead6 ? 0.75 : textura === 'arma_tete' ? 0.9 : 1;
    const spr = this.cena.add.sprite(jg.x - 14, jg.y + 4, textura).setScale(escala).setDepth(10).setData('escala', escala);
    if (cor !== 0xf4ead6) spr.setTint(cor);
    const sombra = this.cena.add.ellipse(spr.x, spr.y, 12, 4, 0x000000, 0.35).setDepth(9);
    this.caes.push({ spr, sombra, t: seg, permanente: seg <= 0, vx: 0, vy: 0, cd: 0, fase: Math.random() * Math.PI * 2, bote: 0, tipo, chave });
  }

  /** O vagalume é uma luz que anda junto. */
  private luzesBichos(l: [number, number, number, number][]) {
    for (const c of this.caes) if (c.tipo === 'luz') l.push([c.spr.x, c.spr.y, 46 + Math.sin(this.relogio * 6) * 4, 0xd8ff6b]);
  }

  private linha(x0: number, y0: number, x1: number, y1: number, cor: number, w = 2) {
    const g = this.cena.add.graphics().setDepth(5200).setBlendMode(Phaser.BlendModes.ADD);
    g.lineStyle(w, cor, 1).lineBetween(x0, y0, x1, y1);
    this.cena.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  private maisPerto(x: number, y: number, max: number) {
    let melhor: Inimigo | null = null;
    let dm = max;
    for (const ini of this.j.listaInimigos()) {
      if (ini.morto || ini.fase === 'surgindo') continue;
      const d = Phaser.Math.Distance.Between(x, y, ini.x, ini.y);
      if (d < dm) {
        dm = d;
        melhor = ini;
      }
    }
    return melhor;
  }

  private maisLonge(x: number, y: number) {
    let melhor: Inimigo | null = null;
    let dm = -1;
    for (const ini of this.j.listaInimigos()) {
      if (ini.morto || ini.ehChefe) continue;
      const d = Phaser.Math.Distance.Between(x, y, ini.x, ini.y);
      if (d > dm) {
        dm = d;
        melhor = ini;
      }
    }
    return melhor;
  }

  private mira(): [number, number] {
    const jg = this.j.jogador;
    if (Estado.usandoMouse) {
      const ptr = this.cena.input.activePointer;
      ptr.updateWorldPoint(this.cena.cameras.main);
      return [ptr.worldX, ptr.worldY];
    }
    return [jg.x + jg.mira.x * 80, jg.y + jg.mira.y * 80];
  }

  /** Volta do ponto até a vela até achar chão livre. */
  private livre(tx: number, ty: number): [number, number] {
    const jg = this.j.jogador;
    const g = this.j.grade;
    for (let k = 0; k <= 20; k++) {
      const x = Phaser.Math.Linear(tx, jg.x, k / 20);
      const y = Phaser.Math.Linear(ty, jg.y, k / 20);
      const c = Math.floor(x / TILE);
      const r = Math.floor((y - OY) / TILE);
      if (r >= 1 && r <= ROWS - 2 && c >= 1 && c <= COLS - 2 && '.^'.includes(g[r][c])) return [x, y];
    }
    return [jg.x, jg.y];
  }
}

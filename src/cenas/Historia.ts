import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { Estado, salvarMeta } from '../estado';
import { Som } from '../som';

// História em quadrinhos do começo do jogo, no estilo das cutscenes do Undertale:
// um quadro desenhado e animado em cima, o texto sendo "digitado" embaixo.
// O texto vem de public/dados/historia.json; os desenhos são as funções "cena*" abaixo.

type C = Phaser.GameObjects.Container;
type Atualizar = (t: number) => void;

const ARTE_L = 120; // o quadro é desenhado em 120x66 "pixels de arte"...
const ARTE_A = 66;
const ESCALA = 4; // ...e ampliado 4x na tela
const VEL_TEXTO = 32; // ms por letra

export class Historia extends Phaser.Scene {
  private quadros: { cena: string; texto: string }[] = [];
  private indice = -1;
  private quadro!: C;
  private texto!: Phaser.GameObjects.Text;
  private seta!: Phaser.GameObjects.Text;
  private alvo = '';
  private letras = 0;
  private acumulado = 0;
  private atualizar: Atualizar | null = null;
  private tQuadro = 0;
  private depois: 'Jogo' | 'Menu' | 'Fim' = 'Jogo';
  private conjunto: 'quadros' | 'final' | 'final2' | 'final3' = 'quadros';
  private dadosFim: object | undefined;
  private saindo = false;

  constructor() {
    super('Historia');
  }

  /** conjunto "final" = os quadrinhos depois de vencer o Apagador (e então a tela de vitória). */
  init(dados: { depois?: 'Jogo' | 'Menu' | 'Fim'; conjunto?: 'quadros' | 'final' | 'final2' | 'final3'; dadosFim?: object }) {
    this.depois = dados?.depois ?? 'Jogo';
    this.conjunto = dados?.conjunto ?? 'quadros';
    this.dadosFim = dados?.dadosFim;
  }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.quadros = (this.cache.json.get('historia')?.[this.conjunto] ?? []) as { cena: string; texto: string }[];
    this.indice = -1;
    this.saindo = false;
    Som.musica('historia');

    // máscara: o desenho não vaza para fora do quadro
    const x0 = TELA_L / 2 - (ARTE_L * ESCALA) / 2;
    const y0 = 48;
    const mascara = this.make.graphics({}, false).fillRect(x0, y0, ARTE_L * ESCALA, ARTE_A * ESCALA);
    this.quadro = this.add.container(x0, y0).setScale(ESCALA);
    this.quadro.setMask(mascara.createGeometryMask());

    this.texto = this.add
      .text(TELA_L / 2 - 300, y0 + ARTE_A * ESCALA + 36, '', {
        fontFamily: FONTE, fontSize: '16px', color: '#ffffff', lineSpacing: 14, wordWrap: { width: 600 },
      })
      .setOrigin(0, 0);
    this.seta = this.add.text(TELA_L / 2 + 300, TELA_A - 40, '>', { fontFamily: FONTE, fontSize: '16px', color: '#ffffff' }).setOrigin(1, 1);
    this.tweens.add({ targets: this.seta, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    this.add
      .text(TELA_L - 12, TELA_A - 10, 'ENTER avança · ESC pula', { fontFamily: FONTE, fontSize: '8px', color: '#555555' })
      .setOrigin(1, 1);

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Escape') this.terminar();
      else if (['Enter', 'Space', 'KeyZ', 'KeyJ', 'KeyE'].includes(e.code)) this.avancar();
    });
    this.input.on('pointerdown', () => this.avancar());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
    this.proximo();
  }

  update(_t: number, delta: number) {
    this.tQuadro += delta / 1000;
    this.atualizar?.(this.tQuadro);
    // máquina de escrever
    if (this.letras < this.alvo.length) {
      this.acumulado += delta;
      while (this.acumulado >= VEL_TEXTO && this.letras < this.alvo.length) {
        this.acumulado -= VEL_TEXTO;
        const c = this.alvo[this.letras++];
        if (c === ',' || c === '.' || c === ':') this.acumulado -= VEL_TEXTO * 5; // pausa na pontuação
        if (c !== ' ' && this.letras % 2) Som.tocar('blip');
      }
      this.texto.setText(this.alvo.slice(0, this.letras));
    }
    this.seta.setVisible(this.letras >= this.alvo.length);
  }

  private avancar() {
    if (this.saindo) return;
    if (this.letras < this.alvo.length) {
      this.letras = this.alvo.length; // completa o texto de uma vez
      this.texto.setText(this.alvo);
    } else this.proximo();
  }

  private proximo() {
    this.indice++;
    if (this.indice >= this.quadros.length) {
      this.terminar();
      return;
    }
    const q = this.quadros[this.indice];
    const trocar = () => {
      this.quadro.removeAll(true);
      this.tweens.killAll();
      this.tweens.add({ targets: this.seta, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
      this.time.removeAllEvents();
      this.quadro.setPosition(TELA_L / 2 - (ARTE_L * ESCALA) / 2, 48);
      this.tQuadro = 0;
      this.atualizar = desenhar(this, this.quadro, q.cena);
      this.alvo = q.texto;
      this.letras = 0;
      this.acumulado = -300;
      this.texto.setText('');
      this.quadro.setAlpha(0);
      this.tweens.add({ targets: this.quadro, alpha: 1, duration: 500 });
    };
    if (this.indice === 0) trocar();
    else this.tweens.add({ targets: [this.quadro, this.texto], alpha: 0, duration: 300, onComplete: () => {
      this.texto.setAlpha(1);
      trocar();
    } });
  }

  private terminar() {
    if (this.saindo) return;
    this.saindo = true;
    if (this.conjunto === 'quadros') {
      Estado.meta.viuHistoria = true;
      salvarMeta(Estado.meta);
    }
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(this.depois, this.dadosFim));
  }
}

// =====================================================================
// Desenhos (coordenadas em "pixels de arte" 120x66)
// =====================================================================

function desenhar(scene: Phaser.Scene, c: C, cena: string): Atualizar | null {
  switch (cena) {
    case 'catedral':
      return cenaCatedral(scene, c);
    case 'apagador':
      return cenaApagador(scene, c);
    case 'escondida':
      return cenaEscondida(scene, c);
    case 'roubo':
      return cenaRoubo(scene, c);
    case 'arma':
      return cenaArma(scene, c);
    case 'fim_apagador':
      return fimApagador(scene, c);
    case 'fim_lanterna':
      return fimLanterna(scene, c);
    case 'fim_toque':
      return fimToque(scene, c);
    case 'fim_catedral':
      return fimCatedral(scene, c);
    case 'fim_altar':
      return fimAltar(scene, c);
    case 'fim2_sombra':
      return fim2Sombra(scene, c);
    case 'fim2_medo':
      return fim2Medo(scene, c);
    case 'fim2_abraco':
      return fim2Abraco(scene, c);
    case 'fim2_dupla':
      return fim2Dupla(scene, c);
    case 'fim3_acendedor':
      return fim3Acendedor(scene, c);
    case 'fim3_fosforo':
      return fim3Fosforo(scene, c);
    case 'fim3_entrega':
      return fim3Entrega(scene, c);
    case 'fim3_amanhecer':
      return fim3Amanhecer(scene, c);
    case 'fim3_sol':
      return fim3Sol(scene, c);
  }
  return null;
}

const ret = (s: Phaser.Scene, c: C, x: number, y: number, w: number, h: number, cor: number, a = 1) => {
  const r = s.add.rectangle(x, y, w, h, cor, a).setOrigin(0);
  c.add(r);
  return r;
};

const brilho = (s: Phaser.Scene, c: C, x: number, y: number, r: number, cor: number, a: number) => {
  const b = s.add.circle(x, y, r, cor, a).setBlendMode(Phaser.BlendModes.ADD);
  c.add(b);
  return b;
};

interface Velinha {
  chama: Phaser.GameObjects.GameObject[];
  luz: Phaser.GameObjects.Arc;
  x: number;
  y: number;
}

/** Velinha de fundo: corpo 2x5 e uma chaminha. */
function velinha(s: Phaser.Scene, c: C, x: number, base: number): Velinha {
  ret(s, c, x, base - 5, 2, 5, 0xe8dcc4);
  ret(s, c, x + 1, base - 5, 1, 5, 0xc8b898);
  const luz = brilho(s, c, x + 1, base - 7, 4, 0xff9a2e, 0.18);
  const f1 = ret(s, c, x, base - 7, 2, 2, 0xff9a2e);
  const f2 = ret(s, c, x + 0.5, base - 8, 1, 1, 0xffe066);
  return { chama: [f1, f2], luz, x: x + 1, y: base - 7 };
}

/** Chama grande (a Chama Primeira). */
function chamaGrande(s: Phaser.Scene, c: C, x: number, y: number, tam = 1) {
  const cont = s.add.container(x, y);
  c.add(cont);
  const g1 = s.add.circle(0, -4 * tam, 30 * tam, 0xff7a2e, 0.08).setBlendMode(Phaser.BlendModes.ADD);
  const g2 = s.add.circle(0, -4 * tam, 16 * tam, 0xffb43a, 0.18).setBlendMode(Phaser.BlendModes.ADD);
  cont.add([g1, g2]);
  const camadas: [number, number, number, number, number][] = [
    [-3, -9, 6, 9, 0xff6a1f], [-2, -8, 4, 8, 0xff9a2e], [-1, -6, 2, 6, 0xffe066], [-0.5, -3, 1, 2, 0xffffff],
  ];
  for (const [rx, ry, w, h, cor] of camadas) cont.add(s.add.rectangle(rx * tam, ry * tam, w * tam, h * tam, cor).setOrigin(0));
  s.tweens.add({ targets: cont, scaleY: 1.12, scaleX: 0.92, duration: 140, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  s.tweens.add({ targets: [g1, g2], alpha: '+=0.06', duration: 90, yoyo: true, repeat: -1 });
  return cont;
}

/** Fumacinha subindo de uma vela apagada. */
function fumaca(s: Phaser.Scene, c: C, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const f = ret(s, c, x, y, 1, 1, 0x8a8494, 0.7);
    s.tweens.add({ targets: f, y: y - 8 - i * 3, x: x + (Math.random() - 0.5) * 4, alpha: 0, delay: i * 120, duration: 900, onComplete: () => f.destroy() });
  }
}

/** A silhueta do Apagador: capa e chapéu de apagador de vela, olhos azuis. */
function apagador(s: Phaser.Scene, c: C, x: number, y: number, tam = 1) {
  const cont = s.add.container(x, y).setScale(tam);
  c.add(cont);
  const g = s.add.graphics();
  g.fillStyle(0x05040a, 1).fillTriangle(-16, 0, 16, 0, 0, -32);
  g.fillStyle(0x05040a, 1).fillRect(-11, -30, 22, 3);
  g.fillStyle(0x05040a, 1).fillTriangle(-8, -28, 8, -28, 0, -50);
  g.lineStyle(1, 0x3e5a7e, 0.9).strokeTriangle(-8, -28, 8, -28, 0, -50);
  g.lineStyle(1, 0x23324a, 0.9).strokeTriangle(-16, 0, 16, 0, 0, -32);
  cont.add(g);
  const olho1 = s.add.rectangle(-4, -23, 2, 1, 0x8fe3ff).setOrigin(0);
  const olho2 = s.add.rectangle(2, -23, 2, 1, 0x8fe3ff).setOrigin(0);
  const luz = s.add.circle(0, -23, 6, 0x8fe3ff, 0.25).setBlendMode(Phaser.BlendModes.ADD);
  cont.add([luz, olho1, olho2]);
  s.tweens.add({ targets: luz, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });
  return cont;
}

function fundoCatedral(s: Phaser.Scene, c: C) {
  const faixas = [0x0e0a16, 0x120c1c, 0x160f22, 0x1a1228, 0x1d142c, 0x201630];
  faixas.forEach((cor, i) => ret(s, c, 0, i * 11, ARTE_L, 11, cor));
  // vitral gótico
  const g = s.add.graphics();
  c.add(g);
  g.fillStyle(0x0a0710, 1).fillRect(49, 8, 22, 26).fillTriangle(49, 8, 71, 8, 60, -2);
  const cores = [0x7a2e8f, 0x2e5a8f, 0x8f2e3e, 0x8f7a2e, 0x2e8f6a];
  for (let yy = 10; yy < 32; yy += 4) for (let xx = 51; xx < 69; xx += 4) g.fillStyle(cores[(xx * 7 + yy * 3) % 5], 0.8).fillRect(xx, yy, 3, 3);
  g.fillStyle(0x7a2e8f, 0.8).fillTriangle(52, 8, 68, 8, 60, 1);
  // feixe de luz do vitral
  const feixe = s.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
  feixe.fillStyle(0x9b7ac8, 0.06).fillTriangle(50, 30, 70, 30, 82, 66).fillTriangle(50, 30, 38, 66, 82, 66);
  c.add(feixe);
  // colunas
  for (const x of [8, 28, 86, 106]) {
    ret(s, c, x, 0, 6, 52, 0x2a2036);
    ret(s, c, x, 0, 1, 52, 0x3e3150);
    ret(s, c, x + 5, 0, 1, 52, 0x1a1424);
  }
  // degraus
  ret(s, c, 0, 50, ARTE_L, 5, 0x3a2e44);
  ret(s, c, 0, 55, ARTE_L, 5, 0x32283c);
  ret(s, c, 0, 60, ARTE_L, 6, 0x2a2034);
  ret(s, c, 0, 50, ARTE_L, 1, 0x4a3e56);
  ret(s, c, 0, 55, ARTE_L, 1, 0x42364e);
  // altar
  ret(s, c, 48, 36, 24, 14, 0x4a3a58);
  ret(s, c, 46, 34, 28, 3, 0x6a5a7a);
  ret(s, c, 48, 41, 24, 1, 0x3a2e48);
  ret(s, c, 58, 42, 4, 6, 0x6a5a7a);
  // mil velas nos degraus
  const velas: Velinha[] = [];
  [[50, 2], [55, 4], [60, 1]].forEach(([base, desloc]) => {
    for (let x = desloc; x < ARTE_L - 2; x += 5) {
      if (x > 42 && x < 76 && base === 50) continue;
      velas.push(velinha(s, c, x, base));
    }
  });
  return velas;
}

function tremeluzir(velas: Velinha[]) {
  for (const v of velas) if (v.luz.visible && Math.random() < 0.15) v.luz.setAlpha(0.1 + Math.random() * 0.15);
}

// ---------- 1. A catedral ----------
function cenaCatedral(s: Phaser.Scene, c: C): Atualizar {
  const velas = fundoCatedral(s, c);
  chamaGrande(s, c, 60, 34);
  // a câmera desce devagar do vitral até o altar
  c.y -= 12;
  s.tweens.add({ targets: c, y: c.y + 12, duration: 6000, ease: 'Sine.out' });
  return () => tremeluzir(velas);
}

// ---------- 2. O Apagador chega ----------
function cenaApagador(s: Phaser.Scene, c: C): Atualizar {
  const velas = fundoCatedral(s, c);
  const primeira = chamaGrande(s, c, 60, 34);
  const sombra = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x000000, 0);
  const fig = apagador(s, c, 96, 100, 1.1);
  s.tweens.add({ targets: fig, y: 58, duration: 2200, ease: 'Sine.out', onStart: () => Som.tocar('chefeRugido') });
  s.tweens.add({ targets: fig, x: 94, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  // apaga as velas uma por uma
  const ordem = Phaser.Utils.Array.Shuffle(velas.slice());
  ordem.forEach((v, i) => {
    s.time.delayedCall(2000 + i * 70, () => {
      v.chama.forEach((o) => (o as Phaser.GameObjects.Rectangle).setVisible(false));
      v.luz.setVisible(false);
      fumaca(s, c, v.x, v.y);
      if (i % 6 === 0) Som.tocar('apagar');
    });
  });
  s.tweens.add({ targets: sombra, fillAlpha: 0.55, delay: 2000, duration: ordem.length * 70 });
  s.tweens.add({ targets: primeira, scaleX: 0.7, delay: 2000, duration: 120, yoyo: true, repeat: -1 });
  return () => tremeluzir(velas);
}

// ---------- 3. A velinha escondida ----------
function cenaEscondida(s: Phaser.Scene, c: C): Atualizar {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x07050b);
  ret(s, c, 0, 58, ARTE_L, 8, 0x120c18);
  // o altar, enorme, em primeiro plano
  ret(s, c, 0, 18, 64, 48, 0x2a2036);
  ret(s, c, 0, 14, 68, 5, 0x4a3a58);
  ret(s, c, 63, 18, 1, 48, 0x3e3150);
  ret(s, c, 6, 26, 50, 1, 0x1f1828);
  ret(s, c, 6, 40, 50, 1, 0x1f1828);
  // fumaça das velas apagadas descendo do alto
  s.time.addEvent({ delay: 260, loop: true, callback: () => fumaca(s, c, 70 + Math.random() * 48, 8 + Math.random() * 10) });
  const luz = brilho(s, c, 87, 48, 16, 0xff9a2e, 0.14);
  const vela = s.add.sprite(87, 58, 'player', 0).setOrigin(0.5, 1).play('heroi_vela_parado');
  c.add(vela);
  s.tweens.add({ targets: luz, alpha: 0.06, duration: 220, yoyo: true, repeat: -1 });
  // tremendo de medo, e espiando de vez em quando
  s.time.addEvent({ delay: 2600, loop: true, callback: () => s.tweens.add({ targets: vela, x: 81, duration: 500, yoyo: true, hold: 600, ease: 'Sine.inOut' }) });
  return () => {
    vela.x += (Math.random() - 0.5) * 0.4;
    vela.x = Phaser.Math.Clamp(vela.x, 80, 88);
  };
}

// ---------- 4. O roubo da Chama Primeira ----------
function cenaRoubo(s: Phaser.Scene, c: C): Atualizar | null {
  const faixas = [0x10141c, 0x131822, 0x161c27, 0x19202c, 0x1c2330, 0x1e2634];
  faixas.forEach((cor, i) => ret(s, c, 0, i * 11, ARTE_L, 11, cor));
  ret(s, c, 0, 30, 30, 36, 0x232a38);
  ret(s, c, 0, 30, 30, 1, 0x3a4458);
  // o poço que leva para a masmorra
  const g = s.add.graphics();
  c.add(g);
  g.fillStyle(0x000000, 1).fillEllipse(70, 60, 56, 16);
  g.fillStyle(0x05060a, 1).fillRect(46, 60, 48, 6);
  for (let i = 0; i < 4; i++) g.fillStyle(0x161b24, 1).fillRect(54 + i * 3, 54 + i * 2, 28 - i * 6, 1);
  // o Apagador descendo com a Chama Primeira numa lanterna
  const fig = apagador(s, c, 70, 46, 0.6);
  const lanterna = s.add.container(80, 34);
  c.add(lanterna);
  lanterna.add(s.add.circle(0, 0, 10, 0xffb43a, 0.25).setBlendMode(Phaser.BlendModes.ADD));
  lanterna.add(s.add.rectangle(-2, -3, 4, 6, 0x3a3440).setOrigin(0));
  lanterna.add(s.add.rectangle(-1, -2, 2, 3, 0xffe066).setOrigin(0));
  s.tweens.add({ targets: [fig, lanterna], y: '+=26', alpha: 0.15, delay: 800, duration: 4200, ease: 'Sine.in' });
  // a velinha assiste, de longe
  const vela = s.add.sprite(15, 30, 'player', 0).setOrigin(0.5, 1).setScale(0.6).play('heroi_vela_parado');
  c.add(vela);
  // o mundo esfria: neve e um tom azul-acinzentado
  const frio = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x8aa0c0, 0);
  s.tweens.add({ targets: frio, fillAlpha: 0.22, duration: 5000 });
  s.time.addEvent({
    delay: 120, loop: true,
    callback: () => {
      const f = ret(s, c, Math.random() * ARTE_L, -2, 1, 1, 0xe8f0ff, 0.9);
      s.tweens.add({ targets: f, y: ARTE_A + 2, x: f.x - 6 + Math.random() * 4, duration: 3000 + Math.random() * 1500, onComplete: () => f.destroy() });
    },
  });
  return null;
}

// ---------- 5. A arma ----------
function cenaArma(s: Phaser.Scene, c: C): Atualizar | null {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x140a0e);
  brilho(s, c, 60, 38, 34, 0xff4a2e, 0.08);
  brilho(s, c, 60, 40, 18, 0xffb43a, 0.1);
  ret(s, c, 0, 56, ARTE_L, 10, 0x241418);
  // escada para baixo, à direita
  for (let i = 0; i < 6; i++) ret(s, c, 96 + i * 2, 44 + i * 4, 30, 4, [0x3a2a30, 0x30222a, 0x261a22, 0x1c1218, 0x120c10, 0x080508][i]);
  const vela = s.add.sprite(52, 56, 'player', 0).setOrigin(0.5, 1).setScale(1.6).play('heroi_vela_parado');
  const arma = s.add.image(140, 46, 'arma_escopeta').setOrigin(0.15, 0.5).setScale(1.4);
  c.add([vela, arma]);
  s.tweens.add({ targets: arma, x: 58, duration: 700, delay: 700, ease: 'Back.out', onStart: () => Som.tocar('pegarArma') });
  // engatilha
  s.time.delayedCall(1900, () => {
    Som.tocar('recarga');
    s.tweens.add({ targets: arma, x: 55, duration: 80, yoyo: true });
  });
  // dispara para o alto: clarão
  s.time.delayedCall(2700, () => {
    Som.tocar('escopeta');
    arma.setRotation(-0.5);
    const flash = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0xffffff, 1);
    s.tweens.add({ targets: flash, fillAlpha: 0, duration: 450, onComplete: () => flash.destroy() });
    const clarao = s.add.image(80, 34, 'clarao').setScale(3);
    c.add(clarao);
    s.tweens.add({ targets: clarao, alpha: 0, scale: 5, duration: 200, onComplete: () => clarao.destroy() });
    s.tweens.add({ targets: c, x: c.x + 6, duration: 40, yoyo: true, repeat: 3 });
    s.tweens.add({ targets: arma, rotation: 0, delay: 300, duration: 300 });
  });
  // e desce
  s.time.delayedCall(3700, () => {
    vela.play('heroi_vela_andar');
    s.tweens.add({ targets: [vela, arma], x: '+=50', duration: 1600, ease: 'Sine.in' });
    s.tweens.add({ targets: [vela, arma], y: '+=14', alpha: 0, delay: 900, duration: 1200 });
  });
  return null;
}

// =====================================================================
// Final (depois de vencer O Apagador)
// =====================================================================

// ---------- 1. O Apagador se desfaz ----------
function fimApagador(s: Phaser.Scene, c: C): Atualizar | null {
  const faixas = [0x1c0a0e, 0x220c10, 0x281014, 0x2e1218, 0x34141a, 0x3a161c];
  faixas.forEach((cor, i) => ret(s, c, 0, i * 11, ARTE_L, 11, cor));
  ret(s, c, 0, 52, ARTE_L, 14, 0x241014);
  const luz = brilho(s, c, 60, 40, 30, 0xff3040, 0.18);
  const fig = apagador(s, c, 60, 56, 1.2);
  s.tweens.add({ targets: fig, x: 61, duration: 60, yoyo: true, repeat: 20 });
  // vira fumaça
  s.time.delayedCall(900, () => {
    Som.tocar('explosao');
    s.tweens.add({ targets: [fig, luz], alpha: 0, duration: 2600 });
    s.time.addEvent({
      delay: 40, repeat: 70,
      callback: () => {
        const f = ret(s, c, 48 + Math.random() * 24, 14 + Math.random() * 40, 2, 2, Math.random() < 0.3 ? 0x3e5a7e : 0x5a5468, 0.8);
        s.tweens.add({ targets: f, y: f.y - 20 - Math.random() * 20, x: f.x + (Math.random() - 0.5) * 16, alpha: 0, duration: 1400, onComplete: () => f.destroy() });
      },
    });
  });
  return null;
}

// ---------- 2. A Chama Primeira na lanterna ----------
function fimLanterna(s: Phaser.Scene, c: C): Atualizar | null {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x0a0710);
  ret(s, c, 0, 52, ARTE_L, 14, 0x161020);
  ret(s, c, 76, 40, 10, 12, 0x3a2e48);
  ret(s, c, 74, 38, 14, 3, 0x5a4868);
  brilho(s, c, 81, 31, 28, 0xff9a2e, 0.12);
  const forte = brilho(s, c, 81, 31, 12, 0xffd23f, 0.3);
  s.tweens.add({ targets: forte, alpha: 0.18, duration: 160, yoyo: true, repeat: -1 });
  ret(s, c, 77, 26, 9, 12, 0x3a3440);
  ret(s, c, 78, 27, 7, 10, 0x1a1420);
  chamaGrande(s, c, 81.5, 36, 0.8);
  ret(s, c, 79, 24, 5, 2, 0x5a5468);
  const vela = s.add.sprite(8, 52, 'player', 0).setOrigin(0.5, 1).play('heroi_vela_andar');
  c.add(vela);
  s.tweens.add({ targets: vela, x: 64, duration: 2600, ease: 'Sine.out', onComplete: () => vela.play('heroi_vela_parado') });
  return null;
}

// ---------- 3. As chamas se tocam ----------
function fimToque(s: Phaser.Scene, c: C): Atualizar | null {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x05030a);
  const pequena = chamaGrande(s, c, 34, 44, 0.7);
  const grande = chamaGrande(s, c, 86, 44, 1.4);
  s.tweens.add({ targets: pequena, x: 55, duration: 2200, ease: 'Sine.inOut' });
  s.tweens.add({ targets: grande, x: 65, duration: 2200, ease: 'Sine.inOut' });
  s.time.delayedCall(2200, () => {
    Som.tocar('acender');
    const flash = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0xffffff, 1);
    s.tweens.add({ targets: flash, fillAlpha: 0, duration: 900, onComplete: () => flash.destroy() });
    for (let i = 0; i < 4; i++) {
      const anel = s.add.circle(60, 38, 6, 0xffe066, 0).setStrokeStyle(1, 0xffe066, 1);
      c.add(anel);
      s.tweens.add({ targets: anel, scale: 10, alpha: 0, delay: i * 180, duration: 1200, onComplete: () => anel.destroy() });
    }
    pequena.destroy();
    grande.destroy();
    const una = chamaGrande(s, c, 60, 44, 2);
    una.setScale(0.5);
    s.tweens.add({ targets: una, scale: 1, duration: 600, ease: 'Back.out' });
  });
  return null;
}

// ---------- 4. A catedral reacende ----------
function fimCatedral(s: Phaser.Scene, c: C): Atualizar | null {
  const velas = fundoCatedral(s, c);
  for (const v of velas) {
    v.chama.forEach((o) => (o as Phaser.GameObjects.Rectangle).setVisible(false));
    v.luz.setVisible(false);
  }
  const sombra = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x000000, 0.6);
  const primeira = chamaGrande(s, c, 60, 34);
  primeira.setScale(0);
  s.tweens.add({ targets: primeira, scale: 1, duration: 700, ease: 'Back.out', delay: 300 });
  // acende do altar para fora, como uma onda de luz
  const ordem = velas.slice().sort((a, b) => Math.hypot(a.x - 60, a.y - 40) - Math.hypot(b.x - 60, b.y - 40));
  ordem.forEach((v, i) => {
    s.time.delayedCall(800 + i * 45, () => {
      v.chama.forEach((o) => (o as Phaser.GameObjects.Rectangle).setVisible(true));
      v.luz.setVisible(true).setScale(2);
      s.tweens.add({ targets: v.luz, scale: 1, duration: 300 });
      if (i % 8 === 0) Som.tocar('cera');
    });
  });
  s.tweens.add({ targets: sombra, fillAlpha: 0, delay: 800, duration: ordem.length * 45 });
  return () => tremeluzir(velas);
}

// ---------- 5. A guardiã do altar ----------
function fimAltar(s: Phaser.Scene, c: C): Atualizar | null {
  const velas = fundoCatedral(s, c);
  chamaGrande(s, c, 60, 34, 1.2);
  brilho(s, c, 60, 48, 22, 0xffd23f, 0.12);
  const vela = s.add.sprite(60, 50, 'player', 0).setOrigin(0.5, 1).play('heroi_vela_parado');
  c.add(vela);
  // faíscas douradas subindo
  s.time.addEvent({
    delay: 120, loop: true,
    callback: () => {
      const f = ret(s, c, 20 + Math.random() * 80, 66, 1, 1, 0xffe066, 1);
      s.tweens.add({ targets: f, y: 20 + Math.random() * 20, alpha: 0, duration: 2200, onComplete: () => f.destroy() });
    },
  });
  const fim = s.add.text(60, 10, 'FIM', { fontFamily: FONTE, fontSize: '8px', color: CORES.ouro }).setOrigin(0.5).setAlpha(0);
  c.add(fim);
  s.tweens.add({ targets: fim, alpha: 1, delay: 2500, duration: 1200 });
  return () => tremeluzir(velas);
}

// =====================================================================
// Final 2: O Pavio Negro (a sombra da velinha)
// =====================================================================

function sprite(s: Phaser.Scene, c: C, x: number, y: number, chave: string, anim?: string) {
  const spr = s.add.sprite(x, y, chave, 0).setOrigin(0.5, 1);
  if (anim && s.anims.exists(anim)) spr.play(anim);
  c.add(spr);
  return spr;
}

function chao(s: Phaser.Scene, c: C, cor = 0x161020) {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x07050b);
  ret(s, c, 0, 50, ARTE_L, 16, cor);
}

// ---------- 1. O Pavio Negro cai de joelhos ----------
function fim2Sombra(s: Phaser.Scene, c: C): Atualizar | null {
  chao(s, c);
  brilho(s, c, 40, 42, 16, 0xff9a2e, 0.12);
  brilho(s, c, 80, 42, 16, 0xb06bff, 0.12);
  sprite(s, c, 40, 52, 'player', 'heroi_vela_parado');
  const negro = sprite(s, c, 80, 52, 'pavio_negro', 'pavio_negro_mover').setFlipX(true);
  s.tweens.add({ targets: negro, scaleY: 0.8, delay: 600, duration: 700, ease: 'Quad.out' });
  return null;
}

// ---------- 2. Ele era o medo dela ----------
function fim2Medo(s: Phaser.Scene, c: C): Atualizar | null {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x05030a);
  const negro = sprite(s, c, 60, 46, 'pavio_negro', 'pavio_negro_mover').setScale(1.6);
  brilho(s, c, 60, 30, 26, 0xb06bff, 0.1);
  // sombras rodando em volta
  const sombras: Phaser.GameObjects.Rectangle[] = [];
  for (let k = 0; k < 10; k++) sombras.push(ret(s, c, 60, 30, 4, 3, 0x2a1f33, 0.9));
  let t = 0;
  sprite(s, c, 108, 62, 'player', 'heroi_vela_parado').setScale(0.5);
  void negro;
  return () => {
    t += 0.03;
    sombras.forEach((sh, k) => sh.setPosition(60 + Math.cos(t + k * 0.63) * (26 + Math.sin(t * 2 + k) * 4), 30 + Math.sin(t + k * 0.63) * 16));
  };
}

// ---------- 3. O abraço ----------
function fim2Abraco(s: Phaser.Scene, c: C): Atualizar | null {
  chao(s, c);
  const vela = sprite(s, c, 36, 52, 'player', 'heroi_vela_andar');
  const negro = sprite(s, c, 84, 52, 'pavio_negro', 'pavio_negro_mover').setFlipX(true);
  s.tweens.add({ targets: vela, x: 56, duration: 1600, ease: 'Sine.inOut' });
  s.tweens.add({
    targets: negro, x: 64, duration: 1600, ease: 'Sine.inOut',
    onComplete: () => {
      Som.tocar('acender');
      const flash = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0xd8a0ff, 1);
      s.tweens.add({ targets: flash, fillAlpha: 0, duration: 1000, onComplete: () => flash.destroy() });
      s.tweens.add({ targets: negro, alpha: 0, x: 60, duration: 900 });
      vela.play('heroi_vela_parado');
      s.tweens.add({ targets: vela, x: 60, duration: 600 });
      const aura = brilho(s, c, 60, 44, 14, 0xb06bff, 0.25);
      s.tweens.add({ targets: aura, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
    },
  });
  return null;
}

// ---------- 4. Toda vela tem uma sombra ----------
function fim2Dupla(s: Phaser.Scene, c: C): Atualizar | null {
  const velas = fundoCatedral(s, c);
  // cada velinha ganha uma sombra roxa ao lado
  for (const v of velas) ret(s, c, v.x + 1, v.y + 6, 3, 1, 0x3a1f55, 0.7);
  chamaGrande(s, c, 60, 34, 1.1);
  sprite(s, c, 60, 50, 'player', 'heroi_vela_parado');
  const sombra = sprite(s, c, 67, 50, 'pavio_negro', 'pavio_negro_mover').setAlpha(0.5).setScale(0.9, 0.5);
  sombra.setOrigin(0.5, 1);
  return () => tremeluzir(velas);
}

// =====================================================================
// Final 3: O Acendedor (quem acendeu a primeira chama)
// =====================================================================

function acendedor(s: Phaser.Scene, c: C, x: number, y: number, escala = 1) {
  const chave = s.textures.exists('apagador') ? 'apagador' : 'player';
  const spr = sprite(s, c, x, y, chave, 'apagador_mover').setTint(0xffe8a0).setScale(escala);
  const aura = brilho(s, c, x, y - 14 * escala, 22 * escala, 0xffd23f, 0.15);
  s.tweens.add({ targets: aura, alpha: 0.06, duration: 300, yoyo: true, repeat: -1 });
  return spr;
}

// ---------- 1. O Acendedor cai ----------
function fim3Acendedor(s: Phaser.Scene, c: C): Atualizar | null {
  chao(s, c, 0x2a1a10);
  const fogo = [0x3a1a0a, 0x4a220c, 0x5a2a0e];
  fogo.forEach((cor, i) => ret(s, c, 0, 40 + i * 4, ARTE_L, 4, cor));
  const fig = acendedor(s, c, 60, 52, 1.4);
  s.tweens.add({ targets: fig, angle: 8, y: 54, delay: 400, duration: 1200, ease: 'Quad.in' });
  s.time.addEvent({
    delay: 80, repeat: 40,
    callback: () => {
      const f = ret(s, c, 40 + Math.random() * 40, 50, 1, 1, Math.random() < 0.5 ? 0xffd23f : 0xff7a2e, 1);
      s.tweens.add({ targets: f, y: 10 + Math.random() * 20, alpha: 0, duration: 1200, onComplete: () => f.destroy() });
    },
  });
  return null;
}

// ---------- 2. O primeiro fósforo ----------
function fim3Fosforo(s: Phaser.Scene, c: C): Atualizar | null {
  ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x0a0710);
  // um fósforo gigante sendo riscado
  const pal = s.add.container(30, 40);
  c.add(pal);
  pal.add(s.add.rectangle(0, 0, 40, 3, 0xd9a441).setOrigin(0, 0.5));
  pal.add(s.add.rectangle(38, 0, 6, 5, 0xe2452b).setOrigin(0, 0.5));
  pal.setAngle(-20);
  s.tweens.add({
    targets: pal, x: 50, duration: 500, ease: 'Quad.in',
    onComplete: () => {
      Som.tocar('acender');
      const ch = chamaGrande(s, c, 88, 30, 0.6);
      s.tweens.add({ targets: ch, scale: 2.4, duration: 3000 });
      // tudo em volta vira cinza
      const cinza = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0x6a6470, 0);
      s.tweens.add({ targets: cinza, fillAlpha: 0.45, delay: 1200, duration: 2400 });
    },
  });
  return null;
}

// ---------- 3. A velinha oferece a chama ----------
function fim3Entrega(s: Phaser.Scene, c: C): Atualizar | null {
  chao(s, c, 0x1a1420);
  acendedor(s, c, 84, 52, 1.1).setFlipX(true);
  const vela = sprite(s, c, 34, 52, 'player', 'heroi_vela_parado');
  void vela;
  const chama = ret(s, c, 34, 34, 2, 3, 0xffe066, 1);
  const luz = brilho(s, c, 35, 35, 5, 0xff9a2e, 0.4);
  s.tweens.add({ targets: [chama, luz], x: '+=44', y: '-=6', delay: 800, duration: 2200, ease: 'Sine.inOut' });
  return null;
}

// ---------- 4. O primeiro amanhecer ----------
function fim3Amanhecer(s: Phaser.Scene, c: C): Atualizar | null {
  const ceu = [0x0e0a16, 0x2a1428, 0x5a2a3a, 0xa04a3a, 0xe08a4a, 0xffc070];
  const faixas = ceu.map((cor, i) => ret(s, c, 0, i * 9, ARTE_L, 9, cor, 0));
  faixas.forEach((f, i) => s.tweens.add({ targets: f, fillAlpha: 1, delay: (ceu.length - i) * 300, duration: 900 }));
  // (círculos com brilho escapam da máscara do quadro: tudo fica dentro dos 120x66)
  const sol = s.add.circle(60, 56, 10, 0xffe066).setBlendMode(Phaser.BlendModes.ADD);
  c.add(sol);
  brilho(s, c, 60, 44, 20, 0xffd23f, 0.12);
  s.tweens.add({ targets: sol, y: 40, duration: 4000, ease: 'Sine.out' });
  // a Catedral em silhueta
  const g = s.add.graphics();
  c.add(g);
  g.fillStyle(0x0a0710, 1).fillRect(30, 40, 60, 26).fillTriangle(30, 40, 90, 40, 60, 20).fillRect(56, 10, 8, 14).fillTriangle(54, 10, 66, 10, 60, 2);
  for (const x of [38, 50, 70, 82]) g.fillStyle(0xffd23f, 0.8).fillRect(x, 48, 2, 4);
  return null;
}

// ---------- 5. A menor das velas descansa ----------
function fim3Sol(s: Phaser.Scene, c: C): Atualizar | null {
  const velas = fundoCatedral(s, c);
  const dia = ret(s, c, 0, 0, ARTE_L, ARTE_A, 0xffe0a0, 0.18);
  dia.setBlendMode(Phaser.BlendModes.ADD);
  brilho(s, c, 60, 20, 20, 0xffe066, 0.2);
  sprite(s, c, 60, 50, 'player', 'heroi_vela_parado');
  const fim = s.add.text(60, 10, 'FIM', { fontFamily: FONTE, fontSize: '8px', color: CORES.ouro }).setOrigin(0.5).setAlpha(0);
  c.add(fim);
  s.tweens.add({ targets: fim, alpha: 1, delay: 2500, duration: 1200 });
  return () => tremeluzir(velas);
}

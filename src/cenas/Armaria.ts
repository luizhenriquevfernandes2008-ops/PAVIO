import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { D, RARIDADES, raridade, personagem, type ArmaDef } from '../dados';
import { Estado, bloqueado, conquistaDe, salvarMeta } from '../estado';
import { SKINS, skinLiberada, nivelMaestria, corSkin } from '../sistemas/Regras';
import { ehFusao } from '../sistemas/Fusao';
import { Opcoes } from '../opcoes';
import { Som } from '../som';
import { fundoMasmorra } from './fundo';

// ======================================================================
// ARMARIA 3D: todas as armas do jogo viram modelos de voxel (cada pixel do
// desenho vira um cubinho, com o miolo mais grosso que a borda). Dá para girar
// com o mouse, dar zoom, trocar de arma e testar o tiro.
// ======================================================================

type V3 = [number, number, number];
interface Face {
  p: V3[]; // 4 cantos
  n: V3; // normal
  cor: number;
  mx: number; // coluna do pixel (o arco-íris anda por ela)
}
interface Modelo {
  faces: Face[];
  w: number;
  h: number;
  cano: V3; // ponta do cano (de onde sai o tiro)
}

const DIRS: V3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// de onde vem a luz (cima, esquerda, na frente)
const LUZ: V3 = (() => {
  const v: V3 = [-0.45, -0.7, -0.6];
  const m = Math.hypot(...v);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

/** Lê os pixels da textura e monta as faces visíveis dos cubinhos. */
function construirModelo(scene: Phaser.Scene, chave: string): Modelo {
  const fr = scene.textures.getFrame(chave);
  const w = fr.cutWidth;
  const h = fr.cutHeight;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(fr.source.image as CanvasImageSource, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const cor = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return px[i + 3] > 40 ? (px[i] << 16) | (px[i + 1] << 8) | px[i + 2] : -1;
  };
  const cheio = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && cor(x, y) >= 0;

  // cada pixel vira uma coluna de cubos em z: borda fina (2), miolo grosso (4)
  const ocupado = new Map<string, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = cor(x, y);
      if (c < 0) continue;
      const borda = !cheio(x + 1, y) || !cheio(x - 1, y) || !cheio(x, y + 1) || !cheio(x, y - 1);
      const meia = borda ? 1 : 2;
      for (let z = -meia; z < meia; z++) ocupado.set(`${x},${y},${z}`, c);
    }
  }
  const faces: Face[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (const [k, c] of ocupado) {
    const [x, y, z] = k.split(',').map(Number);
    for (const d of DIRS) {
      if (ocupado.has(`${x + d[0]},${y + d[1]},${z + d[2]}`)) continue;
      // o eixo da face e os outros dois que a "esticam"
      const eixo = d[0] ? 0 : d[1] ? 1 : 2;
      const u = (eixo + 1) % 3;
      const v = (eixo + 2) % 3;
      const base: V3 = [x - cx, y - cy, z];
      const plano = (d[eixo] > 0 ? 1 : 0);
      const canto = (a: number, b: number): V3 => {
        const p: V3 = [base[0], base[1], base[2]];
        p[eixo] += plano;
        p[u] += a;
        p[v] += b;
        return p;
      };
      // as laterais ficam um pouco mais escuras que a frente, como um entalhe
      faces.push({ p: [canto(0, 0), canto(1, 0), canto(1, 1), canto(0, 1)], n: d, cor: eixo === 2 ? c : escurecer(c, 0.82), mx: x });
    }
  }
  // cano: a coluna mais à direita (as armas olham para a direita)
  let maxX = 0;
  for (let x = w - 1; x >= 0 && !maxX; x--) for (let y = 0; y < h; y++) if (cheio(x, y)) maxX = x;
  let soma = 0;
  let n = 0;
  for (let y = 0; y < h; y++) if (cheio(maxX, y)) (soma += y), n++;
  return { faces, w, h, cano: [maxX + 1 - cx, (n ? soma / n : cy) + 0.5 - cy, 0] };
}

function escurecer(c: number, f: number) {
  const r = Math.min(255, ((c >> 16) & 255) * f);
  const g = Math.min(255, ((c >> 8) & 255) * f);
  const b = Math.min(255, (c & 255) * f);
  return (r << 16) | (g << 8) | b;
}

const FILTROS = ['TODAS', ...RARIDADES.map((r) => r.nome)];

export class Armaria extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private lista: ArmaDef[] = [];
  private sel = 0;
  private filtro = 0;
  private modelo: Modelo | null = null;
  private yaw = -0.5;
  private pitch = 0.25;
  private zoom = 1;
  private girando = true;
  private parado = 0; // segundos desde o último arraste (volta a girar sozinho)
  private coice = 0;
  private relogio = 0;
  private arrastando: { x: number; y: number } | null = null;
  private camadaLista!: Phaser.GameObjects.Container;
  private camadaInfo!: Phaser.GameObjects.Container;
  private camadaSkins!: Phaser.GameObjects.Container;
  private txtNome!: Phaser.GameObjects.Text;
  private txtTier!: Phaser.GameObjects.Text;
  private txtFiltro!: Phaser.GameObjects.Text;
  private luz!: Phaser.GameObjects.Image;
  private saindo = false;
  private maximos = { dano: 1, tiros: 1, pente: 1, recarga: 1, alcance: 1, velocidade: 1 };
  private teclasGiro!: Record<'a' | 'd' | 'esq' | 'dir', Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Armaria');
  }

  create() {
    this.saindo = false;
    this.relogio = 0;
    Som.musica('menu');
    this.cameras.main.fadeIn(300);
    const moverLuz = fundoMasmorra(this, { monstros: false });
    moverLuz(TELA_L / 2, 330, 330);
    this.add.rectangle(0, 0, TELA_L, TELA_A, 0x07050b, 0.55).setOrigin(0).setDepth(-5);

    // maiores valores do jogo, para as barras
    for (const a of D.armas) {
      const m = this.maximos;
      m.dano = Math.max(m.dano, a.dano * a.projeteis);
      if (!a.laser) m.tiros = Math.max(m.tiros, 1 / a.cadencia);
      m.pente = Math.max(m.pente, a.pente);
      m.recarga = Math.max(m.recarga, a.recarga);
      m.alcance = Math.max(m.alcance, a.alcance);
      m.velocidade = Math.max(m.velocidade, a.velocidade);
    }

    const est = (tam: number, cor: string) => ({ fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: Math.max(4, tam / 4) });
    this.add.text(TELA_L / 2, 26, 'ARMARIA 3D', est(24, CORES.chama)).setOrigin(0.5);
    const armas = D.armas.filter((a) => !ehFusao(a.id));
    const livres = armas.filter((a) => !bloqueado('arma', a.id)).length;
    this.add.text(TELA_L / 2, 52, `${livres}/${armas.length} ARMAS LIBERADAS`, est(8, CORES.textoApagado)).setOrigin(0.5);

    // painéis
    const painel = (x: number, y: number, l: number, a: number) => {
      this.add.rectangle(x, y, l, a, 0x120c1a, 0.94).setOrigin(0).setStrokeStyle(2, 0x3a2e48);
      this.add.rectangle(x + 2, y + 2, l - 4, 2, 0xffb43a, 0.25).setOrigin(0);
    };
    painel(16, 70, 236, TELA_A - 112);
    painel(TELA_L - 266, 70, 250, TELA_A - 112);
    this.txtFiltro = this.add.text(134, 88, '', est(8, CORES.ouro)).setOrigin(0.5);
    this.camadaLista = this.add.container(0, 0);
    this.camadaInfo = this.add.container(0, 0);
    this.camadaSkins = this.add.container(0, 0).setDepth(8);

    // palco: luz de cima e o nome
    this.luz = this.add.image(TELA_L / 2 - 8, 330, 'luz').setBlendMode(Phaser.BlendModes.ADD).setScale(3.2, 3.6).setAlpha(0.35);
    this.g = this.add.graphics().setDepth(5);
    this.txtNome = this.add.text(TELA_L / 2 - 8, 92, '', est(16, CORES.texto)).setOrigin(0.5).setDepth(6);
    this.txtTier = this.add.text(TELA_L / 2 - 8, 116, '', est(8, CORES.texto)).setOrigin(0.5).setDepth(6);

    this.add.text(TELA_L / 2, TELA_A - 22,
      'W/S trocar · Q/E tier · ARRASTE ou A/D girar · RODA zoom · ESPAÇO atirar · 1-5 skin · ESC voltar',
      est(8, CORES.textoApagado)).setOrigin(0.5);

    // ---- entrada ----
    const kb = this.input.keyboard!;
    this.teclasGiro = kb.addKeys({ a: 'A', d: 'D', esq: 'LEFT', dir: 'RIGHT' }) as Record<'a' | 'd' | 'esq' | 'dir', Phaser.Input.Keyboard.Key>;
    kb.on('keydown', (e: KeyboardEvent) => this.tecla(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // só arrasta no palco (o meio da tela)
      if (p.x > 260 && p.x < TELA_L - 270) this.arrastando = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', () => (this.arrastando = null));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.arrastando || !p.isDown) return;
      this.yaw += (p.x - this.arrastando.x) * 0.012;
      this.pitch = Phaser.Math.Clamp(this.pitch + (p.y - this.arrastando.y) * 0.012, -1.3, 1.3);
      this.arrastando = { x: p.x, y: p.y };
      this.parado = 0;
      this.girando = false;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoom = Phaser.Math.Clamp(this.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 2.2);
    });

    this.montarLista(true);
  }

  // ===================== lista e ficha =====================

  private filtradas() {
    const todas = D.armas.filter((a) => !ehFusao(a.id)).sort((a, b) => b.raridade - a.raridade || a.nome.localeCompare(b.nome));
    return this.filtro === 0 ? todas : todas.filter((a) => a.raridade === this.filtro - 1);
  }

  private montarLista(primeira = false) {
    const atual = this.lista[this.sel]?.id;
    this.lista = this.filtradas();
    if (primeira) this.sel = 0;
    else this.sel = Math.max(0, this.lista.findIndex((a) => a.id === atual));
    this.txtFiltro.setText(`< ${FILTROS[this.filtro]} (${this.lista.length}) >`).setColor(this.filtro === 0 ? CORES.ouro : raridade(this.filtro - 1).cor);
    this.desenharLista();
    this.escolher(this.sel, false);
  }

  private desenharLista() {
    const c = this.camadaLista;
    c.removeAll(true);
    const linhas = 15;
    const ini = Phaser.Math.Clamp(this.sel - Math.floor(linhas / 2), 0, Math.max(0, this.lista.length - linhas));
    const est = (cor: string) => ({ fontFamily: FONTE, fontSize: '8px', color: cor, stroke: '#07050b', strokeThickness: 4 });
    this.lista.slice(ini, ini + linhas).forEach((a, k) => {
      const i = ini + k;
      const y = 112 + k * 30;
      const bloq = bloqueado('arma', a.id);
      const sel = i === this.sel;
      const fundo = this.add.rectangle(24, y - 12, 220, 26, sel ? 0x2a1a10 : 0x000000, sel ? 1 : 0.001).setOrigin(0).setInteractive({ useHandCursor: true });
      if (sel) fundo.setStrokeStyle(2, 0xffb43a);
      fundo.on('pointerdown', () => this.escolher(i));
      const ic = this.add.image(46, y, a.sprite).setScale(Math.min(2, 30 / this.textures.getFrame(a.sprite).cutWidth));
      if (bloq) ic.setTint(0x000000).setAlpha(0.6);
      const nome = a.nome.toUpperCase();
      const t = this.add.text(70, y, bloq ? '???' : nome.length > 18 ? nome.slice(0, 17) + '.' : nome, est(bloq ? CORES.textoApagado : raridade(a.raridade).cor)).setOrigin(0, 0.5);
      c.add([fundo, ic, t]);
    });
    if (ini > 0) c.add(this.add.text(134, 100, '...', est(CORES.textoApagado)).setOrigin(0.5));
    if (ini + linhas < this.lista.length) c.add(this.add.text(134, 112 + linhas * 30 - 8, '...', est(CORES.textoApagado)).setOrigin(0.5));
  }

  private escolher(i: number, som = true) {
    if (!this.lista.length) return;
    this.sel = (i + this.lista.length) % this.lista.length;
    if (som) Som.tocar('menu');
    const a = this.lista[this.sel];
    this.modelo = construirModelo(this, a.sprite);
    this.coice = 0;
    this.desenharLista();
    this.desenharFicha(a);
  }

  private desenharFicha(a: ArmaDef) {
    const c = this.camadaInfo;
    c.removeAll(true);
    const bloq = bloqueado('arma', a.id);
    const r = raridade(a.raridade);
    const est = (tam: number, cor: string) => ({ fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: 4 });
    this.txtNome.setText(bloq ? '???' : a.nome.toUpperCase()).setColor(bloq ? CORES.textoApagado : r.cor);
    this.txtTier.setText(`[${r.nome}]`).setColor(r.cor);
    this.luz.setTint(Phaser.Display.Color.HexStringToColor(bloq ? '#3a2e48' : r.cor).color);
    const x0 = TELA_L - 252;
    const lw = 222;
    if (bloq) {
      c.add(this.add.text(x0, 90, 'BLOQUEADA', est(16, CORES.perigo)));
      const cq = conquistaDe('arma', a.id);
      c.add(this.add.text(x0, 120, cq ? `Para liberar: ${cq.desc}` : 'Ainda não descoberta.', { ...est(8, CORES.texto), wordWrap: { width: lw }, lineSpacing: 6 }));
      return;
    }
    c.add(this.add.text(x0, 90, a.desc, { ...est(8, CORES.texto), wordWrap: { width: lw }, lineSpacing: 6 }));
    const m = this.maximos;
    const barras: [string, string, number][] = [
      ['DANO', a.projeteis > 1 ? `${a.dano} x${a.projeteis}` : `${a.dano}`, (a.dano * a.projeteis) / m.dano],
      ['TIROS/S', a.laser ? 'LASER' : (1 / a.cadencia).toFixed(1), a.laser ? 1 : 1 / a.cadencia / m.tiros],
      ['PENTE', `${a.pente}`, a.pente / m.pente],
      ['RECARGA', `${a.recarga}s`, 1 - a.recarga / m.recarga + 0.05],
      ['ALCANCE', `${a.alcance}`, a.alcance / m.alcance],
      ['VEL. BALA', `${a.velocidade}`, a.velocidade / m.velocidade],
    ];
    const cor = Phaser.Display.Color.HexStringToColor(r.cor).color;
    barras.forEach(([nome, valor, f], i) => {
      const y = 196 + i * 40;
      c.add(this.add.text(x0, y, nome, est(8, CORES.textoApagado)));
      c.add(this.add.text(x0 + lw, y, valor, est(8, CORES.texto)).setOrigin(1, 0));
      c.add(this.add.rectangle(x0, y + 16, lw, 8, 0x07050b).setOrigin(0).setStrokeStyle(1, 0x3a2e48));
      // raiz: as barras pequenas não somem perto das gigantes
      const larg = Math.max(4, (lw - 2) * Math.sqrt(Phaser.Math.Clamp(f, 0, 1)));
      const barra = this.add.rectangle(x0 + 1, y + 17, 1, 6, cor).setOrigin(0);
      c.add(barra);
      this.tweens.add({ targets: barra, width: larg, duration: 260, delay: i * 30, ease: 'Cubic.out' });
    });
    const extras = [
      `MUNIÇÃO: ${a.municao < 0 ? 'INFINITA' : a.municao}`,
      ...(a.exclusivo ? [`SÓ PARA: ${personagem(a.exclusivo).nome.toUpperCase()}`] : []),
    ];
    c.add(this.add.text(x0, 434, extras.join('\n'), { ...est(8, CORES.ouro), lineSpacing: 8 }));
    // maestria: abates com esta arma (somando todas as partidas)
    const abates = Estado.meta.maestria[a.id] ?? 0;
    const nv = nivelMaestria(abates);
    const prox = SKINS[nv + 1];
    c.add(this.add.text(x0, 482, `MAESTRIA ${nv}/${SKINS.length - 1} · ${abates} ABATES`, est(8, CORES.chama)));
    c.add(this.add.rectangle(x0, 500, lw, 8, 0x07050b).setOrigin(0).setStrokeStyle(1, 0x3a2e48));
    const ant = SKINS[nv].abates;
    const fm = prox ? (abates - ant) / (prox.abates - ant) : 1;
    c.add(this.add.rectangle(x0 + 1, 501, Math.max(2, (lw - 2) * fm), 6, 0xffb43a).setOrigin(0));
    c.add(this.add.text(x0, 516, prox ? `Próxima: ${prox.nome} (${prox.abates})` : 'Todas as skins liberadas!', est(8, CORES.textoApagado)));
    this.desenharSkins(a);
  }

  /** Os botões de skin embaixo do palco. */
  private desenharSkins(a: ArmaDef) {
    const c = this.camadaSkins;
    c.removeAll(true);
    if (bloqueado('arma', a.id)) return;
    const abates = Estado.meta.maestria[a.id] ?? 0;
    const atual = Estado.meta.skins[a.id] ?? 'normal';
    const cx = TELA_L / 2 - 8;
    const est = (cor: string) => ({ fontFamily: FONTE, fontSize: '8px', color: cor, stroke: '#07050b', strokeThickness: 4, align: 'center' });
    SKINS.forEach((sk, i) => {
      const x = cx + (i - 2) * 88;
      const y = 530;
      const livre = skinLiberada(sk, abates);
      const sel = sk.id === atual;
      const fundo = this.add.rectangle(x, y, 84, 34, sel ? 0x2a1a10 : 0x120c1a, 0.95).setStrokeStyle(2, sel ? 0xffb43a : livre ? 0x3a2e48 : 0x221a2c).setInteractive({ useHandCursor: true });
      fundo.on('pointerdown', () => this.usarSkin(i));
      c.add(fundo);
      c.add(this.add.text(x, y - 6, sk.nome, est(livre ? (sel ? CORES.chama : CORES.texto) : '#4a3e56')).setOrigin(0.5));
      c.add(this.add.text(x, y + 8, livre ? (sel ? 'EM USO' : 'LIBERADA') : `${sk.abates} ABATES`, est(livre ? CORES.textoApagado : '#4a3e56')).setOrigin(0.5));
    });
  }

  private usarSkin(i: number) {
    const a = this.lista[this.sel];
    const sk = SKINS[i];
    if (!a || !sk || bloqueado('arma', a.id)) return;
    if (!skinLiberada(sk, Estado.meta.maestria[a.id] ?? 0)) {
      Som.tocar('erro');
      return;
    }
    if (sk.id === 'normal') delete Estado.meta.skins[a.id];
    else Estado.meta.skins[a.id] = sk.id;
    salvarMeta(Estado.meta);
    Som.tocar('confirmar');
    this.desenharSkins(a);
  }

  // ===================== controles =====================

  private tecla(e: KeyboardEvent) {
    if (this.saindo) return;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.escolher(this.sel - 1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.escolher(this.sel + 1);
        break;
      case 'KeyQ':
      case 'KeyE':
        this.filtro = (this.filtro + (e.code === 'KeyE' ? 1 : FILTROS.length - 1)) % FILTROS.length;
        Som.tocar('menu');
        this.montarLista();
        break;
      case 'Space':
      case 'KeyJ':
      case 'Enter':
        this.atirar();
        break;
      case 'KeyR':
        this.yaw = -0.5;
        this.pitch = 0.25;
        this.zoom = 1;
        this.girando = true;
        break;
      case 'Escape':
      case 'Backspace':
        this.sair();
        break;
      case 'KeyM':
        Som.alternarMudo();
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        this.usarSkin(Number(e.code.slice(5)) - 1);
        break;
    }
  }

  private sair() {
    if (this.saindo) return;
    this.saindo = true;
    Som.tocar('voltar');
    this.cameras.main.fadeOut(200, 7, 5, 11);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Menu'));
  }

  /** Testa a arma: coice, clarão no cano, a bala voando e o som dela. */
  private atirar() {
    const a = this.lista[this.sel];
    const m = this.modelo;
    if (!a || !m || bloqueado('arma', a.id)) return Som.tocar('erro');
    this.coice = 1;
    Som.tocar(a.som === 'latido' ? 'latidoTiro' : a.som);
    if (Opcoes.tremor) this.cameras.main.shake(70, 0.002 + a.tremor * 0.0006);
    const [bx, by] = this.projetar(m.cano);
    const [fx, fy] = this.projetar([m.cano[0] + 6, m.cano[1], m.cano[2]]);
    const ang = Math.atan2(fy - by, fx - bx);
    const clarao = this.add.image(bx, by, 'clarao').setScale(4 * this.zoom).setRotation(ang).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: clarao, alpha: 0, scale: 1.5, duration: 90, onComplete: () => clarao.destroy() });
    const n = Math.min(5, Math.max(1, a.projeteis));
    for (let k = 0; k < n; k++) {
      const desvio = (k - (n - 1) / 2) * Math.min(0.5, a.dispersao * 2 + 0.08);
      const ab = ang + (n > 1 ? desvio : 0);
      const tex = this.textures.exists(a.bala) ? a.bala : 'bala';
      const b = this.add.image(bx, by, tex).setScale(3 * this.zoom).setDepth(7).setTint(Phaser.Display.Color.HexStringToColor(a.cor).color);
      if (tex !== 'latido' && tex !== 'miau') b.setRotation(ab);
      else b.clearTint();
      this.tweens.add({
        targets: b, x: bx + Math.cos(ab) * 420, y: by + Math.sin(ab) * 420, alpha: 0, duration: 420, ease: 'Quad.in',
        onComplete: () => b.destroy(),
      });
    }
  }

  // ===================== desenho 3D =====================

  /** Gira (yaw, depois pitch) e projeta com um pouco de perspectiva. */
  private girar(p: V3): V3 {
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cp - z1 * sp;
    const z2 = p[1] * sp + z1 * cp;
    return [x1, y2, z2];
  }

  private escala() {
    const m = this.modelo!;
    return (300 / Math.max(m.w, m.h * 1.6)) * this.zoom;
  }

  private centro(): [number, number] {
    return [TELA_L / 2 - 8, 320 + Math.sin(this.relogio * 1.6) * 6];
  }

  private projetar(p: V3): [number, number] {
    const S = this.escala();
    const [x, y, z] = this.girar([p[0] - this.coice * 1.6, p[1], p[2]]);
    const f = 600 / (600 + z * S);
    const [cx, cy] = this.centro();
    return [cx + x * S * f, cy + y * S * f];
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.relogio += dt;
    this.coice = Math.max(0, this.coice - dt * 8);
    const k = this.teclasGiro;
    if (k.a.isDown || k.esq.isDown) (this.yaw -= dt * 2.4), (this.parado = 0), (this.girando = false);
    if (k.d.isDown || k.dir.isDown) (this.yaw += dt * 2.4), (this.parado = 0), (this.girando = false);
    if (!this.arrastando) this.parado += dt;
    if (this.parado > 2.5) this.girando = true;
    if (this.girando) this.yaw += dt * 0.7;
    this.desenhar();
  }

  private desenhar() {
    const g = this.g;
    g.clear();
    const m = this.modelo;
    if (!m) return;
    const a = this.lista[this.sel];
    const bloq = !a || bloqueado('arma', a.id);
    const S = this.escala();
    const [cx, cy] = this.centro();
    const r = raridade(a?.raridade ?? 0);
    const corTier = Phaser.Display.Color.HexStringToColor(bloq ? '#3a2e48' : r.cor).color;
    const skin = a ? Estado.meta.skins[a.id] : undefined;

    // pedestal: sombra e um anel que gira
    const base = 470;
    g.fillStyle(0x000000, 0.45).fillEllipse(cx, base, 230 * Math.min(1.3, this.zoom), 34);
    g.lineStyle(2, corTier, 0.7).strokeEllipse(cx, base, 200 * Math.min(1.3, this.zoom), 28);
    for (let i = 0; i < 10; i++) {
      const ang = this.relogio * 0.8 + (i / 10) * Math.PI * 2;
      g.fillStyle(corTier, 0.5 + 0.5 * Math.sin(ang)).fillRect(cx + Math.cos(ang) * 100 * Math.min(1.3, this.zoom) - 2, base + Math.sin(ang) * 14 - 2, 4, 4);
    }

    // faces viradas para a câmera, de trás para frente
    const vis: { pts: { x: number; y: number }[]; z: number; cor: number }[] = [];
    const coice = this.coice * 1.6;
    for (const f of m.faces) {
      const n = this.girar(f.n);
      if (n[2] >= 0) continue;
      let zs = 0;
      const pts = f.p.map((p) => {
        const [x, y, z] = this.girar([p[0] - coice, p[1], p[2]]);
        zs += z;
        const k = 600 / (600 + z * S);
        return { x: cx + x * S * k, y: cy + y * S * k };
      });
      const luz = 0.42 + 0.7 * Math.max(0, n[0] * LUZ[0] + n[1] * LUZ[1] + n[2] * LUZ[2]);
      const base = bloq ? 0x2a2236 : corSkin(skin, f.cor, f.mx, this.relogio);
      vis.push({ pts, z: zs, cor: escurecer(base, luz) });
    }
    vis.sort((p, q) => q.z - p.z);
    for (const f of vis) {
      g.fillStyle(f.cor, 1).fillPoints(f.pts, true);
      // contorno da mesma cor: tapa as frestas entre os cubinhos
      g.lineStyle(1, f.cor, 1).strokePoints(f.pts, true);
    }

    // míticas: faíscas subindo
    if (!bloq && a.raridade >= 5 && Math.random() < 0.3) {
      const f = this.add.image(cx + (Math.random() - 0.5) * 220, base - 10, 'pixel').setTint(Math.random() < 0.5 ? 0xffd23f : 0xff9a2e).setScale(3).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: f, y: f.y - 200 - Math.random() * 120, alpha: 0, duration: 1400 + Math.random() * 800, onComplete: () => f.destroy() });
    }
  }
}

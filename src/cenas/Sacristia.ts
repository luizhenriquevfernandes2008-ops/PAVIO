import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { D, personagem, arma as acharArma, ArmaDef } from '../dados';
import { Estado, bloqueado, conquistaDe } from '../estado';
import { Opcoes, salvarOpcoes } from '../opcoes';
import { Som } from '../som';
import { personagemValido, personagemPronto, texturaPersonagem } from '../arte/personagens';
import { fundoMasmorra } from './fundo';
import { tintaSkin } from '../sistemas/Regras';

// ======================================================================
// A SACRISTIA: o lugar entre as partidas. Você anda com a sua vela, testa a
// arma no boneco, troca de personagem falando com eles e desce pelo portal.
// ======================================================================

interface Estacao {
  x: number;
  y: number;
  raio: number;
  rotulo: string;
  acao: () => void;
  texto?: () => string; // o que aparece no [E]
}

interface Bala {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  t: number;
}

const ESC = 3; // tudo em pixel art 3x
const VEL = 210;

export class Sacristia extends Phaser.Scene {
  private jogador!: Phaser.GameObjects.Sprite;
  private armaImg!: Phaser.GameObjects.Image;
  private armaDef!: ArmaDef;
  private estacoes: Estacao[] = [];
  private npcs: { id: string; spr: Phaser.GameObjects.Sprite; bloq: boolean }[] = [];
  private camadaNpcs!: Phaser.GameObjects.Container;
  private balas: Bala[] = [];
  private boneco!: Phaser.GameObjects.Sprite;
  private txtPrompt!: Phaser.GameObjects.Text;
  private txtBalao!: Phaser.GameObjects.Text;
  private txtDps!: Phaser.GameObjects.Text;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private moverLuz!: (x: number, y: number, r?: number) => void;
  private recarga = 0;
  private danoJanela: { t: number; d: number }[] = [];
  private saindo = false;
  private perto: Estacao | null = null;
  private relogio = 0;

  constructor() {
    super('Sacristia');
  }

  create() {
    this.saindo = false;
    this.estacoes = [];
    this.balas = [];
    this.npcs = [];
    this.danoJanela = [];
    this.relogio = 0;
    Som.musica('menu');
    this.cameras.main.fadeIn(350);
    this.moverLuz = fundoMasmorra(this, { monstros: false, escuridao: 0.55 });

    const est = (tam: number, cor: string) => ({ fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: Math.max(4, tam / 4), align: 'center' });
    this.add.text(TELA_L / 2, 26, 'A SACRISTIA', est(24, CORES.chama)).setOrigin(0.5).setDepth(900);
    this.add.text(TELA_L / 2, 52, 'WASD andar · MOUSE atirar no boneco · E interagir · ESC menu', est(8, CORES.textoApagado)).setOrigin(0.5).setDepth(900);
    this.txtPrompt = this.add.text(TELA_L / 2, TELA_A - 22, '', est(16, CORES.texto)).setOrigin(0.5).setDepth(900);
    this.txtBalao = this.add.text(0, 0, '', { ...est(8, CORES.texto), wordWrap: { width: 260 } }).setOrigin(0.5, 1).setDepth(901);

    this.montarEstacoes(est);
    this.camadaNpcs = this.add.container(0, 0);
    this.montarNpcs();

    // o jogador
    this.jogador = this.add.sprite(TELA_L / 2, 330, 'player', 0).setOrigin(0.5, 1).setScale(ESC);
    this.armaImg = this.add.image(0, 0, 'arma_pistola').setOrigin(0.15, 0.5).setScale(ESC);
    this.vestir(Opcoes.personagem);

    const kb = this.input.keyboard!;
    this.teclas = kb.addKeys({ W: 'W', A: 'A', S: 'S', D: 'D', cima: 'UP', baixo: 'DOWN', esq: 'LEFT', dir: 'RIGHT', E: 'E', enter: 'ENTER', esc: 'ESC' }) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.interagir());
    kb.on('keydown-ENTER', () => this.interagir());
    kb.on('keydown-ESC', () => this.sair('Menu'));
    kb.on('keydown-M', () => Som.alternarMudo());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.removeAllListeners();
      this.input.setDefaultCursor('default');
    });
    this.input.setDefaultCursor('crosshair');
  }

  // ===================== montagem =====================

  private montarEstacoes(est: (tam: number, cor: string) => Phaser.Types.GameObjects.Text.TextStyle) {
    const rotulo = (x: number, y: number, texto: string, cor: string) => this.add.text(x, y, texto, est(8, cor)).setOrigin(0.5).setDepth(800);
    const brilho = (x: number, y: number, cor: number, esc: number) => {
      const l = this.add.image(x, y, 'luz').setBlendMode(Phaser.BlendModes.ADD).setTint(cor).setScale(esc).setAlpha(0.4);
      this.tweens.add({ targets: l, alpha: 0.65, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    };

    // portal principal: descer para a masmorra
    const px = TELA_L / 2;
    brilho(px, 160, 0xffb43a, 2.4);
    const portal = this.add.image(px, 170, this.textures.exists('portal_luz') ? 'portal_luz' : 'luz').setScale(ESC + 0.5).setDepth(170);
    this.tweens.add({ targets: portal, scaleX: ESC + 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    rotulo(px, 112, 'DESCER', CORES.chama);
    this.estacoes.push({ x: px, y: 180, raio: 46, rotulo: 'portal', acao: () => this.sair('Menu', { tela: 'personagem', modo: 'novo' }), texto: () => '[E] Descer para a masmorra (escolher personagem)' });

    // portal da dupla
    const dx = px + 150;
    brilho(dx, 170, 0xff8ac8, 1.6);
    const p2 = this.add.image(dx, 176, this.textures.exists('portal_luz') ? 'portal_luz' : 'luz').setScale(ESC - 0.6).setTint(0xff8ac8).setDepth(176);
    this.tweens.add({ targets: p2, scaleX: ESC - 0.4, alpha: 0.8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    rotulo(dx, 128, 'EM DUPLA', '#ff8ac8');
    this.estacoes.push({ x: dx, y: 180, raio: 40, rotulo: 'dupla', acao: () => this.sair('Menu', { tela: 'personagem', modo: 'dupla' }), texto: () => '[E] Jogar em dupla' });

    // quadro dos desafios
    const qx = px - 160;
    const quadro = this.add.graphics().setDepth(170);
    quadro.fillStyle(0x5a3a22).fillRect(qx - 42, 126, 84, 60).lineStyle(3, 0x1b1325).strokeRect(qx - 42, 126, 84, 60);
    quadro.fillStyle(0xf2e3c2).fillRect(qx - 34, 134, 30, 20).fillRect(qx + 2, 140, 32, 18).fillRect(qx - 20, 160, 34, 18);
    quadro.fillStyle(0xe2452b).fillCircle(qx - 19, 136, 3).fillCircle(qx + 18, 142, 3).fillCircle(qx - 3, 162, 3);
    const feitos = Estado.meta.desafiosFeitos.length;
    rotulo(qx, 112, `DESAFIOS ${feitos}/8`, CORES.perigo);
    this.estacoes.push({ x: qx, y: 186, raio: 46, rotulo: 'desafios', acao: () => this.sair('Menu', { tela: 'desafios' }), texto: () => '[E] Ver os desafios' });

    // altar (melhorias com cera dourada)
    const ax = 130;
    const ay = 330;
    brilho(ax, ay - 20, 0xffd23f, 1.5);
    this.add.image(ax, ay, 'pedestal').setScale(ESC + 1).setTint(0xffd23f).setOrigin(0.5, 1).setDepth(ay);
    rotulo(ax, ay - 70, `ALTAR · ${Estado.meta.ceraDourada} CERA DOURADA`, CORES.ouro);
    this.estacoes.push({ x: ax, y: ay - 10, raio: 50, rotulo: 'altar', acao: () => this.sair('Altar'), texto: () => '[E] Altar: gastar cera dourada' });

    // armaria 3D: um suporte com armas
    const rx = TELA_L - 130;
    const ry = 330;
    const suporte = this.add.graphics().setDepth(ry - 40);
    suporte.fillStyle(0x5a3a22).fillRect(rx - 56, ry - 80, 112, 76).lineStyle(3, 0x1b1325).strokeRect(rx - 56, ry - 80, 112, 76);
    suporte.fillStyle(0x3a2414).fillRect(rx - 50, ry - 56, 100, 4).fillRect(rx - 50, ry - 30, 100, 4);
    ['arma_tete', 'arma_escopeta', 'arma_pistola'].forEach((t, i) => {
      if (!this.textures.exists(t)) return;
      this.add.image(rx - 30 + i * 30, ry - 64 + (i % 2) * 26, t).setScale(2).setDepth(ry - 39);
    });
    rotulo(rx, ry - 96, 'ARMARIA 3D', '#4fa8ff');
    this.estacoes.push({ x: rx, y: ry - 20, raio: 60, rotulo: 'armaria', acao: () => this.sair('Armaria'), texto: () => '[E] Armaria 3D: girar e testar as armas' });

    // livro (arsenal)
    const lx = 130;
    const ly = 520;
    const livro = this.add.graphics().setDepth(ly);
    livro.fillStyle(0x7a1a22).fillRect(lx - 22, ly - 30, 44, 30).lineStyle(3, 0x1b1325).strokeRect(lx - 22, ly - 30, 44, 30);
    livro.fillStyle(0xf2e3c2).fillRect(lx - 18, ly - 26, 17, 22).fillRect(lx + 1, ly - 26, 17, 22);
    rotulo(lx, ly - 46, 'ARSENAL', CORES.texto);
    this.estacoes.push({ x: lx, y: ly - 14, raio: 44, rotulo: 'arsenal', acao: () => this.sair('Menu', { tela: 'arsenal' }), texto: () => '[E] Ler o Arsenal' });

    // boneco de treino
    const bx = TELA_L - 150;
    const by = 520;
    const tex = this.textures.exists('esqueleto') ? 'esqueleto' : 'player';
    this.boneco = this.add.sprite(bx, by, tex, 0).setOrigin(0.5, 1).setScale(ESC).setTint(0xd8b07a).setDepth(by);
    this.txtDps = this.add.text(bx, by - 70, 'BONECO DE TREINO', est(8, CORES.textoApagado)).setOrigin(0.5).setDepth(800);
  }

  /** Os personagens ficam em fila embaixo; os bloqueados são sombras. */
  private montarNpcs() {
    this.camadaNpcs.removeAll(true);
    this.npcs = [];
    this.estacoes = this.estacoes.filter((e) => !e.rotulo.startsWith('npc_'));
    const lista = D.personagens.filter((p) => personagemPronto(p.id) && p.id !== personagemValido(Opcoes.personagem));
    const passo = Math.min(56, 540 / Math.max(1, lista.length));
    const x0 = TELA_L / 2 - ((lista.length - 1) * passo) / 2;
    lista.forEach((p, i) => {
      const x = x0 + i * passo;
      const y = 470 + (i % 2) * 34;
      const bloq = bloqueado('personagem', p.id);
      const spr = this.add.sprite(x, y, texturaPersonagem(p.id), 0).setOrigin(0.5, 1).setDepth(y);
      spr.setScale(2.8 * Math.min(1, 18 / spr.frame.realHeight));
      if (!bloq && this.anims.exists(`heroi_${p.id}_parado`)) spr.play({ key: `heroi_${p.id}_parado`, startFrame: i % 2 });
      if (bloq) spr.setTint(0x000000).setAlpha(0.55);
      this.camadaNpcs.add(spr);
      this.npcs.push({ id: p.id, spr, bloq });
      this.estacoes.push({
        x, y: y - 10, raio: 22, rotulo: `npc_${p.id}`,
        acao: () => this.trocarPersonagem(p.id),
        texto: () => (bloq ? `??? · ${conquistaDe('personagem', p.id)?.desc ?? 'bloqueado'}` : `[E] Jogar com ${p.nome}`),
      });
    });
  }

  /** Veste a vela com o personagem e a arma inicial dele. */
  private vestir(id: string) {
    const pid = personagemValido(id);
    this.jogador.setTexture(texturaPersonagem(pid), 0);
    this.jogador.setScale(ESC * Math.min(1, 18 / this.jogador.frame.realHeight));
    if (this.anims.exists(`heroi_${pid}_parado`)) this.jogador.play(`heroi_${pid}_parado`);
    this.armaDef = acharArma(personagem(pid).armas[0] ?? 'pistola');
    this.armaImg.setTexture(this.armaDef.sprite);
  }

  private trocarPersonagem(id: string) {
    if (bloqueado('personagem', id)) {
      Som.tocar('erro');
      return;
    }
    Opcoes.personagem = id;
    salvarOpcoes();
    Som.tocar('confirmar');
    const { x, y } = this.jogador;
    this.vestir(id);
    // um brilho na troca
    const anel = this.add.circle(x, y - 24, 10, 0xffe066, 0).setStrokeStyle(3, 0xffe066).setDepth(950);
    this.tweens.add({ targets: anel, scale: 5, alpha: 0, duration: 380, onComplete: () => anel.destroy() });
    this.txtBalao.setText(`Agora você é ${personagem(id).nome}!`);
    this.montarNpcs();
    if (this.armaDef.som === 'latido') Som.tocar('latido');
  }

  private interagir() {
    if (this.saindo || !this.perto) return;
    this.perto.acao();
  }

  private sair(cena: string, dados?: object) {
    if (this.saindo) return;
    this.saindo = true;
    Som.tocar(cena === 'Menu' && !dados ? 'voltar' : 'confirmar');
    this.cameras.main.fadeOut(220, 7, 5, 11);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(cena, dados));
  }

  // ===================== loop =====================

  update(_t: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.relogio += dt;
    if (this.saindo) return;
    const k = this.teclas;
    const j = this.jogador;
    let mx = 0;
    let my = 0;
    if (k.A.isDown || k.esq.isDown) mx -= 1;
    if (k.D.isDown || k.dir.isDown) mx += 1;
    if (k.W.isDown || k.cima.isDown) my -= 1;
    if (k.S.isDown || k.baixo.isDown) my += 1;
    const len = Math.hypot(mx, my) || 1;
    j.x = Phaser.Math.Clamp(j.x + (mx / len) * VEL * dt, 40, TELA_L - 40);
    j.y = Phaser.Math.Clamp(j.y + (my / len) * VEL * dt, 150, TELA_A - 36);
    // não atravessa as estações
    for (const e of this.estacoes) {
      if (e.rotulo.startsWith('npc_')) continue;
      const d = Phaser.Math.Distance.Between(j.x, j.y, e.x, e.y);
      const min = e.raio * 0.55;
      if (d < min && d > 0.01) {
        j.x = e.x + ((j.x - e.x) / d) * min;
        j.y = e.y + ((j.y - e.y) / d) * min;
      }
    }
    const pid = personagemValido(Opcoes.personagem);
    const andando = mx !== 0 || my !== 0;
    const anim = andando ? `heroi_${pid}_andar` : `heroi_${pid}_parado`;
    if (this.anims.exists(anim)) j.play(anim, true);
    j.setDepth(j.y);
    this.moverLuz(j.x, j.y - 20, 300);

    // arma mirando no mouse
    const p = this.input.activePointer;
    const ang = Math.atan2(p.y - (j.y - 24), p.x - j.x);
    const esquerda = Math.cos(ang) < 0;
    j.setFlipX(esquerda);
    this.armaImg.setPosition(j.x + Math.cos(ang) * 10, j.y - 24 + Math.sin(ang) * 6).setRotation(ang).setFlipY(esquerda).setDepth(j.y + 0.5);
    const tinta = tintaSkin(Estado.meta.skins[this.armaDef.id], this.relogio);
    if (tinta === null) this.armaImg.clearTint();
    else this.armaImg.setTint(tinta);

    // tiro (segurar o botão)
    this.recarga -= dt;
    if (p.isDown && p.leftButtonDown() && this.recarga <= 0) this.atirar(ang);
    this.atualizarBalas(dt);

    // estação mais perto
    this.perto = null;
    let melhor = Infinity;
    for (const e of this.estacoes) {
      const d = Phaser.Math.Distance.Between(j.x, j.y, e.x, e.y);
      if (d < e.raio + 18 && d < melhor) {
        melhor = d;
        this.perto = e;
      }
    }
    this.txtPrompt.setText(this.perto?.texto?.() ?? '');
    // balão: o personagem perto fala a descrição dele
    const npc = this.perto?.rotulo.startsWith('npc_') ? this.npcs.find((n) => `npc_${n.id}` === this.perto!.rotulo) : null;
    if (npc) {
      const pd = personagem(npc.id);
      this.txtBalao.setText(npc.bloq ? '...' : `${pd.nome}: "${pd.desc}"`).setPosition(npc.spr.x, npc.spr.y - npc.spr.displayHeight - 8).setColor(npc.bloq ? CORES.textoApagado : pd.cor);
    } else if (!this.txtBalao.text.startsWith('Agora')) this.txtBalao.setText('');
    else this.txtBalao.setPosition(j.x, j.y - j.displayHeight - 10);
    if (this.txtBalao.text.startsWith('Agora') && this.relogio % 3 < dt) this.txtBalao.setText('');

    // DPS do boneco (últimos 3 segundos)
    this.danoJanela = this.danoJanela.filter((d) => this.relogio - d.t < 3);
    const total = this.danoJanela.reduce((a, d) => a + d.d, 0);
    this.txtDps.setText(total > 0 ? `DPS ${Math.round(total / 3)}` : 'BONECO DE TREINO').setColor(total > 0 ? CORES.ouro : CORES.textoApagado);
  }

  private atirar(ang: number) {
    const def = this.armaDef;
    this.recarga = Math.max(0.1, def.laser ? 0.08 : def.cadencia);
    const n = Math.min(5, Math.max(1, def.projeteis));
    const ox = this.armaImg.x + Math.cos(ang) * 30;
    const oy = this.armaImg.y + Math.sin(ang) * 30;
    for (let k = 0; k < n; k++) {
      const a = ang + (n > 1 ? (k - (n - 1) / 2) * Math.max(0.08, def.dispersao * 1.5) : (Math.random() - 0.5) * def.dispersao);
      const tex = this.textures.exists(def.bala) ? def.bala : 'bala';
      const img = this.add.image(ox, oy, tex).setScale(ESC).setDepth(990);
      if (tex !== 'latido' && tex !== 'miau') img.setRotation(a).setTint(Phaser.Display.Color.HexStringToColor(def.cor).color);
      this.balas.push({ img, vx: Math.cos(a) * 640, vy: Math.sin(a) * 640, t: 0.9 });
    }
    const clarao = this.add.image(ox, oy, 'clarao').setScale(ESC + 1).setRotation(ang).setDepth(991).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: clarao, alpha: 0, duration: 80, onComplete: () => clarao.destroy() });
    this.tweens.add({ targets: this.armaImg, x: this.armaImg.x - Math.cos(ang) * 6, y: this.armaImg.y - Math.sin(ang) * 6, duration: 50, yoyo: true });
    Som.tocar(def.som === 'latido' ? 'latidoTiro' : def.som);
  }

  private atualizarBalas(dt: number) {
    const b0 = this.boneco;
    this.balas = this.balas.filter((b) => {
      b.t -= dt;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      const acertou = Math.abs(b.img.x - b0.x) < 22 && b.img.y < b0.y && b.img.y > b0.y - b0.displayHeight;
      if (acertou) {
        const crit = Math.random() < 0.1;
        const dano = Math.round(this.armaDef.dano * 10 * (crit ? 2 : 1));
        this.danoJanela.push({ t: this.relogio, d: dano });
        const txt = this.add.text(b.img.x, b.img.y - 10, `${dano}${crit ? '!' : ''}`, {
          fontFamily: FONTE, fontSize: crit ? '16px' : '8px', color: crit ? CORES.ouro : '#fff4d6', stroke: '#07050b', strokeThickness: 4,
        }).setOrigin(0.5).setDepth(995);
        this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
        b0.setTintFill(0xffffff);
        this.time.delayedCall(60, () => b0.setTint(0xd8b07a));
        this.tweens.add({ targets: b0, angle: Phaser.Math.Clamp(b.vx / 160, -6, 6), duration: 60, yoyo: true });
        Som.tocar('acerto');
      }
      if (acertou || b.t <= 0 || b.img.x < 0 || b.img.x > TELA_L || b.img.y < 90 || b.img.y > TELA_A) {
        b.img.destroy();
        return false;
      }
      return true;
    });
  }
}

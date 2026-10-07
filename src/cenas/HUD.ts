import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { D, item, arma, ativo, infoAndar, raridade, personagem } from '../dados';
import { Estado } from '../estado';
import { Masmorra } from '../sistemas/Masmorra';
import { resumoEtiquetas } from '../sistemas/Itens';
import { Opcoes, salvarOpcoes } from '../opcoes';
import { Som } from '../som';
import { texturaPersonagem, personagemValido } from '../arte/personagens';
import type { Jogo } from './Jogo';
import { MALDICOES, desafio, LIMITE_RELOGIO, codigoSemente } from '../sistemas/Regras';

const FAIXA = 48;

const COR_SALA: Record<string, number> = {
  tesouro: 0xffd23f,
  loja: 0x7fdc8a,
  castical: 0xff9a2e,
  escada: 0xb08cff,
  chefe: 0xe2452b,
  descanso: 0x9fd0ff,
  secreta: 0xc86bff,
  desafio: 0xff3050,
  fonte: 0x7fd7ff,
  troca: 0xb06bff,
  amigo: 0xff8ac8,
  forja: 0xff7a3d,
  cassino: 0xff5a7a,
};

type Texto = Phaser.GameObjects.Text;

export class HUD extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private txtChama!: Texto;
  private txtCera!: Texto;
  private txtAndar!: Texto;
  private txtMaldicao!: Texto; // maldição do andar / relógio do desafio
  private txtPrompt!: Texto;
  private txtBannerTitulo!: Texto;
  private txtBannerTexto!: Texto;
  private txtChefe!: Texto;
  private txtCombo!: Texto;
  private txtArma!: Texto;
  private txtMunicao!: Texto;
  private txtReserva!: Texto;
  private txtAviso!: Texto;
  private txtFps!: Texto;
  private iconeArma!: Phaser.GameObjects.Image;
  private slots: { img: Phaser.GameObjects.Image; num: Texto }[] = [];
  private mira!: Phaser.GameObjects.Image;
  private icones: Phaser.GameObjects.Image[] = [];
  private qtdReliquias = -1;
  private ultimoCombo = 0;
  private armaMostrada = '';
  private painelPausa: Phaser.GameObjects.Container | null = null;
  // botões do menu de pausa (teclado: W/S e ENTER; mouse: passar por cima e clicar)
  private botoesPausa: { fundo: Phaser.GameObjects.Rectangle; texto: Texto; rotulo: () => string; acao: () => void }[] = [];
  private selPausa = 0;
  private confirmarPausa = '';
  private txtFrenesi!: Texto;
  private txtParry!: Texto;
  private iconeAtivo!: Phaser.GameObjects.Image;
  private txtAtivo!: Texto;
  private ativoMostrado = '';
  private txtDica!: Texto;
  private txtQuase!: Texto;
  private txtInstrucao!: Texto;
  private txtToastTitulo!: Texto;
  private txtToastTexto!: Texto;

  constructor() {
    super('HUD');
  }

  create() {
    const estilo = (tam: number, cor = CORES.texto): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: 4,
    });
    this.g = this.add.graphics();
    this.add.image(24, 24, 'vela_item').setScale(3);
    this.add.image(330, 24, 'gota').setScale(3);
    this.txtChama = this.add.text(56, 16, '', estilo(16)).setDepth(2);
    this.txtCera = this.add.text(352, 16, '', estilo(16, CORES.cera));
    this.txtAndar = this.add.text(470, 16, '', estilo(16, CORES.textoApagado));
    this.txtMaldicao = this.add.text(470, 36, '', estilo(8, '#c86bff'));
    this.txtPrompt = this.add.text(TELA_L / 2, TELA_A - 128, '', estilo(16)).setOrigin(0.5);
    this.txtBannerTitulo = this.add.text(TELA_L / 2, 120, '', estilo(24)).setOrigin(0.5);
    this.txtBannerTexto = this.add.text(TELA_L / 2, 158, '', { ...estilo(16), align: 'center', wordWrap: { width: TELA_L - 120 } }).setOrigin(0.5, 0);
    this.txtChefe = this.add.text(TELA_L / 2, FAIXA + 16, '', estilo(16, CORES.perigo)).setOrigin(0.5);
    this.txtCombo = this.add.text(TELA_L - 16, FAIXA + 14, '', estilo(24, CORES.ouro)).setOrigin(1, 0);
    this.txtFps = this.add.text(8, FAIXA + 8, '', estilo(8, CORES.textoApagado));
    this.txtFrenesi = this.add.text(TELA_L - 16, FAIXA + 46, '', estilo(16, CORES.perigo)).setOrigin(1, 0);
    this.txtParry = this.add.text(48 + 92, 10 + 22 + 3, 'PARRY', estilo(8, CORES.ouro));

    // ---- painel da arma (canto de baixo, direita) ----
    const px = TELA_L - 300;
    const py = TELA_A - 88;
    this.iconeArma = this.add.image(px + 44, py + 40, 'arma_pistola').setScale(4);
    this.txtArma = this.add.text(px + 92, py + 10, '', estilo(16, CORES.chama));
    this.txtMunicao = this.add.text(px + 92, py + 34, '', estilo(24));
    this.txtReserva = this.add.text(px + 92, py + 62, '', estilo(8, CORES.textoApagado));
    this.txtAviso = this.add.text(TELA_L - 16, py - 54, '', estilo(16)).setOrigin(1, 0.5);
    this.slots = [0, 1, 2].map((i) => ({
      img: this.add.image(px + 30 + i * 52, py - 20, 'arma_pistola').setScale(2),
      num: this.add.text(px + 8 + i * 52, py - 32, `${i + 1}`, estilo(8, CORES.textoApagado)),
    }));

    // ---- item ativo (ao lado do painel da arma) ----
    this.iconeAtivo = this.add.image(px - 52, py + 34, 'pixel').setScale(3).setVisible(false);
    this.txtAtivo = this.add.text(px - 52, py + 70, '', estilo(8, CORES.textoApagado)).setOrigin(0.5);
    this.ativoMostrado = '';
    // ---- etiquetas do item novo (e "falta 1 para uma sinergia") ----
    this.txtDica = this.add.text(TELA_L / 2, 196, '', estilo(8, CORES.ouro)).setOrigin(0.5);
    this.txtQuase = this.add.text(TELA_L / 2, 214, '', estilo(8, '#7fdc8a')).setOrigin(0.5);
    // ---- tutorial ----
    this.txtInstrucao = this.add.text(TELA_L / 2, TELA_A - 160, '', { ...estilo(16, CORES.texto), align: 'center', wordWrap: { width: TELA_L - 140 } }).setOrigin(0.5);
    // ---- conquista desbloqueada ----
    // fica embaixo, acima do texto de interação, para não brigar com os avisos do meio da tela
    this.txtToastTitulo = this.add.text(TELA_L / 2, TELA_A - 196, '', estilo(16, CORES.ouro)).setOrigin(0.5).setDepth(13);
    this.txtToastTexto = this.add.text(TELA_L / 2, TELA_A - 172, '', estilo(8, CORES.texto)).setOrigin(0.5).setDepth(13);
    this.mira = this.add.image(0, 0, 'mira').setScale(2).setDepth(20);
    this.icones = [];
    this.qtdReliquias = -1;
    this.ultimoCombo = 0;
    this.armaMostrada = '';
    this.painelPausa = null;
    this.botoesPausa = [];
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.teclaPausa(e));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
  }

  update(_t: number, delta: number) {
    const run = Estado.run;
    if (!run) return;
    const dt = delta / 1000;
    const g = this.g;
    g.clear();

    // ---- faixa de cima ----
    g.fillStyle(0x0d0912, 1).fillRect(0, 0, TELA_L, FAIXA);
    g.fillStyle(0x2a2033, 1).fillRect(0, FAIXA - 2, TELA_L, 2);

    // barra de chama
    const frac = Phaser.Math.Clamp(run.chama / run.stats.chamaMax, 0, 1);
    const bx = 48;
    const by = 10;
    const bw = 230;
    const bh = 22;
    g.fillStyle(0x1b1325, 1).fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    g.fillStyle(0x3a2418, 1).fillRect(bx, by, bw, bh);
    const pisca = frac < 0.25 ? 0.6 + 0.4 * Math.sin(this.time.now / 90) : 1;
    const cor = frac > 0.5 ? 0xffb43a : frac > 0.25 ? 0xff7a2e : 0xe2452b;
    g.fillStyle(cor, pisca).fillRect(bx, by, bw * frac, bh);
    g.fillStyle(0xffe066, 0.55 * pisca).fillRect(bx, by, bw * frac, 5);
    this.txtChama.setText(`${Math.ceil(run.chama)}/${Math.round(run.stats.chamaMax)}`).setPosition(bx + 8, by + 3);

    // cargas de dash
    const jogo = this.scene.get('Jogo') as unknown as { jogador?: { dashCargas: number } };
    const cargas = jogo.jogador?.dashCargas ?? 0;
    for (let i = 0; i < run.stats.dashes; i++) {
      g.fillStyle(i < cargas ? 0x7fd7ff : 0x2a3a4a, 1).fillRect(bx + i * 20, by + bh + 6, 16, 5);
    }

    const pp = Estado.parryPronto;
    const px0 = bx + 140;
    g.fillStyle(0x2a2033, 1).fillRect(px0, by + bh + 6, 50, 5);
    g.fillStyle(pp >= 1 ? 0xffe066 : 0x8a7a40, pp >= 1 ? 0.7 + 0.3 * Math.sin(this.time.now / 80) : 1).fillRect(px0, by + bh + 6, 50 * pp, 5);
    this.txtParry.setPosition(px0 - 48, by + bh + 4).setAlpha(pp >= 1 ? 1 : 0.4);

    this.txtCera.setText(`${run.cera}`);
    const ia = infoAndar(run.andar);
    // embaixo do andar: a maldição e, no Contra o Relógio, o tempo que falta
    const partes: string[] = [];
    if (run.maldicao && MALDICOES[run.maldicao]) partes.push(MALDICOES[run.maldicao].nome.toUpperCase());
    if (run.desafio === 'relogio') {
      const falta = Math.max(0, LIMITE_RELOGIO - run.tempo);
      partes.push(`FALTAM ${Math.floor(falta / 60)}:${Math.floor(falta % 60).toString().padStart(2, '0')}`);
    }
    this.txtMaldicao.setText(partes.join(' · ')).setColor(run.desafio === 'relogio' && run.tempo > LIMITE_RELOGIO - 120 && !run.maldicao ? CORES.perigo : '#c86bff');
    this.txtAndar.setText(run.estudio ? 'O ESTÚDIO' : run.modo === 'tutorial' ? 'TUTORIAL' : run.modo === 'diario' ? `DIÁRIO · ${ia.rotulo}` : ia.rotulo).setColor(ia.capitulo === 3 ? '#ffd0a0' : ia.capitulo > 1 ? '#c86bff' : CORES.textoApagado);
    this.desenharMinimapa(g);
    this.desenharArma(g);
    this.desenharAtivo(g);
    this.desenharToast(dt);

    // ---- combo ----
    const frenesi = run.combo >= D.config.frenesi.combo;
    if (run.combo >= 2) {
      this.txtCombo.setText(`COMBO x${run.combo}`).setAlpha(Phaser.Math.Clamp(run.comboT, 0, 1));
      if (run.combo !== this.ultimoCombo) this.txtCombo.setScale(1.5);
      else this.txtCombo.setScale(Math.max(1 + Estado.pulso * 0.12, this.txtCombo.scale - dt * 3));
      // no frenesi o combo troca de cor sem parar
      this.txtCombo.setColor(frenesi ? `hsl(${Math.floor(this.time.now / 3) % 360}, 90%, 65%)` : CORES.ouro);
    } else this.txtCombo.setText('');
    this.txtFrenesi.setText(frenesi ? 'FRENESI!' : '').setAlpha(0.6 + 0.4 * Math.sin(this.time.now / 70));
    this.ultimoCombo = run.combo;

    // ---- itens (canto de baixo, esquerda; quebra em duas linhas) ----
    if (run.itens.length !== this.qtdReliquias) {
      this.qtdReliquias = run.itens.length;
      this.icones.forEach((i) => i.destroy());
      // mostra só os 28 mais recentes (com o menu de desenvolvedor dá para ter centenas)
      const ultimos = run.itens.slice(-28);
      this.icones = ultimos.map((id, i) =>
        this.add.image(22 + (i % 14) * 32, TELA_A - 20 - Math.floor(i / 14) * 32, `icone_${id}`).setScale(2),
      );
      // o ícone novo dá um pulinho
      const ultimo = this.icones[this.icones.length - 1];
      if (ultimo) this.tweens.add({ targets: ultimo, scale: 3, duration: 150, yoyo: true });
    }

    this.txtPrompt.setText(Estado.prompt);

    // ---- banner ----
    const b = Estado.banner;
    if (b) {
      b.vida -= dt;
      const a = Phaser.Math.Clamp(b.vida * 2, 0, 1);
      this.txtBannerTitulo.setText(b.titulo).setColor(b.cor).setAlpha(a);
      // textos compridos (armas e itens novos) ficam menores e quebram a linha
      this.txtBannerTexto.setFontSize(b.texto.length > 50 ? 12 : 16).setText(b.texto).setAlpha(a);
      this.txtBannerTexto.setY(b.titulo ? 146 : 120);
      if (b.vida <= 0) Estado.banner = null;
    } else {
      this.txtBannerTitulo.setText('');
      this.txtBannerTexto.setText('');
    }

    // ---- aviso curto (munição, troca de arma) ----
    const av = Estado.aviso;
    if (av) {
      av.vida -= dt;
      this.txtAviso.setText(av.texto).setColor(av.cor).setAlpha(Phaser.Math.Clamp(av.vida * 2, 0, 1));
      if (av.vida <= 0) Estado.aviso = null;
    } else this.txtAviso.setText('');

    // ---- vida do chefe ----
    const c = Estado.chefe;
    if (c) {
      const w = 520;
      const x = (TELA_L - w) / 2;
      const y = FAIXA + 34;
      g.fillStyle(0x1b1325, 1).fillRect(x - 3, y - 3, w + 6, 18);
      g.fillStyle(0x3a1820, 1).fillRect(x, y, w, 12);
      g.fillStyle(0xe2452b, 1).fillRect(x, y, (w * c.vida) / c.max, 12);
      this.txtChefe.setText(c.nome);
    } else this.txtChefe.setText('');

    this.desenharPopups();

    // ---- dica de etiquetas ----
    const dica = Estado.dica;
    if (dica) {
      dica.vida -= dt;
      const a = Phaser.Math.Clamp(dica.vida * 2, 0, 1);
      this.txtDica.setText(dica.linha).setAlpha(a);
      this.txtQuase.setText(dica.quase).setAlpha(a * (0.7 + 0.3 * Math.sin(this.time.now / 120)));
      if (dica.vida <= 0) Estado.dica = null;
    } else {
      this.txtDica.setText('');
      this.txtQuase.setText('');
    }
    this.txtInstrucao.setText(Estado.instrucao).setAlpha(0.85 + 0.15 * Math.sin(this.time.now / 300));

    // ---- pouca chama: bordas vermelhas pulsando ----
    if (frac < 0.3 && !Estado.pausado) {
      const forca = (0.3 - frac) / 0.3;
      const a = (0.12 + 0.18 * forca) * (0.6 + 0.4 * Math.sin(this.time.now / (frac < 0.15 ? 70 : 140)));
      for (let i = 0; i < 4; i++) {
        const e = 10 + i * 10;
        g.fillStyle(0xe2452b, a * (1 - i * 0.22));
        g.fillRect(0, FAIXA, TELA_L, e - i * 8);
        g.fillRect(0, TELA_A - e + i * 8, TELA_L, e - i * 8);
        g.fillRect(0, FAIXA, e - i * 8, TELA_A - FAIXA);
        g.fillRect(TELA_L - e + i * 8, FAIXA, e - i * 8, TELA_A - FAIXA);
      }
    }
    // ---- câmera lenta: tom azulado ----
    if (Estado.camaraLenta) g.fillStyle(0x4fa8ff, 0.08).fillRect(0, FAIXA, TELA_L, TELA_A - FAIXA);

    // ---- pausa ----
    if (Estado.pausado && !this.painelPausa) this.montarPainelPausa();
    if (!Estado.pausado && this.painelPausa) {
      this.painelPausa.destroy(true);
      this.painelPausa = null;
      this.botoesPausa = [];
    }

    // ---- mira do mouse ----
    const p = this.input.activePointer;
    this.mira.setVisible(Estado.usandoMouse && !Estado.pausado).setPosition(p.x, p.y);

    this.txtFps.setText(Opcoes.mostrarFps ? `${Math.round(this.game.loop.actualFps)} FPS` : '');
  }

  /** Números de dano e textos (PARRY!, ESQUIVA!) que saltam de onde aconteceram. */
  private desenharPopups() {
    if (!Estado.popups.length) return;
    const cam = this.scene.get('Jogo').cameras.main;
    for (const p of Estado.popups) {
      const sx = (p.x - cam.worldView.x) * cam.zoom;
      const sy = (p.y - cam.worldView.y) * cam.zoom;
      const t = this.add
        .text(sx, sy, p.texto, { fontFamily: FONTE, fontSize: `${p.tam}px`, color: p.cor, stroke: '#07050b', strokeThickness: p.tam >= 24 ? 6 : 4 })
        .setOrigin(0.5)
        .setDepth(15)
        .setScale(1.7);
      this.tweens.add({ targets: t, scale: 1, duration: 110, ease: 'Back.out' });
      this.tweens.add({ targets: t, y: sy - (p.tam >= 24 ? 50 : 34), duration: 700, ease: 'Quad.out' });
      this.tweens.add({ targets: t, alpha: 0, delay: 420, duration: 300, onComplete: () => t.destroy() });
    }
    Estado.popups.length = 0;
  }

  private desenharArma(g: Phaser.GameObjects.Graphics) {
    const run = Estado.run!;
    const a = run.armas[run.armaAtual];
    const def = arma(a.id);
    const px = TELA_L - 300;
    const py = TELA_A - 88;
    g.fillStyle(0x0d0912, 0.85).fillRect(px, py, 288, 80);
    g.lineStyle(2, 0x2a2033, 1).strokeRect(px, py, 288, 80);

    if (this.armaMostrada !== def.id) {
      // nomes compridos usam letra menor para caber no painel
      this.armaMostrada = def.id;
      this.iconeArma.setTexture(def.sprite);
      this.txtArma.setFontSize(def.nome.length > 18 ? 8 : def.nome.length > 12 ? 12 : 16).setText(def.nome.toUpperCase()).setColor(def.raridade >= 2 ? raridade(def.raridade).cor : CORES.chama);
    }
    const max = Math.max(1, Math.round(def.pente * run.stats.pente));
    this.txtMunicao.setText(`${a.pente}/${max}`).setColor(a.pente === 0 ? CORES.perigo : CORES.texto);
    this.txtReserva.setText(a.reserva < 0 ? 'RESERVA INFINITA' : `RESERVA ${a.reserva}`);

    if (Estado.recarregando > 0) {
      g.fillStyle(0x2a2033, 1).fillRect(px + 200, py + 40, 76, 8);
      g.fillStyle(0xffb43a, 1).fillRect(px + 200, py + 40, 76 * Estado.recarregando, 8);
    }

    this.slots.forEach((s, i) => {
      const w = run.armas[i];
      s.img.setVisible(!!w);
      s.num.setVisible(!!w);
      if (!w) return;
      s.img.setTexture(arma(w.id).sprite).setAlpha(i === run.armaAtual ? 1 : 0.4);
      s.num.setColor(i === run.armaAtual ? CORES.chama : CORES.textoApagado);
    });
  }

  /** O item ativo: ícone, barrinhas de carga (uma por sala) e "C" quando está pronto. */
  private desenharAtivo(g: Phaser.GameObjects.Graphics) {
    const run = Estado.run!;
    const px = TELA_L - 300 - 92;
    const py = TELA_A - 88;
    if (!run.ativo) {
      this.iconeAtivo.setVisible(false);
      this.txtAtivo.setText('');
      return;
    }
    const def = ativo(run.ativo.id)!;
    if (this.ativoMostrado !== def.id) {
      this.ativoMostrado = def.id;
      this.iconeAtivo.setTexture(`icone_${def.id}`).setVisible(true);
      this.tweens.add({ targets: this.iconeAtivo, scale: 4.5, duration: 150, yoyo: true });
    }
    const pronto = run.ativo.carga >= def.carga;
    g.fillStyle(0x0d0912, 0.85).fillRect(px, py, 80, 80);
    g.lineStyle(2, pronto ? 0xffd23f : 0x2a2033, pronto ? 0.6 + 0.4 * Math.sin(this.time.now / 120) : 1).strokeRect(px, py, 80, 80);
    this.iconeAtivo.setAlpha(pronto ? 1 : 0.45);
    const seg = (72 - (def.carga - 1) * 2) / def.carga;
    for (let i = 0; i < def.carga; i++) {
      g.fillStyle(i < run.ativo.carga ? this.cor(def.cor) : 0x2a2033, 1).fillRect(px + 4 + i * (seg + 2), py + 60, seg, 5);
    }
    this.txtAtivo.setText(pronto ? '[C] USAR' : 'LIMPE SALAS').setColor(pronto ? CORES.ouro : CORES.textoApagado);
  }

  private cor(hex: string) {
    return Phaser.Display.Color.HexStringToColor(hex).color;
  }

  /** Conquista desbloqueada: aparece no canto e some sozinha. */
  private desenharToast(dt: number) {
    const t = Estado.toasts[0];
    if (!t) {
      this.txtToastTitulo.setText('');
      this.txtToastTexto.setText('');
      return;
    }
    if (t.vida === 5) this.tweens.add({ targets: [this.txtToastTitulo], scale: { from: 1.4, to: 1 }, duration: 250, ease: 'Back.out' });
    t.vida -= dt;
    const a = Phaser.Math.Clamp(Math.min(t.vida, 5 - t.vida) * 3, 0, 1);
    this.txtToastTitulo.setText(`CONQUISTA: ${t.titulo.toUpperCase()}`).setAlpha(a);
    this.txtToastTexto.setText(t.texto).setAlpha(a);
    if (t.vida <= 0) Estado.toasts.shift();
  }

  // ===================== menu de pausa =====================

  private get jogo() {
    return this.scene.get('Jogo') as Jogo;
  }

  private teclaPausa(e: KeyboardEvent) {
    if (!this.painelPausa || !this.botoesPausa.length || Estado.dev) return;
    const n = this.botoesPausa.length;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.selecionarPausa((this.selPausa + n - 1) % n);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.selecionarPausa((this.selPausa + 1) % n);
        break;
      case 'Enter':
      case 'Space':
        this.botoesPausa[this.selPausa].acao();
        break;
    }
  }

  private selecionarPausa(i: number, som = true) {
    if (som && i !== this.selPausa) Som.tocar('menu');
    if (i !== this.selPausa) this.confirmarPausa = '';
    this.selPausa = i;
    this.botoesPausa.forEach((b, k) => {
      const sel = k === i;
      b.texto.setText(b.rotulo()).setColor(sel ? CORES.chama : CORES.texto).setX(sel ? 58 : 50);
      b.fundo.setFillStyle(sel ? 0x2a1a10 : 0x140e1c, sel ? 0.95 : 0.8).setStrokeStyle(2, sel ? 0xffb43a : 0x3a2e48);
    });
  }

  /**
   * A pausa: à esquerda o menu (continuar, recomeçar, som, tremor, sair) e a ficha do
   * personagem; à direita a grade com os ícones dos itens (passe o mouse para ler) e as sinergias.
   */
  private montarPainelPausa() {
    const run = Estado.run!;
    const c = this.add.container(0, 0).setDepth(12);
    this.painelPausa = c;
    this.botoesPausa = [];
    this.selPausa = 0;
    this.confirmarPausa = '';
    const estilo = (tam: number, cor: string) => ({ fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: 4 });
    const H = TELA_A - FAIXA;

    // fundo escuro com as bordas ainda mais escuras
    c.add(this.add.rectangle(0, FAIXA, TELA_L, H, 0x07050b, 0.93).setOrigin(0));
    const vinheta = this.add.graphics();
    for (let i = 0; i < 6; i++) vinheta.fillStyle(0x000000, 0.08).fillRect(i * 6, FAIXA + i * 6, TELA_L - i * 12, H - i * 12);
    c.add(vinheta);
    const painel = (x: number, y: number, l: number, a: number) => {
      const r = this.add.rectangle(x, y, l, a, 0x120c1a, 1).setOrigin(0).setStrokeStyle(2, 0x3a2e48);
      const brilho = this.add.rectangle(x + 2, y + 2, l - 4, 2, 0xffb43a, 0.25).setOrigin(0);
      c.add([r, brilho]);
    };

    // ---------- coluna da esquerda: título e botões ----------
    const titulo = this.add.text(40, FAIXA + 18, 'PAUSADO', estilo(32, CORES.chama));
    c.add(titulo);
    this.tweens.add({ targets: titulo, alpha: 0.75, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const info = infoAndar(run.andar);
    c.add(this.add.text(42, FAIXA + 58, `${info.rotulo} · ${info.nome.toUpperCase()}`, estilo(8, CORES.textoApagado)));

    const tutorial = run.modo === 'tutorial';
    const opcoes: [() => string, () => void][] = [
      [() => 'CONTINUAR', () => this.jogo.alternarPausa()],
    ];
    if (run.modo === 'normal' && !run.estudio)
      opcoes.push([() => (this.confirmarPausa === 'recomecar' ? 'CERTEZA? (DE NOVO)' : 'RECOMEÇAR'), () => this.pedirConfirmacao('recomecar', () => this.jogo.recomecar())]);
    opcoes.push(
      [() => `SOM: ${Som.mudo ? 'MUDO' : 'LIGADO'}`, () => Som.alternarMudo()],
      [() => `TREMOR: ${Opcoes.tremor ? 'SIM' : 'NÃO'}`, () => {
        Opcoes.tremor = !Opcoes.tremor;
        salvarOpcoes();
      }],
      [() => (tutorial ? 'SAIR DO TUTORIAL' : 'SALVAR E SAIR'), () => this.jogo.sairParaMenu()],
    );
    const y0 = FAIXA + 90;
    opcoes.forEach(([rotulo, acao], i) => {
      const y = y0 + i * 42;
      const fundo = this.add.rectangle(36, y, 250, 34, 0x140e1c, 0.8).setOrigin(0).setStrokeStyle(2, 0x3a2e48).setInteractive({ useHandCursor: true });
      const texto = this.add.text(50, y + 17, rotulo(), estilo(16, CORES.texto)).setOrigin(0, 0.5);
      const b = {
        fundo, texto, rotulo,
        acao: () => {
          Som.tocar('confirmar');
          acao();
          if (this.painelPausa) this.selecionarPausa(this.selPausa, false);
        },
      };
      fundo.on('pointerover', () => this.selecionarPausa(i));
      fundo.on('pointerup', () => b.acao());
      c.add([fundo, texto]);
      this.botoesPausa.push(b);
    });

    // ---------- ficha do personagem ----------
    const fy = y0 + opcoes.length * 42 + 12;
    const fa = TELA_A - 40 - fy;
    painel(36, fy, 250, fa);
    const pid = personagemValido(run.personagem);
    const pers = personagem(pid);
    const retrato = this.add.sprite(76, fy + 64, texturaPersonagem(pid), 0).setOrigin(0.5, 1);
    retrato.setScale(Math.min(4, 52 / retrato.frame.realHeight));
    if (this.anims.exists(`heroi_${pid}_parado`)) retrato.play(`heroi_${pid}_parado`);
    c.add(retrato);
    c.add(this.add.text(112, fy + 14, pers.nome.toUpperCase(), estilo(16, pers.cor)));
    const min = Math.floor(run.tempo / 60);
    const seg = Math.floor(run.tempo % 60).toString().padStart(2, '0');
    const extra = [run.semente !== undefined ? `SEMENTE ${codigoSemente(run.semente)}` : '', run.desafio ? `DESAFIO: ${desafio(run.desafio)?.nome.toUpperCase()}` : ''].filter(Boolean);
    c.add(this.add.text(112, fy + 34, [`TEMPO ${min}:${seg} · CERA ${run.cera}`, ...extra].join('\n'), { ...estilo(8, CORES.textoApagado), lineSpacing: 4 }));
    const st = run.stats;
    const pct = (v: number) => `${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)}%`;
    const linhas: [string, string][] = [
      ['DANO', pct(st.dano)],
      ['VELOCIDADE', `${Math.round(st.velocidade)}`],
      ['CADÊNCIA', pct(2 - st.cadencia)],
      ['CHAMA MÁX', `${Math.round(st.chamaMax)}`],
      ['CRÍTICO', `${Math.round(st.critico * 100)}%`],
      ['SORTE', `${Math.round(st.sorte * 10) / 10}`],
    ];
    linhas.forEach(([k, v], i) => {
      const y = fy + 82 + i * 16;
      if (y > fy + fa - 30) return;
      c.add(this.add.text(50, y, k, estilo(8, CORES.textoApagado)));
      c.add(this.add.text(272, y, v, estilo(8, CORES.texto)).setOrigin(1, 0));
    });
    if (run.ativo) {
      const a = ativo(run.ativo.id)!;
      c.add(this.add.image(60, fy + fa - 16, `icone_${a.id}`).setScale(1.6));
      c.add(this.add.text(78, fy + fa - 22, `[C] ${a.nome.toUpperCase()}`, estilo(8, a.cor)));
    }

    // ---------- direita: itens ----------
    const gx = 310;
    const gl = TELA_L - gx - 36;
    const gy = FAIXA + 18;
    const ga = 300;
    painel(gx, gy, gl, ga);
    c.add(this.add.text(gx + 14, gy + 10, run.itens.length ? `ITENS (${run.itens.length})` : 'NENHUM ITEM AINDA', estilo(16, CORES.chama)));
    const etq = resumoEtiquetas(run.itens).slice(0, 8).map(([t, n]) => `${(D.tags[t] ?? t).toUpperCase()} ${n}`).join('  ');
    if (etq) c.add(this.add.text(gx + 14, gy + 34, 'ETIQUETAS: ' + etq, estilo(8, CORES.ouro)));

    // caixa de detalhe (o item embaixo do mouse; começa no mais recente)
    const dy = gy + ga - 64;
    c.add(this.add.rectangle(gx + 10, dy, gl - 20, 54, 0x07050b, 0.7).setOrigin(0).setStrokeStyle(1, 0x3a2e48));
    const dIcone = this.add.image(gx + 34, dy + 27, 'pixel').setScale(2.2).setVisible(false);
    const dNome = this.add.text(gx + 60, dy + 8, '', estilo(16, CORES.texto));
    const dDesc = this.add.text(gx + 60, dy + 30, '', { ...estilo(8, CORES.textoApagado), wordWrap: { width: gl - 90 } });
    const dTier = this.add.text(gx + gl - 20, dy + 10, '', estilo(8, CORES.textoApagado)).setOrigin(1, 0);
    c.add([dIcone, dNome, dDesc, dTier]);
    const detalhar = (id: string) => {
      const it = item(id);
      if (!it) return;
      const r = raridade(it.raridade);
      dIcone.setTexture(`icone_${id}`).setVisible(true);
      dNome.setText(it.nome.toUpperCase()).setColor(it.cor);
      dDesc.setText(it.desc);
      dTier.setText(r.nome.toUpperCase()).setColor(r.cor);
    };
    if (!run.itens.length) dDesc.setText('Pegue itens nos baús, nas lojas e nos chefes. Eles aparecem aqui.');

    const lado = 38;
    const porLinha = Math.floor((gl - 28) / lado);
    const linhasMax = Math.floor((ga - 64 - 64) / lado);
    const cabe = porLinha * linhasMax;
    const mostrar = run.itens.length > cabe ? run.itens.slice(-(cabe - 1)) : run.itens;
    const moldura = this.add.rectangle(0, 0, lado - 2, lado - 2).setStrokeStyle(2, 0xffb43a).setVisible(false);
    mostrar.forEach((id, i) => {
      const x = gx + 14 + (i % porLinha) * lado + lado / 2;
      const y = gy + 56 + Math.floor(i / porLinha) * lado + lado / 2;
      const it = item(id);
      const casa = this.add.rectangle(x, y, lado - 4, lado - 4, 0x1c1428, 1).setStrokeStyle(1, it ? Phaser.Display.Color.HexStringToColor(raridade(it.raridade).cor).color : 0x3a2e48, 0.6);
      casa.setInteractive();
      casa.on('pointerover', () => {
        detalhar(id);
        moldura.setPosition(x, y).setVisible(true);
      });
      c.add([casa, this.add.image(x, y, `icone_${id}`).setScale(1.8)]);
    });
    if (run.itens.length > cabe) {
      const i = mostrar.length;
      c.add(this.add.text(gx + 14 + (i % porLinha) * lado + lado / 2, gy + 56 + Math.floor(i / porLinha) * lado + lado / 2, `+${run.itens.length - mostrar.length}`, estilo(8, CORES.textoApagado)).setOrigin(0.5));
    }
    c.add(moldura);
    if (run.itens.length) detalhar(run.itens[run.itens.length - 1]);

    // ---------- direita, embaixo: sinergias e transformações ----------
    const sy = gy + ga + 12;
    const sa = TELA_A - 40 - sy;
    painel(gx, sy, gl, sa);
    const trans = new Set(D.sinergias.filter((x) => x.familia).map((x) => x.id));
    c.add(this.add.text(gx + 14, sy + 10, run.sinergias.length ? `SINERGIAS (${run.sinergias.length})` : 'NENHUMA SINERGIA AINDA', estilo(16, CORES.ouro)));
    if (!run.sinergias.length) c.add(this.add.text(gx + 14, sy + 36, 'Junte itens com as mesmas etiquetas (veja no topo dos itens) para liberar sinergias.', { ...estilo(8, CORES.textoApagado), wordWrap: { width: gl - 28 } }));
    const cabeS = Math.max(1, Math.floor((sa - 40) / 18));
    run.sinergias.slice(-cabeS).forEach((sid, i) => {
      const sd = D.sinergias.find((x) => x.id === sid);
      if (!sd) return;
      const t = trans.has(sid);
      const txt = this.add.text(gx + 14, sy + 36 + i * 18, `${t ? 'TRANSFORMAÇÃO · ' : ''}${sd.nome.toUpperCase()}: ${sd.desc}`, estilo(8, t ? '#c86bff' : CORES.texto));
      if (txt.width > gl - 28) txt.setText(txt.text.slice(0, Math.floor(((gl - 28) / txt.width) * txt.text.length) - 3) + '...');
      c.add(txt);
    });

    // rodapé
    c.add(this.add.text(TELA_L / 2, TELA_A - 20, `W/S escolher · ENTER confirmar · ESC/P continuar · X sair · M som${Opcoes.dev ? ' · F2 menu dev' : ''}`, estilo(8, CORES.textoApagado)).setOrigin(0.5));

    this.selecionarPausa(0, false);
    // entrada suave
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 140 });
  }

  /** Ações perigosas pedem um segundo ENTER/clique. */
  private pedirConfirmacao(chave: string, acao: () => void) {
    if (this.confirmarPausa === chave) {
      this.confirmarPausa = '';
      acao();
    } else this.confirmarPausa = chave;
  }

  private desenharMinimapa(g: Phaser.GameObjects.Graphics) {
    const m: Masmorra | null = Estado.masmorra;
    if (!m) return;
    // Maldição do Perdido: só a sala onde você está, piscando
    if (Estado.run?.maldicao === 'perdido') {
      const x = TELA_L - m.largura * 22 - 8 + 4 * 22;
      g.fillStyle(0xc86bff, 0.5 + 0.5 * Math.sin(this.time.now / 200)).fillRect(x, 2 + 2 * 8, 18, 6);
      return;
    }
    const passoX = 22;
    const passoY = 8;
    const x0 = TELA_L - m.largura * passoX - 8;
    const y0 = 2;
    for (const sala of m.salas.values()) {
      if (!sala.conhecida) continue;
      const x = x0 + sala.gx * passoX;
      const y = y0 + sala.gy * passoY;
      const atual = sala === Estado.sala;
      const cor = atual ? 0xfff4d6 : sala.visitada ? 0x6e5a7e : 0x2f2540;
      g.fillStyle(cor, 1).fillRect(x, y, passoX - 4, passoY - 2);
      const especial = COR_SALA[sala.tipo];
      if (especial !== undefined) g.fillStyle(especial, 1).fillRect(x + 6, y + 1, 6, 4);
      else if (sala.escura && sala.conhecida) g.fillStyle(0x000000, 0.6).fillRect(x + 7, y + 2, 4, 3);
    }
  }
}

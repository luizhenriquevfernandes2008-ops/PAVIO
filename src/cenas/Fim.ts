import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { item as acharItem } from '../dados';
import { Som } from '../som';
import { Opcoes } from '../opcoes';
import { personagemValido, texturaPersonagem } from '../arte/personagens';
import { fundoMasmorra } from './fundo';
import { codigoSemente } from '../sistemas/Regras';

interface DadosFim {
  vitoria: boolean;
  andar: number;
  mortes: number;
  tempo: number;
  ganho: number;
  reliquias: number;
  combo: number;
  armas: string[];
  itens?: string[];
  sinergias?: string[];
  titulo?: string;
  diario?: { pontos: number; recorde: number };
  personagem?: string;
  grafico?: number[]; // chama (%) a cada 3 segundos
  quase?: { pct: number; tempo: number; andar: number };
  semente?: number;
  desafio?: string;
  desafioPremio?: number;
}

/** O resumo da partida: números, o gráfico da chama, o quase-apagão, a build e um print para mandar aos amigos. */
export class Fim extends Phaser.Scene {
  private grafico!: Phaser.GameObjects.Graphics;
  private progresso = 0;
  private dados!: DadosFim;

  constructor() {
    super('Fim');
  }

  create(d: DadosFim) {
    this.dados = d;
    this.progresso = 0;
    const cx = TELA_L / 2;
    this.cameras.main.fadeIn(500);
    fundoMasmorra(this, { escuridao: d.vitoria ? 0.75 : 0.9, monstros: !d.vitoria })(200, 260, d.vitoria ? 360 : 200);
    Som.musica(d.vitoria ? 'vitoria' : 'derrota');
    this.add.rectangle(0, 0, TELA_L, TELA_A, 0x07050b, 0.45).setOrigin(0);

    const estilo = (tam: number, cor: string): Phaser.Types.GameObjects.Text.TextStyle => ({
      fontFamily: FONTE, fontSize: `${tam}px`, color: cor, stroke: '#07050b', strokeThickness: Math.max(4, tam / 4), align: 'center', lineSpacing: 12,
    });
    const painel = (x: number, y: number, l: number, a: number) => {
      this.add.rectangle(x, y, l, a, 0x120c1a, 0.94).setOrigin(0).setStrokeStyle(2, 0x3a2e48);
      this.add.rectangle(x + 2, y + 2, l - 4, 2, 0xffb43a, 0.25).setOrigin(0);
    };

    // ---- título ----
    const titulo = d.titulo ?? (d.vitoria ? 'A CHAMA VENCEU!' : 'A CHAMA SE APAGOU');
    this.add.text(cx, 44, titulo, { ...estilo(titulo.length > 22 ? 24 : 32, d.vitoria ? CORES.ouro : CORES.perigo), strokeThickness: 10 }).setOrigin(0.5);
    const sub = [d.semente !== undefined ? `SEMENTE ${codigoSemente(d.semente)}` : '', d.desafio ? `DESAFIO: ${d.desafio.toUpperCase()}${d.desafioPremio ? ` (+${d.desafioPremio})` : ''}` : ''].filter(Boolean).join('   ·   ');
    if (sub) this.add.text(cx, 82, sub, estilo(8, CORES.textoApagado)).setOrigin(0.5);

    // ---- esquerda: o personagem e os números ----
    painel(32, 104, 340, 340);
    const id = personagemValido(d.personagem ?? Opcoes.personagem);
    const vela = this.add.sprite(100, 250, texturaPersonagem(id), 0).setOrigin(0.5, 1);
    vela.setScale(5 * Math.min(1, 18 / vela.frame.realHeight));
    if (d.vitoria && this.anims.exists(`heroi_${id}_parado`)) vela.play(`heroi_${id}_parado`);
    else if (!d.vitoria) vela.setTint(0x555555).setAlpha(0.6).setAngle(90).setY(236);
    const min = Math.floor(d.tempo / 60);
    const seg = Math.floor(d.tempo % 60).toString().padStart(2, '0');
    const linhas: [string, string][] = [
      ['ANDAR', `${d.andar}`],
      ['MONSTROS', `${d.mortes}`],
      ['MELHOR COMBO', `x${d.combo}`],
      ['ITENS', `${d.reliquias}`],
      ['SINERGIAS', `${d.sinergias?.length ?? 0}`],
      ['TEMPO', `${min}:${seg}`],
    ];
    linhas.forEach(([k, v], i) => {
      const y = 130 + i * 30;
      const t1 = this.add.text(170, y, k, estilo(8, CORES.textoApagado)).setOrigin(0, 0.5).setAlpha(0);
      const t2 = this.add.text(352, y, v, estilo(16, CORES.texto)).setOrigin(1, 0.5).setAlpha(0);
      this.tweens.add({ targets: [t1, t2], alpha: 1, delay: 200 + i * 90, duration: 200 });
    });
    this.add.text(202, 318, `ARMAS: ${d.armas.join(', ')}`, { ...estilo(8, CORES.textoApagado), wordWrap: { width: 320 } }).setOrigin(0.5, 0);
    if (d.diario) {
      const novo = d.diario.pontos >= d.diario.recorde;
      this.add.text(202, 380, `DIÁRIO: ${d.diario.pontos} pontos\n${novo ? 'NOVO RECORDE DO DIA!' : `recorde de hoje: ${d.diario.recorde}`}`, estilo(8, CORES.ouro)).setOrigin(0.5, 0);
    }

    // ---- direita: o gráfico da chama ----
    painel(392, 104, 536, 196);
    this.add.text(408, 116, 'SUA CHAMA', estilo(16, CORES.chama)).setOrigin(0, 0);
    this.grafico = this.add.graphics();
    const q = d.quase;
    if (q && (d.grafico?.length ?? 0) > 1) {
      const qm = Math.floor(q.tempo / 60);
      const qs = Math.floor(q.tempo % 60).toString().padStart(2, '0');
      this.add.text(912, 120, `QUASE APAGOU: ${q.pct}% · andar ${q.andar} · ${qm}:${qs}`, estilo(8, q.pct < 15 ? CORES.perigo : CORES.textoApagado)).setOrigin(1, 0);
    } else this.add.text(912, 120, 'Partida curta demais para o gráfico.', estilo(8, CORES.textoApagado)).setOrigin(1, 0);
    this.tweens.add({ targets: this, progresso: 1, duration: 1400, delay: 300, ease: 'Cubic.out' });

    // ---- direita, embaixo: a build ----
    painel(392, 312, 536, 132);
    this.add.text(408, 324, 'A BUILD', estilo(16, CORES.ouro)).setOrigin(0, 0);
    const itens = d.itens ?? [];
    const dica = this.add.text(912, 328, '', estilo(8, CORES.texto)).setOrigin(1, 0);
    const porLinha = 15;
    const mostrar = itens.slice(-porLinha * 2);
    mostrar.forEach((iid, i) => {
      const x = 424 + (i % porLinha) * 34;
      const y = 370 + Math.floor(i / porLinha) * 36;
      const icone = this.add.image(x, y, `icone_${iid}`).setScale(1.9).setAlpha(0).setInteractive();
      icone.on('pointerover', () => dica.setText(acharItem(iid)?.nome.toUpperCase() ?? '').setColor(acharItem(iid)?.cor ?? CORES.texto));
      this.tweens.add({ targets: icone, alpha: 1, delay: 500 + i * 40, duration: 200 });
    });
    if (!itens.length) this.add.text(408, 370, 'Nenhum item desta vez.', estilo(8, CORES.textoApagado)).setOrigin(0, 0.5);
    if (itens.length > mostrar.length) this.add.text(912, 428, `+${itens.length - mostrar.length} itens`, estilo(8, CORES.textoApagado)).setOrigin(1, 0.5);

    // ---- cera dourada e botões ----
    const ganho = this.add.text(cx, 488, `+${d.ganho} cera dourada`, estilo(24, CORES.ouro)).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: ganho, scale: 1, duration: 500, delay: 700, ease: 'Back.out' });
    const print = this.add.text(cx - 160, 560, '[S] SALVAR IMAGEM', estilo(16, CORES.texto)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const voltarTxt = this.add.text(cx + 170, 560, '[ENTER] VOLTAR', estilo(16, CORES.textoApagado)).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: voltarTxt, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    print.on('pointerover', () => print.setColor(CORES.chama));
    print.on('pointerout', () => print.setColor(CORES.texto));
    const aviso = this.add.text(cx, 596, '', estilo(8, '#7fdc8a')).setOrigin(0.5);

    // tira um print da tela e baixa (para mandar no grupo)
    const salvar = () => {
      Som.tocar('compra');
      print.setVisible(false);
      voltarTxt.setVisible(false);
      this.game.renderer.snapshot((img) => {
        print.setVisible(true);
        voltarTxt.setVisible(true);
        const a = document.createElement('a');
        a.href = (img as HTMLImageElement).src;
        a.download = `pavio-partida-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        aviso.setText('IMAGEM SALVA! (pasta de downloads)');
      });
    };

    // pequena espera para ninguém pular a tela sem querer
    this.time.delayedCall(900, () => {
      let foi = false;
      const voltar = () => {
        if (foi) return;
        foi = true;
        Som.tocar('confirmar');
        Som.musica('menu');
        this.scene.start('Menu');
      };
      this.input.keyboard!.once('keydown-ENTER', voltar);
      this.input.keyboard!.once('keydown-SPACE', voltar);
      this.input.keyboard!.on('keydown-S', salvar);
      voltarTxt.on('pointerdown', voltar);
      print.on('pointerdown', salvar);
    });
  }

  update() {
    this.desenharGrafico();
  }

  /** A linha da chama, desenhada da esquerda para a direita, com a zona de perigo e o quase-apagão. */
  private desenharGrafico() {
    const g = this.grafico;
    const dados = this.dados.grafico ?? [];
    g.clear();
    const x0 = 412;
    const y0 = 148;
    const l = 500;
    const a = 136;
    // zona de perigo (menos de 30%)
    g.fillStyle(0xe2452b, 0.12).fillRect(x0, y0 + a * 0.7, l, a * 0.3);
    g.lineStyle(1, 0x3a2e48, 1).strokeRect(x0, y0, l, a);
    for (const f of [0.25, 0.5, 0.75]) g.lineStyle(1, 0x3a2e48, 0.5).lineBetween(x0, y0 + a * f, x0 + l, y0 + a * f);
    if (dados.length < 2) return;
    const n = Math.max(2, Math.floor(dados.length * this.progresso));
    const px = (i: number) => x0 + (i / (dados.length - 1)) * l;
    const py = (v: number) => y0 + a - (Math.min(100, Math.max(0, v)) / 100) * a;
    // área embaixo
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(px(0), y0 + a)];
    for (let i = 0; i < n; i++) pts.push(new Phaser.Math.Vector2(px(i), py(dados[i])));
    pts.push(new Phaser.Math.Vector2(px(n - 1), y0 + a));
    g.fillStyle(0xffb43a, 0.18).fillPoints(pts, true);
    // a linha (vermelha quando a chama estava baixa)
    for (let i = 1; i < n; i++) {
      const baixa = dados[i] < 30;
      g.lineStyle(2, baixa ? 0xff5a4a : 0xffd23f, 1).lineBetween(px(i - 1), py(dados[i - 1]), px(i), py(dados[i]));
    }
    // o ponto do quase-apagão
    const q = this.dados.quase;
    if (q && this.progresso > 0.98) {
      const i = Math.min(dados.length - 1, Math.round((q.tempo / Math.max(1, this.dados.tempo)) * (dados.length - 1)));
      const pulso = 4 + Math.sin(this.time.now / 150) * 2;
      g.fillStyle(0xff5a4a, 1).fillCircle(px(i), py(q.pct), pulso);
      g.lineStyle(1, 0xff5a4a, 0.6).strokeCircle(px(i), py(q.pct), pulso + 5);
    }
  }
}

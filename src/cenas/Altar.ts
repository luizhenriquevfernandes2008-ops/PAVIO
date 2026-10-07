import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { D } from '../dados';
import { Estado, nivelAltar, salvarMeta } from '../estado';
import { Som } from '../som';
import { fundoMasmorra } from './fundo';

/** Melhorias permanentes compradas com cera dourada (ganha ao fim de cada partida). */
export class Altar extends Phaser.Scene {
  private sel = 0;
  private linhas: Phaser.GameObjects.Text[] = [];
  private descs: Phaser.GameObjects.Text[] = [];
  private txtCera!: Phaser.GameObjects.Text;

  constructor() {
    super('Altar');
  }

  create() {
    this.sel = 0;
    const cx = TELA_L / 2;
    fundoMasmorra(this, { escuridao: 0.88, monstros: false })(cx, 320, 560);
    Som.musica('menu');
    this.add.text(cx, 56, 'ALTAR DE CERA', { fontFamily: FONTE, fontSize: '32px', color: CORES.ouro, stroke: '#1b1325', strokeThickness: 8 }).setOrigin(0.5);
    this.add
      .text(cx, 100, 'Melhorias permanentes para todas as partidas', { fontFamily: FONTE, fontSize: '16px', color: CORES.textoApagado })
      .setOrigin(0.5);
    this.txtCera = this.add.text(cx, 140, '', { fontFamily: FONTE, fontSize: '16px', color: CORES.ouro }).setOrigin(0.5);

    this.linhas = [];
    this.descs = [];
    D.config.altar.forEach((_up, i) => {
      const y = 200 + i * 80;
      this.linhas.push(
        this.add
          .text(120, y, '', { fontFamily: FONTE, fontSize: '16px', color: CORES.texto })
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => this.selecionar(i))
          .on('pointerdown', () => this.comprar(i)),
      );
      this.descs.push(this.add.text(152, y + 26, '', { fontFamily: FONTE, fontSize: '16px', color: CORES.textoApagado }));
    });
    this.add
      .text(cx, TELA_A - 40, 'ENTER comprar   ESC voltar', { fontFamily: FONTE, fontSize: '16px', color: CORES.textoApagado })
      .setOrigin(0.5);

    const kb = this.input.keyboard!;
    const n = D.config.altar.length;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.selecionar((this.sel + n - 1) % n);
      else if (['ArrowDown', 'KeyS'].includes(e.code)) this.selecionar((this.sel + 1) % n);
      else if (['Enter', 'Space', 'KeyJ'].includes(e.code)) this.comprar(this.sel);
      else if (['Escape', 'Backspace'].includes(e.code)) {
        Som.tocar('voltar');
        this.scene.start('Menu');
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.removeAllListeners('keydown'));
    this.atualizar();
  }

  private selecionar(i: number) {
    if (i !== this.sel) Som.tocar('menu');
    this.sel = i;
    this.atualizar();
  }

  private comprar(i: number) {
    const up = D.config.altar[i];
    const meta = Estado.meta;
    const nivel = nivelAltar(meta, up.id);
    const custo = up.custo[nivel];
    if (custo === undefined || meta.ceraDourada < custo) {
      Som.tocar('erro');
      return;
    }
    meta.ceraDourada -= custo;
    meta.niveis[up.id] = nivel + 1;
    salvarMeta(meta);
    Som.tocar('acender');
    this.atualizar();
  }

  private atualizar() {
    const meta = Estado.meta;
    this.txtCera.setText(`Cera dourada: ${meta.ceraDourada}`);
    D.config.altar.forEach((up, i) => {
      const nivel = nivelAltar(meta, up.id);
      const max = up.custo.length;
      const pips = `[${nivel}/${max}]`;
      const custo = nivel >= max ? 'COMPLETO' : `${up.custo[nivel]} cera`;
      const marcador = i === this.sel ? '> ' : '  ';
      this.linhas[i].setText(`${marcador}${up.nome}  ${pips}  ${custo}`);
      const podeComprar = nivel < max && meta.ceraDourada >= up.custo[nivel];
      this.linhas[i].setColor(i === this.sel ? CORES.chama : podeComprar ? CORES.texto : CORES.textoApagado);
      this.descs[i].setText(up.desc);
    });
  }
}

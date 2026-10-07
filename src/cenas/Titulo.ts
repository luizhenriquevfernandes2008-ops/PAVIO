import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE, CORES } from '../constantes';
import { Som } from '../som';
import { fundoMasmorra } from './fundo';

/** Tela de título: logo grande, a vela armada e "aperte qualquer tecla". */
export class Titulo extends Phaser.Scene {
  private saindo = false;

  constructor() {
    super('Titulo');
  }

  create() {
    this.saindo = false;
    const cx = TELA_L / 2;
    this.cameras.main.fadeIn(800);
    fundoMasmorra(this, { escuridao: 0.86 })(cx, 300, 300);
    Som.musica('menu');

    // brasas subindo das letras
    this.add
      .particles(0, 0, 'pixel', {
        x: { min: cx - 220, max: cx + 220 },
        y: { min: 150, max: 200 },
        lifespan: { min: 600, max: 1400 },
        speedY: { min: -60, max: -20 },
        scale: { start: 2, end: 0 },
        tint: [0xffb43a, 0xff6a3d, 0xffe066],
        blendMode: Phaser.BlendModes.ADD,
        frequency: 40,
      })
      .setDepth(2);

    const logo = this.add
      .text(cx, 170, 'PAVIO', { fontFamily: FONTE, fontSize: '96px', color: CORES.chama, stroke: '#1b1325', strokeThickness: 14 })
      .setOrigin(0.5)
      .setShadow(0, 8, '#000000', 0, true, true)
      .setDepth(3);
    logo.setTint(0xffe066, 0xffe066, 0xff6a1f, 0xff6a1f);
    this.tweens.add({ targets: logo, scale: 1.04, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 110, loop: true, callback: () => logo.setAlpha(Math.random() < 0.05 ? 0.7 : 1) });
    this.add.text(cx, 246, 'a última chama', { fontFamily: FONTE, fontSize: '16px', color: CORES.textoApagado }).setOrigin(0.5).setDepth(3);

    const vela = this.add.sprite(cx - 10, 440, 'player', 0).setOrigin(0.5, 1).setScale(7).play('heroi_vela_parado').setDepth(3);
    const arma = this.add.image(cx + 25, 440 - 16 * 7 * 0.32, 'arma_escopeta').setOrigin(0.15, 0.5).setScale(7).setDepth(3);
    this.tweens.add({ targets: arma, angle: -8, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    void vela;

    const aperte = this.add
      .text(cx, 520, 'APERTE QUALQUER TECLA', { fontFamily: FONTE, fontSize: '16px', color: CORES.texto, stroke: '#07050b', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(3);
    this.tweens.add({ targets: aperte, alpha: 0.2, duration: 550, yoyo: true, repeat: -1 });
    this.add.text(cx, TELA_A - 18, '© 2026 WW STUDIOS', { fontFamily: FONTE, fontSize: '8px', color: '#5a5478' }).setOrigin(0.5).setDepth(3);

    this.time.delayedCall(500, () => {
      this.input.keyboard!.once('keydown', () => this.entrar());
      this.input.once('pointerdown', () => this.entrar());
    });
  }

  private entrar() {
    if (this.saindo) return;
    this.saindo = true;
    Som.tocar('confirmar');
    this.cameras.main.flash(200, 255, 200, 120);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Menu'));
  }
}

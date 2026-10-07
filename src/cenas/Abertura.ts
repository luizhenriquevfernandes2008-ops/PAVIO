import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE } from '../constantes';
import { Som } from '../som';

/**
 * Abertura: primeiro um "clique para começar" (o navegador só libera o som depois
 * de um clique ou tecla), depois a logo da WW Studios.
 */
export class Abertura extends Phaser.Scene {
  private iniciou = false;
  private saindo = false;

  constructor() {
    super('Abertura');
  }

  create() {
    this.iniciou = false;
    this.saindo = false;
    this.cameras.main.setBackgroundColor(0x000000);
    const aviso = this.add
      .text(TELA_L / 2, TELA_A / 2, 'CLIQUE OU APERTE QUALQUER TECLA', { fontFamily: FONTE, fontSize: '16px', color: '#8a7c90' })
      .setOrigin(0.5);
    this.tweens.add({ targets: aviso, alpha: 0.25, duration: 600, yoyo: true, repeat: -1 });
    const comecar = () => {
      if (this.iniciou) return;
      this.iniciou = true;
      aviso.destroy();
      Som.iniciar();
      this.logo();
    };
    this.input.keyboard!.once('keydown', comecar);
    this.input.once('pointerdown', comecar);
  }

  private logo() {
    const cx = TELA_L / 2;
    Som.tocar('abertura');

    const luz = this.add.image(cx, 230, 'luz').setScale(6).setTint(0x8fe3ff).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    const wraith = this.add.sprite(cx, 230, 'wraith', 0).setScale(9).setAlpha(0);
    this.tweens.add({ targets: wraith, alpha: 1, duration: 900, ease: 'Sine.in' });
    this.tweens.add({ targets: luz, alpha: 0.35, duration: 1400 });
    this.tweens.add({ targets: [wraith, luz], y: 220, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.time.addEvent({ delay: 320, loop: true, callback: () => wraith.setFrame(wraith.frame.name === '0' ? 1 : 0) });
    // de vez em quando o espectro "falha", como um fantasma
    this.time.addEvent({
      delay: 140, loop: true,
      callback: () => wraith.setAlpha(wraith.alpha > 0.9 && Math.random() < 0.12 ? 0.4 : Math.min(1, wraith.alpha + 0.5)),
    });

    const nome = 'WW STUDIOS';
    const titulo = this.add
      .text(cx, 380, '', { fontFamily: FONTE, fontSize: '48px', color: '#e8e4ff', stroke: '#1b1325', strokeThickness: 8 })
      .setOrigin(0.5);
    for (let i = 1; i <= nome.length; i++) {
      this.time.delayedCall(700 + i * 90, () => {
        titulo.setText(nome.slice(0, i));
        if (nome[i - 1] !== ' ') Som.tocar('blip');
      });
    }
    // tremidinha de "glitch" quando termina de escrever
    this.time.delayedCall(700 + nome.length * 90 + 100, () => {
      this.tweens.add({ targets: titulo, x: cx + 4, duration: 40, yoyo: true, repeat: 3 });
      titulo.setTint(0x8fe3ff, 0x8fe3ff, 0xe8e4ff, 0xe8e4ff);
    });
    const sub = this.add.text(cx, 430, 'wraith ware', { fontFamily: FONTE, fontSize: '16px', color: '#8a7c90' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: sub, alpha: 1, delay: 1900, duration: 700 });

    this.time.delayedCall(4200, () => this.sair());
    this.time.delayedCall(400, () => {
      this.input.keyboard!.once('keydown', () => this.sair());
      this.input.once('pointerdown', () => this.sair());
    });
  }

  private sair() {
    if (this.saindo) return;
    this.saindo = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('Titulo'));
  }
}

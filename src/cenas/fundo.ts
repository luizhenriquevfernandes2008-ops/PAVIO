import Phaser from 'phaser';
import { TELA_L, TELA_A, CORES } from '../constantes';
import { D } from '../dados';
import { totalQuadros } from '../arte/texturas';

const ESCALA = 3;
const T = 16 * ESCALA;

/**
 * Fundo animado dos menus: chão e paredes do pack, escuridão com tochas,
 * brasas subindo e monstros passando nas sombras.
 * Retorna uma função para mover a luz principal (ex.: seguir o herói do menu).
 */
export function fundoMasmorra(scene: Phaser.Scene, opcoes: { escuridao?: number; monstros?: boolean } = {}) {
  scene.cameras.main.setBackgroundColor(CORES.fundo);
  const nPiso = Math.max(1, totalQuadros(scene, 'piso'));
  const nParede = Math.max(1, totalQuadros(scene, 'parede'));
  const cols = Math.ceil(TELA_L / T) + 1;
  const linhas = Math.ceil(TELA_A / T) + 1;
  let semente = 7;
  const rnd = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);

  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * T + T / 2;
      const y = r * T + T / 2;
      if (r < 2) scene.add.image(x, y, 'parede', rnd() > 0.9 ? Math.floor(rnd() * nParede) : 0).setScale(ESCALA).setDepth(-10);
      else scene.add.image(x, y, 'piso', Math.floor(rnd() * nPiso)).setScale(ESCALA).setDepth(-10);
    }
  }
  // estandartes e fontes na parede
  if (scene.textures.exists('estandarte')) {
    const n = totalQuadros(scene, 'estandarte');
    [2, 5, 14, 17].forEach((c, i) => scene.add.image(c * T + T / 2, T * 1.5, 'estandarte', i % n).setScale(ESCALA).setDepth(-10));
  }
  if (scene.anims.exists('fonte')) {
    for (const c of [9, 10]) scene.add.sprite(c * T + T / 2, T * 1.5, 'fonte').setScale(ESCALA).setDepth(-10).play('fonte');
  }

  // monstros andando ao fundo
  if (opcoes.monstros !== false) {
    const tipos = Object.values(D.inimigos)
      .map((i) => i.sprite)
      .filter((s, i, arr) => arr.indexOf(s) === i && scene.anims.exists(`${s}_mover`) && s !== 'apagador');
    const passar = () => {
      if (!scene.sys.isActive() || !tipos.length) return;
      const tipo = Phaser.Utils.Array.GetRandom(tipos);
      const daEsquerda = Math.random() < 0.5;
      const y = 200 + Math.random() * 380;
      const m = scene.add.sprite(daEsquerda ? -40 : TELA_L + 40, y, tipo).setScale(ESCALA).setDepth(-9).play(`${tipo}_mover`);
      m.setFlipX(!daEsquerda);
      scene.tweens.add({
        targets: m,
        x: daEsquerda ? TELA_L + 40 : -40,
        duration: 9000 + Math.random() * 6000,
        onComplete: () => m.destroy(),
      });
    };
    passar();
    scene.time.addEvent({ delay: 2600, loop: true, callback: passar });
  }

  // brasas subindo
  scene.add
    .particles(0, TELA_A + 10, 'pixel', {
      x: { min: 0, max: TELA_L },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: -70, max: -25 },
      speedX: { min: -12, max: 12 },
      scale: { start: 1.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xffb43a, 0xff6a3d, 0xffe066],
      blendMode: Phaser.BlendModes.ADD,
      frequency: 90,
    })
    .setDepth(-4);

  // escuridão com luzes que tremem
  const rt = scene.add.renderTexture(0, 0, TELA_L, TELA_A).setOrigin(0).setDepth(-5);
  const centro = { x: TELA_L / 2, y: 250, r: 300 };
  const tochas = [
    { x: 2 * T + T / 2, y: T * 1.5, r: 160 },
    { x: 5 * T + T / 2, y: T * 1.5, r: 130 },
    { x: 14 * T + T / 2, y: T * 1.5, r: 130 },
    { x: 17 * T + T / 2, y: T * 1.5, r: 160 },
  ];
  const escuridao = opcoes.escuridao ?? 0.82;
  const desenhar = () => {
    const t = scene.time.now;
    rt.clear();
    rt.fill(0x05030a, escuridao);
    const luz = (x: number, y: number, r: number) => rt.stamp('luz', undefined, x, y, { scale: r / 32, erase: true });
    luz(centro.x, centro.y, centro.r + Math.sin(t / 120) * 8 + Math.sin(t / 47) * 4);
    tochas.forEach((l, i) => luz(l.x, l.y, l.r + Math.sin(t / 90 + i * 2) * 6));
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, desenhar);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, desenhar));

  return (x: number, y: number, r = 300) => {
    centro.x = x;
    centro.y = y;
    centro.r = r;
  };
}

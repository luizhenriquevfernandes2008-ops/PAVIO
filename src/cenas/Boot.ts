import Phaser from 'phaser';
import { TELA_L, TELA_A, FONTE } from '../constantes';
import { D } from '../dados';
import { Estado, carregarMeta } from '../estado';
import { gerarTexturas, criarAnimacoes } from '../arte/texturas';
import { prepararAtlas } from '../arte/atlas';
import { gerarIcones } from '../arte/icones';
import { gerarVelaNegra } from '../arte/aparencia';
import { inferirTags } from '../sistemas/Itens';
import { gerarPersonagens } from '../arte/personagens';

/** Carrega os JSON de public/dados, o atlas do pack 0x72 e gera a arte embutida. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.add.text(TELA_L / 2, TELA_A / 2, 'Acendendo...', { fontFamily: FONTE, fontSize: '16px', color: '#f4ead6' }).setOrigin(0.5);
    for (const nome of ['config', 'inimigos', 'itens', 'sinergias', 'armas', 'salas', 'visual', 'historia', 'ativos', 'conquistas', 'itens_referencias', 'itens_gerados', 'sinergias_geradas', 'armas_extras', 'tags', 'ativos_extras', 'personagens', 'transformacoes']) this.load.json(nome, `dados/${nome}.json`);
  }

  create() {
    D.config = this.cache.json.get('config');
    D.inimigos = this.cache.json.get('inimigos');
    // itens: os feitos à mão + as referências + os gerados (npm run gerar); idem sinergias e armas
    const j = (n: string) => this.cache.json.get(n) ?? [];
    D.itens = [...j('itens'), ...j('itens_referencias'), ...j('itens_gerados')];
    for (const it of D.itens) it.tags = inferirTags(it);
    D.sinergias = [...j('sinergias'), ...j('sinergias_geradas'), ...j('transformacoes')];
    D.tags = this.cache.json.get('tags') ?? {};
    // chaves que começam com _ são comentários nos JSON
    for (const k of Object.keys(D.inimigos)) if (k.startsWith('_')) delete D.inimigos[k];
    D.armas = [...j('armas'), ...j('armas_extras')];
    D.salas = this.cache.json.get('salas');
    D.visual = this.cache.json.get('visual');
    D.ativos = [...j('ativos'), ...j('ativos_extras')];
    D.personagens = j('personagens');
    D.conquistas = this.cache.json.get('conquistas');
    Estado.meta = carregarMeta();

    this.load.image('dungeon', D.visual.atlas);
    this.load.text('dungeon_lista', D.visual.lista);
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (f: Phaser.Loader.File) =>
      console.warn(`[PAVIO] Não achei ${f.src}; usando a arte embutida.`),
    );
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      prepararAtlas(this);
      gerarTexturas(this);
      gerarVelaNegra(this);
      gerarPersonagens(this);
      // sem o pack 0x72 os heróis não existem: os monstros feitos deles usam a arte embutida
      for (const def of Object.values(D.inimigos)) if (!this.textures.exists(def.sprite)) def.sprite = def.chefe ? 'apagador' : 'esqueleto';
      gerarIcones(this);
      criarAnimacoes(this);
      this.scene.start('Abertura');
    });
    this.load.start();
  }
}

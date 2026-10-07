// Atualiza as tabelas do PROJETO.md a partir dos JSON em public/dados.
// Uso: npm run doc
// Só troca o que está entre <!-- gerado:NOME --> e <!-- /gerado:NOME -->; o resto do texto é seu.

import fs from 'node:fs';

const ler = (n) => JSON.parse(fs.readFileSync(`public/dados/${n}.json`, 'utf8'));
const armas = [...ler('armas'), ...ler('armas_extras')];
const itensMao = [...ler('itens'), ...ler('itens_referencias')];
const gerados = ler('itens_gerados');
const itens = [...itensMao, ...gerados];
const sinergias = [...ler('sinergias'), ...ler('sinergias_geradas')];
const tags = ler('tags');
const inimigos = Object.entries(ler('inimigos')).filter(([k]) => !k.startsWith('_'));
const config = ler('config');
const historia = ler('historia');
const ativos = [...ler('ativos'), ...ler('ativos_extras')];
const personagens = ler('personagens');
const conquistas = ler('conquistas');

const RARIDADE = ['inicial', 'comum', 'incomum', 'rara', 'épica', 'mítica'];
const nomeItem = (id) => itens.find((i) => i.id === id)?.nome ?? id;
const nomeArma = (id) => armas.find((a) => a.id === id)?.nome ?? id;
const nomeAtivo = (id) => ativos.find((a) => a.id === id)?.nome ?? id;
const nomeDesbloqueio = (d) =>
  d.tipo === 'abismo' ? 'O Abismo e o modo infinito' : d.tipo === 'item' ? nomeItem(d.id) : d.tipo === 'ativo' ? nomeAtivo(d.id) : nomeArma(d.id);
// o que está trancado atrás de uma conquista
const trancados = new Map(conquistas.flatMap((c) => c.desbloqueia.map((d) => [`${d.tipo}:${d.id}`, c.nome])));
const cadeado = (tipo, id) => (trancados.has(`${tipo}:${id}`) ? ` 🔒 *(${trancados.get(`${tipo}:${id}`)})*` : '');
const celula = (t) => String(t).replace(/\|/g, '\\|');

function especiais(m) {
  const e = [];
  if (m.laser) e.push('laser instantâneo');
  if (m.perfura && !m.laser) e.push(`perfura ${m.perfura >= 99 ? 'tudo' : m.perfura}`);
  if (m.explosao) e.push(`explode (raio ${m.explosao})`);
  if (m.fragmenta) e.push(`${m.fragmenta} fragmentos`);
  if (m.ricochete) e.push(`quica ${m.ricochete}x`);
  if (m.teleguiado) e.push('teleguiada');
  if (m.eletrico) e.push(`raio em cadeia (${m.eletrico})`);
  if (m.congela) e.push(`congela ${Math.round(m.congela * 100)}%`);
  if (m.veneno) e.push('veneno');
  if (m.queima) e.push('fogo');
  if (m.bumerangue) e.push('bumerangue');
  if (m.atrator) e.push('puxa monstros');
  if (m.aquecimento) e.push('esquenta');
  return e.join(', ') || '—';
}

const blocos = {
  historia: () => {
    const lista = (q) => q.map((x, i) => `${i + 1}. *(${x.cena})* ${x.texto}`).join('\n');
    return `**Começo** (antes da primeira partida):\n\n${lista(historia.quadros)}\n\n**Final 1** (vencer O Apagador):\n\n${lista(historia.final)}\n\n**Final 2** (vencer O Pavio Negro):\n\n${lista(historia.final2)}\n\n**Final 3** (vencer O Acendedor):\n\n${lista(historia.final3)}`;
  },

  armas: () => {
    const linhas = [...armas].sort((a, b) => b.raridade - a.raridade).map((a) => {
      const mun = a.municao < 0 ? '∞' : a.municao;
      const tiros = a.laser ? '—' : (1 / a.cadencia).toFixed(1);
      const dano = a.projeteis > 1 ? `${a.dano} x${a.projeteis}` : a.dano;
      const tier = a.raridade >= 4 ? `**${RARIDADE[a.raridade]}**` : RARIDADE[a.raridade];
      return `| ${a.nome}${cadeado('arma', a.id)} | ${celula(a.desc)} | ${dano} | ${tiros} | ${a.pente} | ${mun} | ${especiais(a)} | ${tier} |`;
    });
    const contagem = RARIDADE.map((r, i) => `${armas.filter((a) => a.raridade === i).length} ${r}`).join(' · ');
    return [`**${armas.length} armas** (${contagem}), das míticas para as comuns.`, '', '| Arma | Descrição | Dano | Tiros/s | Pente | Munição | Especial | Raridade |', '|---|---|---|---|---|---|---|---|', ...linhas].join('\n');
  },

  itens: () => {
    const linhas = itensMao.map((i) => {
      const extra = i.especial ? ` *(especial: ${i.especial})*` : '';
      const visual = i.visual ? Object.entries(i.visual).map(([k, v]) => `${k}: ${v}`).join(', ') : '—';
      const etq = (i.tags ?? []).map((t) => tags[t] ?? t).join(', ') || '*(pelo efeito)*';
      return `| ${i.maldito ? '☠ ' : ''}${i.nome}${i.referencia ? ' 🎬' : ''}${cadeado('item', i.id)} | ${celula(i.desc)}${extra} | ${etq} | ${RARIDADE[i.raridade]} | ${visual} |`;
    });
    const objetos = [...new Set(gerados.map((g) => g.tags[0]))].map((t) => tags[t]);
    const elementos = [...new Set(gerados.map((g) => g.tags[1]))].map((t) => tags[t]);
    return [
      `**${itens.length} itens**: ${itensMao.length} feitos à mão (${itensMao.filter((i) => i.referencia).length} deles referências 🎬) e ${gerados.length} gerados. ${itens.filter((i) => i.maldito).length} são **malditos** (☠: bônus forte com um preço).`,
      '',
      `Os **${gerados.length} gerados** combinam ${objetos.length} objetos com ${elementos.length} elementos (ex.: *Anel de Brasa*, *Bota do Trovão*). O objeto dá um atributo, o elemento muda as balas:`,
      '',
      `- **Objetos:** ${objetos.join(', ')}`,
      `- **Elementos:** ${elementos.join(', ')}`,
      '',
      'Os feitos à mão:',
      '',
      '| Item | Efeito | Etiquetas | Raridade | Muda a vela |',
      '|---|---|---|---|---|',
      ...linhas,
    ].join('\n');
  },

  sinergias: () => {
    const linhas = sinergias.map((s) => {
      const req = [...(s.arma ? [`**${nomeArma(s.arma)}** (arma)`] : []), ...s.itens.map(nomeItem), ...Object.entries(s.tags ?? {}).map(([t, n]) => `${n}x ${tags[t] ?? t}`)].join(' + ');
      return `| ${s.nome} | ${req} | ${celula(s.desc)} |`;
    });
    return [
      `<details><summary>${sinergias.length} sinergias (spoiler: no jogo elas ficam escondidas até serem descobertas)</summary>`,
      '',
      '| Sinergia | Precisa de | Efeito |',
      '|---|---|---|',
      ...linhas,
      '',
      '</details>',
    ].join('\n');
  },

  inimigos: () => {
    const comuns = inimigos.filter(([, d]) => !d.chefe && d.custo > 0);
    const linhas = comuns.map(([, d]) => `| ${d.nome} | ${celula(d.desc)} | ${d.vida} | ${d.dano} | ${d.velocidade || d.salto || '—'} | ${d.ia} | ${d.andares ? `só ${d.andares.join(', ')}` : `${d.andarMin}+`} | ${d.custo}${d.grupo ? ` (bando de ${d.grupo})` : ''} |`);
    return ['| Inimigo | Comportamento | Vida | Dano | Velocidade | IA | Andar | Custo |', '|---|---|---|---|---|---|---|---|', ...linhas].join('\n');
  },

  chefes: () => {
    // capítulo 1 (andares 1-5), O Abismo (6) e O Outro Lado (7-11)
    const ordem = [
      ...config.chefes.map((id, i) => [id, i + 1, config.nomesAndares[i]]),
      [config.abismo.chefe, config.andares + 1, config.abismo.nome],
      ...config.capitulo3.map((a, i) => [a.chefe, config.andares + 2 + i, a.nome]),
    ];
    const linhas = ordem.map(([id, andar, nome]) => {
      const d = inimigos.find(([k]) => k === id)?.[1];
      if (!d) return '';
      const ataques = d.ataques ? d.ataques.join(', ') : d.ia;
      return `| ${andar} · ${nome} | ${d.nome} | ${celula(d.desc)} | ${d.vida} | ${ataques} |`;
    }).filter(Boolean);
    return ['| Andar | Chefe | Descrição | Vida | Ataques |', '|---|---|---|---|---|', ...linhas].join('\n');
  },

  ativos: () => {
    const linhas = ativos.map((a) => `| ${a.maldito ? '☠ ' : ''}${a.nome}${cadeado('ativo', a.id)} | ${celula(a.desc)} | ${a.carga} sala${a.carga > 1 ? 's' : ''} |`);
    return [`<details><summary>${ativos.length} itens ativos</summary>`, '', '| Item ativo | Efeito | Recarga |', '|---|---|---|', ...linhas, '', '</details>'].join('\n');
  },

  personagens: () => {
    const nomeStat = { chamaMax: 'chama máx', dano: 'dano', velocidade: 'velocidade', decaimento: 'queima da chama', cadencia: 'tempo entre tiros' };
    const st = (o = {}) => Object.entries(o).map(([k, v]) => (['chamaMax'].includes(k) ? `${nomeStat[k] ?? k} ${v > 0 ? '+' : ''}${v}` : `${nomeStat[k] ?? k} x${v}`)).join(', ') || '—';
    const linhas = personagens.map((c) => {
      const comeca = [...c.armas.map(nomeArma), ...c.itens.map(nomeItem), ...(c.ativo ? [nomeAtivo(c.ativo)] : [])].join(', ');
      const libera = trancados.get(`personagem:${c.id}`) ?? '*(desde o começo)*';
      return `| **${c.nome}** | ${celula(c.desc)} | ${comeca} | ${st(c.stats)} | ${libera} |`;
    });
    return ['| Personagem | Como é | Começa com | Atributos | Conquista que libera |', '|---|---|---|---|---|', ...linhas].join('\n');
  },

  conquistas: () => {
    const linhas = conquistas.map((c) => `| ${c.nome} | ${celula(c.desc)} | ${c.desbloqueia.map(nomeDesbloqueio).join(', ')} |`);
    return [`**${conquistas.length} conquistas.** Cada uma libera algo novo, que só passa a aparecer nas partidas depois dela.`, '', '| Conquista | Como conseguir | Libera |', '|---|---|---|', ...linhas].join('\n');
  },

  config: () => {
    const j = config.jogador;
    const l = [
      ['Chama máxima inicial', j.chamaMax],
      ['A chama queima sozinha', `${j.decaimento}/s`],
      ['Velocidade', j.velocidade],
      ['Cargas de dash', `${j.dashes} (recarga ${j.cooldownDash}s)`],
      ['Cura por gota de cera', config.combate.curaPorGota],
      ['Invencibilidade após levar dano', `${config.combate.invencivelAposDano}s`],
      ['Parry', `janela ${config.parry.janela}s · recarga ${config.parry.recarga}s · até ${config.parry.maxRefletidas} balas · ${config.parry.dano} de dano`],
      ['Esquiva perfeita', `raio ${config.esquiva.raio} · câmera lenta ${config.esquiva.camaraLenta}x por ${config.esquiva.duracaoMs}ms`],
      ['Frenesi', `combo x${config.frenesi.combo}: atira ${Math.round((1 / config.frenesi.cadencia - 1) * 100)}% mais rápido e corre ${Math.round((config.frenesi.velocidade - 1) * 100)}% mais`],
      ['Elites', `${Math.round(config.elite.chance * 100)}% + ${Math.round(config.elite.chancePorAndar * 100)}% por andar · vida x${config.elite.vida}`],
      ['Crítico', `${Math.round(config.critico.chance * 100)}% · dano x${config.critico.multiplicador}`],
      ['Salas por andar', config.salasPorAndar.join(' / ')],
      ['Salas escuras', config.chanceSalaEscura.map((c) => `${Math.round(c * 100)}%`).join(' / ')],
      ['Orçamento de inimigos por sala', `${config.orcamento.base} + ${config.orcamento.porAndar} por andar (+0 a ${config.orcamento.variacao})`],
      ['Vida dos monstros por andar', `+${Math.round(config.escalaAndar.vida * 100)}%`],
      ['Velocidade das balas inimigas', `x${config.velocidadeBalasInimigas}`],
      ['Segunda onda', `${Math.round(config.combate.chanceSegundaOnda * 100)}% das salas de combate`],
      ['Preços na loja', Object.entries(config.precos).map(([k, v]) => `${k} ${v}`).join(' · ')],
      ['Armas iniciais', config.armasIniciais.map(nomeArma).join(' + ')],
      ['Sala de desafio', `${config.desafio.ondas} ondas · chance por andar ${config.desafio.chance.map((c) => `${Math.round(c * 100)}%`).join(' / ')}`],
      ['Parede rachada', `abre com ${config.secreta.vidaParede} de dano de tiro, ou com qualquer explosão`],
      ['O Abismo (andar 4)', `${config.abismo.salas} salas · ${Math.round(config.abismo.chanceEscura * 100)}% escuras`],
      ['Modo infinito', `${config.infinito.salas} salas · chefes com ${config.infinito.vidaChefeBase}+ de vida, +${Math.round(config.infinito.vidaChefePorAndar * 100)}% por profundeza · elites até ${Math.round(config.infinito.eliteMax * 100)}%`],
    ];
    return ['| Valor | Atual |', '|---|---|', ...l.map(([a, b]) => `| ${a} | ${b} |`)].join('\n');
  },
};

let doc = fs.readFileSync('PROJETO.md', 'utf8');
for (const [nome, gerar] of Object.entries(blocos)) {
  const re = new RegExp(`(<!-- gerado:${nome} -->)[\\s\\S]*?(<!-- /gerado:${nome} -->)`);
  if (!re.test(doc)) {
    console.warn(`[doc] marcador "${nome}" não encontrado no PROJETO.md`);
    continue;
  }
  doc = doc.replace(re, `$1\n${gerar()}\n$2`);
}
fs.writeFileSync('PROJETO.md', doc);
console.log('PROJETO.md atualizado.');

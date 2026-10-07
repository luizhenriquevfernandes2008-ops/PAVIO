# PAVIO: a última chama

> Documento do projeto: o que é o jogo, como funciona cada sistema e onde mexer em cada coisa.
> As tabelas marcadas como *geradas* saem direto dos arquivos em `public/dados/`: depois de mudar um número, rode `npm run doc` para atualizá-las.

| | |
|---|---|
| **Estúdio** | WW STUDIOS (Wraith Ware) |
| **Criação** | Luiz Vargas |
| **Gênero** | Roguelite top-down de tiro, bullet hell |
| **Plataforma** | Navegador (abre pelo `JOGAR.bat` no Windows) |
| **Motor** | Phaser 3 + TypeScript + Vite |
| **Arte** | Pixel art 16x16: pack *16x16 DungeonTileset II* (0x72, CC0) + vela, armas, ícones e efeitos feitos para o jogo |
| **Versão** | 1.0 |

---

## 1. A ideia

Uma vela armada até o pavio desce uma masmorra para recuperar a luz do mundo.

- **A chama é a vida e o relógio**: ela queima sozinha o tempo todo. Matar monstros solta **gotas de cera**, que curam e servem de dinheiro. Isso empurra o jogador para frente: ficar parado é perder.
- **Frenético e viciante aos olhos**: tiros que iluminam, parry, esquiva perfeita com câmera lenta, combo, números de dano, telas piscando e luzes no ritmo da música.
- **Cada partida é diferente**: a masmorra é procedural e os itens se combinam como no *The Binding of Isaac*. Dois itens certos juntos liberam **sinergias secretas**, e a vela muda de aparência com o que você pega.
- **Sempre tem mais um motivo para jogar de novo**: conquistas liberam armas e itens novos, paredes rachadas escondem salas secretas e, depois de vencer O Apagador, abre-se O Abismo e um modo infinito.

## 2. História

A Catedral de Cera guardava a **Chama Primeira**, que prendia a escuridão debaixo da terra. **O Apagador** subiu, soprou as mil velas e levou a chama para o fundo da masmorra. Sobrou só uma velinha, pequena demais para ser notada. Ela pegou uma arma e desceu.

Mais fundo que a masmorra do Apagador fica **O Abismo**, onde mora **O Pavio Negro**: a sombra da própria velinha, que luta como ela (atira, se esquiva e dá parry).

A história aparece em quadrinhos, no estilo das cenas do *Undertale*: um desenho animado em cima e o texto sendo "digitado" embaixo, com um bip a cada letra. O texto fica em `public/dados/historia.json` e os desenhos em `src/cenas/Historia.ts`.

<!-- gerado:historia -->
**Começo** (antes da primeira partida):

1. *(catedral)* Há muito tempo, no fundo da Catedral de Cera, mil velas guardavam a Chama Primeira: a luz que mantinha a escuridão presa debaixo da terra.
2. *(apagador)* Mas a escuridão tem fome. Numa noite sem lua, O Apagador subiu das profundezas... e soprou as velas, uma por uma.
3. *(escondida)* Todas, menos uma. Pequena demais para ser notada, uma velinha tremia escondida atrás do altar.
4. *(roubo)* O Apagador levou a Chama Primeira para o fundo da masmorra. Sem ela, o mundo começou a esfriar. Sem ela, tudo se apaga.
5. *(arma)* Então a velinha fez o que nenhuma vela jamais fez. Pegou uma arma... e desceu.

**Final 1** (vencer O Apagador):

1. *(fim_apagador)* Com um último sopro sem forças, O Apagador se desfez em fumaça. Pela primeira vez, a escuridão recuou.
2. *(fim_lanterna)* No fundo da masmorra, a Chama Primeira ainda queimava, presa numa lanterna velha.
3. *(fim_toque)* A velinha encostou seu pavio na Chama Primeira...
4. *(fim_catedral)* ...e a luz subiu por todos os andares, acendendo vela por vela, até o alto da Catedral de Cera.
5. *(fim_altar)* Desde aquela noite, a menor das velas guarda o altar. E ela nunca mais teve medo do escuro.

**Final 2** (vencer O Pavio Negro):

1. *(fim2_sombra)* O Pavio Negro caiu de joelhos. Por baixo da cera preta, a velinha reconheceu o próprio rosto.
2. *(fim2_medo)* Ele era o medo dela. Todo o escuro que ela engoliu para continuar descendo.
3. *(fim2_abraco)* Em vez de apagá-lo, a velinha o abraçou. A sombra derreteu e voltou para dentro dela.
4. *(fim_catedral)* Inteira de novo, ela subiu. Por onde a sua luz passava, a sombra ia junto... e protegia.
5. *(fim2_dupla)* Desde então, toda vela da Catedral tem uma sombra. Para lembrar que o escuro também faz parte da chama.

**Final 3** (vencer O Acendedor):

1. *(fim3_acendedor)* O Acendedor caiu. Foi ele quem riscou o primeiro fósforo do mundo, há muito, muito tempo.
2. *(fim3_fosforo)* Ele tinha tanto medo do escuro que quis acender tudo, para sempre. Até o mundo virar cinza.
3. *(fim3_entrega)* A velinha ofereceu a ele a sua chama: pequena, gasta, teimosa. "Não precisa queimar tudo para ser luz."
4. *(fim3_amanhecer)* O Acendedor sorriu e se apagou em paz. E, pela primeira vez, o sol nasceu sobre a Catedral.
5. *(fim3_sol)* A menor das velas finalmente descansou. Ela não precisava mais brilhar sozinha: agora havia o dia.
<!-- /gerado:historia -->

## 3. Como rodar

1. Instale o [Node.js](https://nodejs.org) (só na primeira vez).
2. Dê dois cliques em `JOGAR.bat`: ele instala as dependências na primeira vez e abre o jogo no navegador.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento (o que o `.bat` roda) |
| `npm run build` | gera a versão final em `dist/` |
| `npm run check` | confere os tipos do TypeScript |
| `npm run doc` | atualiza as tabelas deste documento |
| `npm run gerar` | refaz os itens gerados, as sinergias por etiqueta, os itens de referência e as armas extras |

## 4. Controles

| Tecla | Ação |
|---|---|
| WASD | andar |
| Mouse | mirar (segure o clique para atirar) |
| Setas | mirar e atirar sem mouse |
| Espaço / Shift | esquiva: dash invencível (2 cargas) |
| Clique direito / F | parry: rebate as balas |
| R | recarregar |
| Q / roda do mouse / 1 2 3 | trocar de arma (carrega até 3) |
| E | interagir: castiçal, baú, loja, trocar arma ou item ativo pelo do chão |
| C / botão do meio | usar o item ativo |
| P / ESC | pausar (mostra seus itens e sinergias; X volta ao menu) |
| M | som liga/desliga |
| F2 | **menu de desenvolvedor** (dentro da partida, com o MODO DESENVOLVEDOR ligado nas Opções) |

## 5. Fluxo de telas

```
Clique para começar → Logo WW STUDIOS → Tela de título → Menu
Menu: (CONTINUAR) · JOGAR (vai para a Sacristia) · JOGAR EM DUPLA · DESAFIO DIÁRIO · DESAFIOS · TUTORIAL · ALTAR · ARSENAL · ARMARIA 3D · CONQUISTAS · ESTATÍSTICAS · COMO JOGAR · HISTÓRIA · OPÇÕES · CRÉDITOS
JOGAR → (história, só na 1ª vez) → Jogo → morreu: tela de derrota
                                        → venceu O Apagador: final em quadrinhos → tela de vitória
                                        → (com O Abismo liberado) desceu: andar 4 → modo infinito
                                              → saiu pela luz depois de um chefe: tela de vitória
```

- **Personagem**: 12 personagens jogáveis, cada um com arma, itens e atributos próprios (veja a seção de personagens). Os bloqueados aparecem em silhueta com a conquista que os libera.
- **Altar**: melhorias permanentes compradas com **cera dourada**, que se ganha no fim de cada partida.
- **Itens no chão ficam em pedestais**: tudo que aparece (baú, chefe, desafio, troca, menu dev) surge num pedestal que sobe do chão, com o item caindo em cima e um feixe de luz. Ao pegar, o pedestal afunda.
- **A Sacristia** (JOGAR): uma sala onde você anda com a sua vela antes da partida. Tem o portal para descer (abre a escolha de personagem), o portal da dupla, o quadro dos Desafios, o Altar, a Armaria 3D, o livro do Arsenal e um **boneco de treino** que mostra o DPS da sua arma. Os personagens ficam em fila: chegue perto de um e aperte E para jogar com ele.
- **Sementes**: toda partida tem um código de 6 letras (aparece na pausa e no fim). Na escolha de personagem, SEMENTE deixa digitar o código de um amigo para jogar a mesma masmorra.
- **Escolha de personagem**: como no Isaac, JOGAR (e JOGAR EM DUPLA) abre a escolha do personagem antes da partida, com o que ele traz, os atributos e as marcas. Na dupla, o jogador 1 escolhe e depois o jogador 2. Tem também o ALEATÓRIO. O desafio diário e o tutorial são sempre com a Velinha.
- **Armaria 3D**: todas as armas viram modelos 3D de voxel (cada pixel do desenho vira um cubinho; o miolo é mais grosso que a borda), com luz, pedestal e brilho do tier. Arraste ou A/D para girar, roda do mouse para zoom, W/S troca de arma, Q/E filtra por tier, ESPAÇO testa o tiro (coice, clarão, as balas e o som da arma). As bloqueadas aparecem como silhueta, dizendo como liberar.
- **Pausa**: menu com CONTINUAR, RECOMEÇAR (pede confirmação), SOM, TREMOR e SALVAR E SAIR; ficha do personagem (tempo, cera, atributos, ativo); grade com os ícones dos itens (passe o mouse para ler) e a lista de sinergias e transformações.
- **Arsenal**: enciclopédia de armas, itens, itens ativos, sinergias (escondidas até descobrir) e inimigos. O que ainda está trancado aparece como ??? com a conquista que libera.
- **Conquistas**: a lista do que já foi feito e do que cada conquista libera.
- **Continuar**: a partida é salva no navegador a cada sala (e ao fechar a aba). Sair pela pausa também guarda; morrer ou vencer apaga o save.
- **Desafio diário**: todo mundo joga a mesma masmorra no dia (sorteio com a semente da data), sempre com a Velinha e um item inicial sorteado. Os pontos (andar, mortes, combo, vitória e tempo) viram o recorde do dia.
- **Jogar em dupla**: dois jogadores no mesmo computador, dividindo a chama e os itens (como no Isaac). Cada um tem a sua arma (o J2 usa a primeira arma do personagem dele, com munição infinita) e os monstros vão atrás de quem estiver mais perto. **J2**: um controle (analógico esquerdo anda, direito mira, RT atira, A esquiva, B parry) ou o teclado (SETAS andam, L atira mirando sozinho, K esquiva, J parry). O personagem do J2 é escolhido na tela de personagem, em USAR NO JOGADOR 2.
- **Tutorial**: 6 salas, uma lição em cada (atirar, esquiva, parry, itens, segredos, combate). A porta só abre quando você faz o que a sala pede, e você não leva dano.
- **Estatísticas**: totais, partidas e vitórias por personagem, do que você mais morre, itens favoritos e as últimas partidas.
- **Opções**: volume de música e de efeitos, tremor de tela, **luzes piscantes**, brilho (bloom), FPS, tela cheia, **MODO DESENVOLVEDOR** (libera tudo e liga o F2) e apagar progresso.

## 6. Estrutura de uma partida

A partida tem três capítulos, no estilo do Binding of Isaac (cada um aparece depois de vencer o anterior):

| Capítulo | Andares | Chefes | Como abre |
|---|---|---|---|
| **A Catedral** | 1-5 | Ogro Encerado, Rei Podre, Necromante Ancião, Cavaleiro Derretido, **O Apagador** | desde o começo |
| **O Abismo** | 6 | **O Pavio Negro** | vencer O Apagador uma vez |
| **O Outro Lado** | 7-11: Jardim de Cinzas, Espelho Partido, Relógio Parado, Mar de Cera, Coração da Chama | Jardineira, Reflexo, Relojoeiro, Leviatã, **O Acendedor** | vencer O Pavio Negro **2 vezes** |
| Modo infinito | 12+ | todos, em rodízio, cada vez mais fortes | vencer O Acendedor e descer |

- Depois do Apagador, do Pavio Negro e do Acendedor aparece a **escolha**: sair pela luz (termina vencendo, com o final daquele chefe) ou descer.
- **Três finais em quadrinhos**: um para O Apagador (a chama volta para a Catedral), um para O Pavio Negro (a velinha abraça a própria sombra) e um para O Acendedor (o primeiro amanhecer).
- **"O Outro Lado" é diferente de tudo**: cada andar tem 3 monstros exclusivos e um perigo próprio: brasas caindo (Jardim), tudo quica nas paredes (Espelho), tic-tac que para e acelera os monstros (Relógio), ondas de balas e lama (Mar), escuridão total e fogo onde algo morre (Coração).
- O mapa de cada andar é uma grade de salas ligadas por portas (estilo Isaac), gerada a cada partida.

| Tipo de sala | O que tem |
|---|---|
| Início | sala vazia, ponto de partida |
| Combate | **gerada por algoritmo**: layout + inimigos (ver seção 11) |
| Descanso | sem inimigos, com um baú (2 por andar) |
| Tesouro | item grátis num pedestal (às vezes um item ativo) |
| Loja | item, arma, vela (cura), munição e, às vezes, um item ativo |
| Castiçal | paga cera para encher a chama (2 a partir do andar 2) |
| Chefe | o chefe do andar; ao morrer deixa um item raro e a escada (do andar 3 em diante, também a saída de luz) |
| Desafio | portas com caveiras vermelhas. Entrou, as portas trancam: 3 ondas de monstros (a última com elites). Prêmio: item raro e, às vezes, um item ativo |
| Fonte dos Desejos | jogue 8 de cera (até 5 vezes): nada, chama cheia, cera em dobro, um item, um ativo... ou a fonte se irrita e solta monstros |
| Altar da Troca | deixe o seu último item e leve um de raridade maior (uma vez) |
| Visita de um amigo | o Luiz, a Ana ou o Luizãooo (nunca você mesmo) conversam e dão um presente: arma rara (Luiz), chama cheia e um item de coração (Ana), escudo, cera e um ativo (Luizãooo) |
| Secreta | escondida atrás de uma **parede rachada**. Abre com tiros ou com explosão. Tem um item, um item ativo ou um monte de cera com baú |

- **Intensidade das salas**: perto do início são tranquilas. No resto, 25% são tranquilas (metade dos inimigos), 60% normais e 15% **emboscadas** (35% a mais).
- **Salas escuras**: parte das salas fica no breu, e só a sua chama ilumina. Quanto menor a chama, menos você enxerga.
- **Segunda onda**: algumas salas mandam mais monstros quando você acha que acabou.

## 7. Sistemas de combate

| Sistema | Como funciona |
|---|---|
| **Chama** | Vida e relógio ao mesmo tempo. Queima sozinha; o dash gasta 1. |
| **Cera** | Gotas que os monstros soltam: curam a chama e são o dinheiro da loja. |
| **Parry** | Clique direito na hora certa: rebate até 6 balas como balas douradas, cura, devolve um dash e congela a tela por um instante. Funciona contra monstros encostados (atordoa). |
| **Esquiva perfeita** | Passar raspando numa bala ou monstro durante o dash: câmera lenta, cura e +1 no combo. |
| **Combo / Frenesi** | Matar em sequência sobe o combo. A cada 5, cera extra. No x10 entra o **FRENESI**: mais rápido, atirando mais, rastro dourado e música mais intensa. Marcos: FRENESI, MASSACRE, INFERNAL, APOCALIPSE, IMPARÁVEL, DEUS DA CERA. |
| **Elites** | Monstros com contorno vermelho: mais vida, atiram mais e explodem num anel de balas ao morrer. |
| **Críticos** | Chance de dano dobrado, com número grande e dourado. |
| **Estados** | Fogo, veneno e gelo nos monstros. Gelo e veneno também nos jogadores (balas e poças inimigas). |
| **Caixotes** | Quebram com tiros e explosões; às vezes têm cera, munição ou vela. |
| **Espinhos** | Sobem e descem num ciclo; avisam antes de subir. |
| **Câmera lenta** | No parry, na esquiva perfeita, nos marcos de combo, ao limpar uma sala e ao matar elites e chefes. |
| **Item ativo** | Um por vez, usado com C. Carrega limpando salas (cada item pede um número de salas). Pegar outro deixa o antigo no chão. |
| **Conquistas** | 15 metas (chefes, combo, parries, sala secreta, desafio...). Cada uma libera uma arma, item ou item ativo. Até lá, eles não aparecem nas partidas. |

### Balanceamento atual *(gerado)*

<!-- gerado:config -->
| Valor | Atual |
|---|---|
| Chama máxima inicial | 100 |
| A chama queima sozinha | 0.75/s |
| Velocidade | 115 |
| Cargas de dash | 2 (recarga 0.5s) |
| Cura por gota de cera | 2 |
| Invencibilidade após levar dano | 0.6s |
| Parry | janela 0.15s · recarga 0.8s · até 6 balas · 3 de dano |
| Esquiva perfeita | raio 13 · câmera lenta 0.3x por 380ms |
| Frenesi | combo x10: atira 25% mais rápido e corre 15% mais |
| Elites | 10% + 6% por andar · vida x2.5 |
| Crítico | 6% · dano x2.2 |
| Salas por andar | 13 / 15 / 17 / 19 / 21 |
| Salas escuras | 12% / 18% / 25% / 30% / 35% |
| Orçamento de inimigos por sala | 8 + 4 por andar (+0 a 3) |
| Vida dos monstros por andar | +35% |
| Velocidade das balas inimigas | x1.2 |
| Segunda onda | 35% das salas de combate |
| Preços na loja | castical 8 · item 22 · vela 12 · arma 22 · municao 8 · ativo 20 |
| Armas iniciais | Pistola de Pavio + Escopeta |
| Sala de desafio | 3 ondas · chance por andar 60% / 100% / 100% |
| Parede rachada | abre com 30 de dano de tiro, ou com qualquer explosão |
| O Abismo (andar 4) | 22 salas · 50% escuras |
| Modo infinito | 20 salas · chefes com 420+ de vida, +30% por profundeza · elites até 45% |
<!-- /gerado:config -->

## 8. Armas e itens

### Efeitos de verdade: gatilhos e passivos

Os itens não são só "+% de dano". O motor de efeitos (`src/sistemas/Efeitos.ts`) junta três peças:

- **Gatilhos**: *quando* algo acontece (ao acertar, no crítico, ao matar, ao levar dano, ao dar dash, no parry, a cada N tiros, a cada X segundos, ao entrar numa sala, ao limpar, com pouca chama, a cada 10 de combo, ao recarregar).
- **Efeitos**: o que acontece (explosão, anel de balas, leque, balas que perseguem ou quicam, raio em cadeia, raios do céu, congelar, queimar, envenenar, nuvens de fogo/gelo/veneno, empurrão, cura, cera, escudo, ficar intocável, câmera lenta, buffs de dano/cadência/velocidade, críticos garantidos, tiro de graça, lâminas girando, cães que caçam, clones que atiram junto, meteoros, laser giratório, buraco negro, minas, converter balas inimigas, teletransporte, sugar vida, matar os fracos, cortes na sala, paralisar, terremoto, dash gigante, esfera gigante...).
- **Passivos**: regras que ficam ligadas: golpe duplo, faísca negra (2,5x), "Infinito" (balas perto de você quase param), Haki (atravessa escudos), três espadas, dash que chuta e queima, dash que deixa fogo, ressonância (o dano pula para outro monstro), aura de fogo, cães permanentes.

Os **540 itens gerados** usam isso: o **objeto** decide o gatilho (anel = ao acertar, bota = ao dar dash, coroa = ao matar, capa = ao levar dano, sino = no parry, relógio = a cada X segundos...) e o **elemento** decide o efeito (fogo = chão em chamas, gelo = congela em volta, vidro = anel de cacos, lâmina = lâminas giram...). Ex.: *Bota de Brasa: ao dar dash, o chão pega fogo*.

Os **itens de referência** ganharam efeitos especiais, e há itens de **Jujutsu Kaisen** (Punho Divergente, Faísca Negra, Seis Olhos, Cães Divinos, Boneco de Palha, Técnica Reversa, Dedo do Rei das Maldições, Energia Amaldiçoada) e de **One Piece** (Frutas da Borracha, do Fogo e do Gelo, Haki do Armamento, Estilo de Três Espadas, Perna do Diabo, Mapa da Grande Rota). Entre os ativos estão as Expansões de Domínio, Roxo, Azul, Vermelho, Haki do Rei, Room: Shambles, Fruta do Tremor, Coup de Burst e Tambores da Libertação.

### Transformações

Juntar **3 itens de uma família** (qualquer etiqueta da lista conta, cada item vale uma vez) transforma a vela, como no Isaac: visual novo e um poder grande. Ficam em `public/dados/transformacoes.json`. Em quem não é vela (Luiz, Ana, Luizãooo, heróis), a aura ganha a cor da transformação.

| Transformação | Família | Poder |
|---|---|---|
| Vela de Igreja | Luz, Vela, Lanterna, Coração | atira para trás e para os lados, cura ao limpar |
| Vela Vodu | Sangue, Sombra, Máscara, Dente | abates curam, a maldição pula entre monstros |
| Vela a Vapor | Raio, Relógio, Pedra, Tempo | descarga elétrica a cada 3s |
| Vela Bruxa | Veneno, Frasco, Olho | o dash deixa veneno; veneno 2x mais forte |
| Vela Anjo | Vento, Pena, Bota, Capa | +1 dash, +20% velocidade, auréola e asas |
| Vela Demônio | Fogo, Pólvora, Osso | todo monstro que morre explode; chifres |
| Vela Fantasma | Sombra, Espelho, Eco, Cristal | balas atravessam paredes |
| Vela Rei | Ouro, Coroa, Moeda, Sorte, Dado | cera em dobro, sorte e crítico |

### Ver as sinergias

- Ao pegar um item aparece uma linha com as etiquetas dele e quanto falta para a próxima sinergia (ex.: `FOGO 2/3 · ANEL 1/3`). Quando falta só 1 para alguma, aparece em verde: *Falta 1 de FOGO para uma sinergia!*
- Na pausa, a linha **ETIQUETAS** mostra todas as suas, da que você mais tem para a que menos tem.
- Equilíbrio: quando vêm de itens, o escudo volta no máximo a cada 6s, ficar intocável a cada 2,5s e a cura a cada 0,8s (os ativos não têm esse limite).

### Etiquetas: todo item combina com todo item

Cada item tem **etiquetas**: o tipo de objeto (anel, bota, coroa...) e o elemento (fogo, gelo, raio, sombra, ouro...). Os itens feitos à mão que não têm etiqueta ganham as do próprio efeito (balas que incendeiam = fogo, mais cera = ouro). As sinergias olham as etiquetas:

- **3 ou 5 do mesmo elemento**: ex.: 3 de Fogo = PIRA, 5 de Fogo = INFERNO (e a chama fica vermelha).
- **3 do mesmo objeto**: ex.: 3 Anéis = O SENHOR DOS ANÉIS.
- **2 + 2 de elementos que combinam**: ex.: Fogo + Gelo = VAPOR, Raio + Vento = TROVOADA.

As sinergias por etiqueta ficam em `sinergias_geradas.json`, que é gerado por `scripts/gerarConteudo.mjs`. Para mudar uma, edite o script e rode `npm run gerar`.

### Raridade (tier)

| Tier | Cor | Chance no sorteio |
|---|---|---|
| Comum | branco | 55 |
| Incomum | verde | 28 |
| Rara | azul | 12 |
| Épica | roxo | 4 |
| **Mítica** | laranja | 1 |

As armas míticas ganham anúncio com câmera lenta e brilho, e brilham mais no chão. As três de estimação têm desenho e som próprios: **TETE** (o pug que atira latidos "AU!"), **NIX** (a gata preta) e **YUUMI** (a gata tigrada cinza de patinhas brancas), que atiram miados "MIAU".

### Como as balas funcionam

Toda bala carrega **modificadores**. A arma traz os dela, e cada item e sinergia **soma** os seus por cima. Por isso qualquer item funciona com qualquer arma.

| Modificador | Efeito |
|---|---|
| multiplos | tiros extras |
| ricochete | quica nas paredes |
| teleguiado | curva em direção ao monstro |
| perfura | atravessa monstros |
| fragmenta | se parte em pedaços ao acertar |
| explosao | explode (raio) |
| eletrico | raio pula para outros monstros |
| congela / veneno / queima | estados nos monstros |
| espectral | atravessa paredes |
| bumerangue | vai e volta |
| tamanho / velBala | balas maiores / mais rápidas |
| traseiro | também atira para trás |
| duploTiro | chance de atirar duas vezes |

Exemplo: **Escopeta + Olho de Vidro + Mola** = 7 chumbos teleguiados que quicam nas paredes.

### Armas *(gerado)*

<!-- gerado:armas -->
**70 armas** (1 inicial · 20 comum · 21 incomum · 16 rara · 7 épica · 5 mítica), das míticas para as comuns.

| Arma | Descrição | Dano | Tiros/s | Pente | Munição | Especial | Raridade |
|---|---|---|---|---|---|---|---|
| TETE | O pug lendário. Late tão alto que os latidos perseguem, atravessam e explodem. | 3.5 x3 | 6.3 | 24 | ∞ | perfura 3, explode (raio 12), teleguiada | **mítica** |
| Bomba de Energia Coletiva | Junta a energia de todos: uma esfera gigante e lenta que apaga a sala. | 30 | 0.6 | 3 | 18 | perfura tudo, explode (raio 60), puxa monstros | **mítica** |
| BFG de Cera | A Grande Arma. Uma bola verde que eletrocuta tudo no caminho e explode. | 20 | 0.8 | 4 | 24 | explode (raio 50), raio em cadeia (4) | **mítica** |
| NIX | A gata preta. Miados de sombra que atravessam paredes, perseguem e dão choque. | 3 x2 | 5.0 | 18 | ∞ | perfura 2, teleguiada, raio em cadeia (2) | **mítica** |
| YUUMI | A gata tigrada cinza de patinhas brancas. Miados que quicam pela sala e viram novelos explosivos. | 3.2 x2 | 5.6 | 20 | ∞ | explode (raio 8), 3 fragmentos, quica 3x | **mítica** |
| Polaroid do Luiz | Clique! O flash atordoa e atravessa. Sai uma foto do Luiz a cada tiro. | 3.4 | 3.1 | 10 | ∞ | perfura 3, congela 40% | **épica** |
| Onda Kame | Junta as mãos e solta um raio de energia azul que atravessa tudo. | 6 | — | 8 | 64 | laser instantâneo | **épica** |
| Agulhador Rosa | Agulhas rosas que perseguem e explodem quando juntam. | 1.2 | 14.3 | 30 | 300 | perfura 1, explode (raio 8), teleguiada, veneno | **épica** |
| Mochila de Prótons | Raio contínuo que prende fantasmas. Não cruze os raios. | 1.4 | — | 60 | 600 | laser instantâneo, congela 15% | **épica** |
| O Gordinho | Lançador nuclear de bolso. Um tiro, uma sala a menos. | 25 | 0.5 | 1 | 6 | explode (raio 70) | **épica** |
| Velha Pintada | Gatling gigante. Ninguém aguenta muito tempo na frente dela. | 1.1 | 28.6 | 200 | 800 | perfura 1, esquenta | **épica** |
| Corte da Lua Negra | Ondas de energia em forma de lâmina que atravessam tudo. | 5 | 2.2 | 8 | 80 | perfura tudo, bumerangue | **épica** |
| Gatling de Cera 🔒 *(Imparável)* | Demora a esquentar. Depois, ninguém para. | 0.6 | 22.2 | 120 | 480 | esquenta | rara |
| Granada Cluster 🔒 *(Intocável)* | Explode e espalha 8 fragmentos. | 4 | 1.1 | 3 | 12 | explode (raio 22), 8 fragmentos | rara |
| Raio de Pavio 🔒 *(Luz no Abismo)* | Laser instantâneo que atravessa tudo que é vivo. | 3 | — | 8 | 48 | laser instantâneo | rara |
| Canhão do Vazio 🔒 *(A Última Chama)* | Um buraco negro lento que puxa tudo e explode. | 9 | 0.7 | 2 | 10 | explode (raio 40), puxa monstros | rara |
| Canhão de Braço Azul | Tiros de energia rápidos. Segura e solta, robô azul. | 2.4 | 7.1 | 3 | ∞ | — | rara |
| Raio Zumbizador | Bolas verdes que explodem. Os zumbis odeiam. | 4 | 3.3 | 20 | 160 | explode (raio 18), teleguiada | rara |
| Arma de Portais | Disparos que atravessam paredes. Agora você pensa com portais. | 2.6 | — | 12 | 120 | laser instantâneo | rara |
| Canhão de Trilho | Um raio que atravessa tudo e todos. Recarrega devagar. | 12 | — | 4 | 40 | laser instantâneo | rara |
| Esfera Espiral | Uma esfera girando que puxa os monstros e explode. | 7 | 1.1 | 4 | 32 | explode (raio 28), puxa monstros | rara |
| Tiro Espiritual | Um tiro de dedo só, mas que atravessa a sala inteira. | 14 | 1.0 | 1 | ∞ | perfura tudo | rara |
| Rifle Pósitron | Raio laranja de longuíssimo alcance. Precisa de toda a energia do país. | 9 | — | 5 | 40 | laser instantâneo | rara |
| Pistola de Ouro | Uma bala, um alvo. Mata quase tudo com um tiro. | 30 | 1.0 | 1 | 12 | perfura 4 | rara |
| Arpão do Escorpião | Vem cá! O arpão atravessa e puxa os monstros. | 5 | 1.7 | 5 | 50 | perfura 3, veneno, puxa monstros | rara |
| Ébano e Marfim | Duas pistolas, o dobro de estilo. Munição infinita. | 1.6 | 11.1 | 24 | ∞ | — | rara |
| Rifle de Pulso | Rajada militar com um lança-granadas embaixo. | 1.4 | 14.3 | 40 | 240 | 2 fragmentos | rara |
| Granada de Mão Santa | Conte até três. Nem dois, nem quatro. Três. | 14 | 0.8 | 3 | 18 | explode (raio 46) | rara |
| Canhão de Mão | Lento e brutal. Atravessa 4 inimigos. | 6 | 1.7 | 6 | 36 | perfura 4 | incomum |
| Lança-Bombas | Bombas que explodem em área. | 7 | 1.3 | 4 | 16 | explode (raio 30) | incomum |
| Bastão Tesla | O raio salta para mais 3 inimigos. | 1.2 | 4.5 | 20 | 120 | raio em cadeia (3) | incomum |
| Serra Bumerangue | Vai, corta tudo no caminho e volta. | 2 | 2.0 | 4 | 60 | perfura tudo, bumerangue | incomum |
| Vela Romana | 3 fogos de artifício teleguiados que explodem. | 2 x3 | 1.4 | 6 | 36 | explode (raio 14), teleguiada | incomum |
| Pregadora | Pregos a toda velocidade. Ninguém fica de pé. | 0.9 | 16.7 | 50 | 300 | perfura 1 | incomum |
| Canhão Flak | Uma bola de estilhaços que se parte ao bater. | 3 | 1.4 | 6 | 48 | 8 fragmentos | incomum |
| Luva da Gravidade | Um campo que puxa os monstros para o mesmo ponto. | 2 | 1.3 | 4 | 40 | raio em cadeia (3), puxa monstros | incomum |
| Lança-Tinta | Jatos de tinta que deixam os monstros lentos. | 0.5 | 22.2 | 70 | 400 | congela 12%, fogo | incomum |
| Estrela Cuspida | Engole e cospe uma estrela que quica pela sala. | 3 | 2.0 | 6 | ∞ | quica 4x | incomum |
| Blaster do Contrabandista | Atira primeiro. Raio vermelho e forte. | 4.5 | 2.9 | 8 | ∞ | perfura 4 | incomum |
| Pistola de Fase | No modo atordoar: congela quem acerta. | 1.5 | — | 10 | 100 | laser instantâneo, congela 50% | incomum |
| Chave de Fenda Sônica | Ondas sônicas que passam pelas paredes. | 1.4 | 8.3 | 20 | 200 | raio em cadeia (3) | incomum |
| Laser do Patrulheiro Espacial | Ao infinito e além! Laser fininho e rápido. | 1.6 | — | 16 | 160 | laser instantâneo | incomum |
| Espingarda do Exterminador | Hasta la vista. Escopeta de alavanca muito forte. | 1.6 x8 | 1.8 | 6 | 40 | — | incomum |
| Tiara Lunar | Pela lua! Uma tiara que vai e volta cortando. | 3 | 2.0 | 2 | ∞ | perfura tudo, bumerangue | incomum |
| Revólver do Caçador de Recompensas | Até mais, cowboy espacial. Seis tiros certeiros. | 4 | 5.6 | 6 | ∞ | perfura 4 | incomum |
| Arco do Herói | Flechas que atravessam e vão longe. | 4 | 2.0 | 1 | ∞ | perfura 2, veneno | incomum |
| Rajada de Socos | ORA ORA ORA! Uma chuva de socos de energia. | 0.9 | 25.0 | 60 | 600 | — | incomum |
| Luva do Alquimista de Fogo | Um estalar de dedos e tudo pega fogo. | 0.8 | 22.2 | 70 | 300 | explode (raio 10), fogo | incomum |
| Lança-Trovão | Lanças explosivas para gigantes. Dedique o seu coração. | 5 | 1.3 | 2 | 24 | explode (raio 22), teleguiada | incomum |
| Escopeta | 7 chumbos. De perto, ninguém aguenta. | 1.1 x7 | 1.8 | 6 | 48 | — | comum |
| Submetralhadora | Chuva de balas. Segura o gatilho. | 0.75 | 13.3 | 32 | 192 | — | comum |
| Maçarico | Jato de fogo curto que incendeia. | 0.45 | 22.2 | 70 | 280 | fogo | comum |
| Bate-Volta | Balas pesadas que quicam 3 vezes nas paredes. | 2.2 | 3.3 | 8 | 64 | quica 3x | comum |
| Pistola Vagalume | Vagalumes que perseguem os monstros. | 1.3 | 6.3 | 14 | 112 | teleguiada | comum |
| Pistola de Gelo | Chance alta de congelar quem acertar. | 1.4 | 4.0 | 12 | 96 | congela 35% | comum |
| Zarabatana Tóxica | Agulhas que envenenam e atravessam. | 0.8 | 5.6 | 16 | 128 | perfura 1, veneno | comum |
| Zapper Laranja | Mira na tela e atira. O cachorro ri de você. | 3 | 2.5 | 6 | ∞ | — | comum |
| Estilingue | Pedrinhas que quicam nas paredes. | 1.6 | 3.3 | 10 | ∞ | quica 2x | comum |
| Pistola de Água | Pouco dano, muito empurrão. E deixa lento. | 0.6 | 12.5 | 40 | ∞ | congela 8% | comum |
| Lança-Argolas | Argolas douradas que quicam e perseguem. | 1.4 | 3.3 | 8 | ∞ | quica 3x, teleguiada | comum |
| Arremessa-Bolas de Monstrinho | Vai, bolinha! Quica e volta para a mão. | 2.4 | 2.2 | 6 | ∞ | bumerangue | comum |
| Tubarãozinho | Uma metralhadorinha com cara de tubarão. Come munição. | 0.6 | 20.0 | 50 | 400 | — | comum |
| Lança-Confete | Festa! Confetes coloridos para todo lado. | 0.8 x6 | 1.4 | 6 | 90 | — | comum |
| Canhão de Bolas de Neve | Bolas de neve grandes que congelam. | 3 | 2.0 | 6 | 60 | congela 30% | comum |
| Rojão Junino | Olha o rojão! Explode em fogos coloridos. | 2.4 | 1.7 | 6 | 30 | explode (raio 16), teleguiada | comum |
| Lança-Abelhas | Um enxame de abelhas que persegue e envenena. | 0.7 x4 | 6.3 | 14 | 160 | teleguiada, veneno | comum |
| Corneta do Juízo | Uma onda de som que empurra todo mundo. | 0.7 x7 | 1.8 | 6 | 70 | — | comum |
| Lança-Dardos de Espuma | Dardos que quicam no chão... e nas paredes. | 1.2 | 5.0 | 12 | ∞ | perfura 1, quica 1x, veneno | comum |
| Choque do Rato Amarelo | Choques que pulam entre os monstros. | 1.4 | 2.9 | 20 | 140 | raio em cadeia (2) | comum |
| Pistola de Pavio | Confiável. Munição infinita. | 1.6 | 5.0 | 10 | ∞ | — | inicial |
<!-- /gerado:armas -->

### Itens *(gerado)*

Itens **malditos** dão um bônus forte com um preço: o jogador precisa pensar antes de pegar. Alguns itens só dão vida (Bolo de Cera, Vela Votiva). Itens com **visual** mudam a vela: cor da cera, cor da chama, número de chamas e acessórios.

<!-- gerado:itens -->
**688 itens**: 148 feitos à mão (93 deles referências 🎬) e 540 gerados. 20 são **malditos** (☠: bônus forte com um preço).

Os **540 gerados** combinam 30 objetos com 18 elementos (ex.: *Anel de Brasa*, *Bota do Trovão*). O objeto dá um atributo, o elemento muda as balas:

- **Objetos:** Anel, Colar, Amuleto, Pavio, Lente, Frasco, Pena, Dente, Olho, Coração, Moeda, Chave, Pergaminho, Runa, Sino, Espelho, Vela, Cristal, Osso, Máscara, Luva, Bota, Capa, Coroa, Relógio, Dado, Carta, Bússola, Lanterna, Pedra
- **Elementos:** Fogo, Gelo, Raio, Veneno, Pólvora, Vidro, Mola, Olhar, Lâmina, Sombra, Luz, Sangue, Ouro, Tempo, Eco, Vento, Terra, Sorte

Os feitos à mão:

| Item | Efeito | Etiquetas | Raridade | Muda a vela |
|---|---|---|---|---|
| Pavio Duplo | Mais um tiro, um pouco mais fraco | *(pelo efeito)* | incomum | chamas: 2 |
| Candelabro | Três chamas, três tiros | *(pelo efeito)* | rara | chamas: 3 |
| Olho de Vidro | Balas perseguem os monstros | *(pelo efeito)* | incomum | acessorio: monoculo |
| Mola Velha | Balas quicam nas paredes | *(pelo efeito)* | comum | acessorio: mola |
| Cristal Rachado 🔒 *(Alquimista)* | Balas se partem em 3 ao acertar | *(pelo efeito)* | incomum | cera: #c4ecff |
| Pólvora Negra | Balas explodem ao acertar | *(pelo efeito)* | incomum | cera: #5a5464 |
| Gelo Eterno | Chance de congelar | *(pelo efeito)* | comum | chama: ciano |
| Bateria Velha | Raios saltam entre os monstros | *(pelo efeito)* | incomum | acessorio: antena |
| Lençol Fantasma | Balas atravessam paredes | *(pelo efeito)* | incomum | acessorio: lencol |
| Cera Elástica | Balas voltam como bumerangue | *(pelo efeito)* | incomum | cera: #ffc2e2 |
| Lente de Aumento | Balas enormes e fortes, porém lentas | *(pelo efeito)* | incomum | acessorio: oculos_grandes |
| Frasco de Peçonha | Balas envenenam | *(pelo efeito)* | comum | chama: verde |
| Chama Azul | +30% de dano | *(pelo efeito)* | comum | chama: azul |
| Coração de Cera | +30 de chama máxima | *(pelo efeito)* | comum | cera: #ffd0d8 |
| Sangue Quente | Cada abate cura 1 de chama | *(pelo efeito)* | incomum | acessorio: olhos_vermelhos |
| Relógio Derretido | Balas inimigas 20% mais lentas | *(pelo efeito)* | incomum | acessorio: relogio |
| Óculos Escuros | +15% de crítico | *(pelo efeito)* | comum | acessorio: oculos |
| Chapéu de Bruxa | Balas curvam e vão mais longe | *(pelo efeito)* | incomum | acessorio: chapeu |
| Coroa do Rei Podre 🔒 *(Infernal)* | +25% de dano e cera em dobro | *(pelo efeito)* | rara | acessorio: coroa |
| Pente Estendido | +50% de balas por pente | *(pelo efeito)* | comum | — |
| Mãos Rápidas | Recarrega 40% mais rápido | *(pelo efeito)* | comum | — |
| Gatilho Leve | Atira 25% mais rápido | *(pelo efeito)* | comum | — |
| Asas de Mariposa | Mais rápido, dash recarrega antes | *(pelo efeito)* | comum | acessorio: asas |
| Pavio Longo | A chama se consome 40% mais devagar | *(pelo efeito)* | comum | — |
| Vela Aromática | Gotas de cera curam o dobro | *(pelo efeito)* | comum | cera: #e2d0ff |
| Vidro Derretido | Quem encosta em você leva dano | *(pelo efeito)* | comum | cera: #d4fff4 |
| Orbe de Cera | Uma bola gira em volta e bloqueia balas *(especial: orbe)* | *(pelo efeito)* | incomum | — |
| Velinha Gêmea 🔒 *(Regicida)* | Uma irmãzinha que atira junto *(especial: gemea)* | *(pelo efeito)* | rara | — |
| Ímã | Puxa cera e itens de longe | *(pelo efeito)* | comum | — |
| Pote de Mel | Cada gota de cera vale 2 | *(pelo efeito)* | incomum | cera: #ffe08a |
| Chumbo Grosso | Balas mais fortes que empurram longe | *(pelo efeito)* | comum | — |
| Gatilho Duplo | 20% de chance de atirar duas vezes | *(pelo efeito)* | incomum | — |
| Ampulheta | Esquiva perfeita mais fácil e mais lenta | *(pelo efeito)* | comum | — |
| Espelho Quebrado | Parry com janela maior e rebate mais | *(pelo efeito)* | incomum | — |
| Trevo de 4 Folhas 🔒 *(Teimosia)* | +5% de crítico e mais sorte | *(pelo efeito)* | comum | — |
| Lágrima Invertida | Também atira para trás | *(pelo efeito)* | comum | — |
| Pólvora Fina | Balas mais rápidas e com mais alcance | *(pelo efeito)* | comum | — |
| Cera Quente | Balas incendeiam | *(pelo efeito)* | comum | chama: vermelha |
| Lamparina | Muito mais luz nas salas escuras | *(pelo efeito)* | comum | — |
| Casca de Cera | Um escudo que bloqueia 1 golpe por sala *(especial: escudo)* | *(pelo efeito)* | incomum | — |
| Bolo de Cera | +25 de chama máxima e enche a chama *(especial: cura)* | *(pelo efeito)* | comum | — |
| Vela Votiva | +15 de chama máxima e cura 3 a cada sala limpa | *(pelo efeito)* | comum | — |
| ☠ Vela Grossa | +50 de chama máxima, mas -15% de velocidade | *(pelo efeito)* | incomum | cera: #fff0c8 |
| ☠ Pacto Sombrio | +60% de dano, mas -30 de chama máxima | *(pelo efeito)* | incomum | chama: roxa, acessorio: olhos_vermelhos |
| ☠ Pavio Curto | Atira 40% mais rápido, mas a chama queima 50% mais rápido | *(pelo efeito)* | incomum | — |
| ☠ Cera de Vidro 🔒 *(Amaldiçoado)* | Dano em dobro, mas você também leva dano em dobro | *(pelo efeito)* | rara | cera: #d4f4ff |
| ☠ Coração Partido | +2 cargas de dash, mas -20 de chama máxima | *(pelo efeito)* | incomum | — |
| ☠ Lente Rachada | +3 tiros espalhados, mas cada um com 55% do dano | *(pelo efeito)* | incomum | — |
| ☠ Sapato de Chumbo | +40% de dano, mas -25% de velocidade | *(pelo efeito)* | comum | acessorio: botas |
| ☠ Chama Faminta | Cada abate cura 3, mas a chama queima o dobro | *(pelo efeito)* | incomum | chama: vermelha |
| ☠ Ampola Sangrenta | +40 de chama máxima, mas a cera cura metade | *(pelo efeito)* | comum | — |
| ☠ Olho do Apagador | +25% de crítico, mas sua luz cai 40% | *(pelo efeito)* | incomum | acessorio: olhos_azuis |
| ☠ Moeda Maldita | Cera vale o triplo, mas os monstros têm +30% de vida | *(pelo efeito)* | incomum | cera: #e8c25a |
| ☠ Pavio de Dinamite | Balas explodem forte, mas você atira bem mais devagar | *(pelo efeito)* | rara | — |
| ☠ Asas Queimadas | +30% de velocidade e dash rápido, mas -20 de chama máxima | *(pelo efeito)* | comum | acessorio: asas |
| Cogumelo Vermelho 🎬 | +25 chama máx e balas maiores. Você cresceu! Ao levar dano: empurra tudo. | Terra, Coração | incomum | — |
| Cogumelo Verde 🎬 | +40 chama máx. Uma vida extra, quase. | Coração, Sorte | rara | — |
| Estrela Piscante 🎬 | +15% velocidade, esquiva perfeita fácil, chama dourada. O dash machuca quem estiver no caminho. | Vento, Luz | rara | chama: dourada |
| Triângulo Dourado 🎬 | +10% dano, +10% velocidade, +10 chama máx. A cada 10 de combo, um feixe dourado gira. | Ouro, Luz | rara | — |
| Recipiente de Coração 🎬 | +20 chama máx. | Coração | comum | — |
| Frasco de Estus 🎬 | +5 de chama a cada sala limpa. | Frasco, Fogo | incomum | — |
| Fogueira Acesa 🎬 | A chama queima 20% mais devagar. Descanse aqui. Ao limpar a sala, cura 6. | Fogo, Vela | incomum | — |
| Argola Dourada 🎬 | +15% velocidade e puxa a cera de longe. | Anel, Vento | incomum | — |
| Cubo Companheiro 🎬 | Um cubinho fiel gira em volta e bloqueia balas. *(especial: orbe)* | Cristal | incomum | — |
| ☠ O Bolo é uma Mentira 🎬 | +40 chama máx, mas ela queima 30% mais rápido. | Coração | incomum | — |
| Pé de Cabra do Cientista 🎬 | Monstros que encostam em você levam dano. | Osso, Terra | comum | — |
| Pastilha de Poder 🎬 | Encostar machuca os monstros. +8% velocidade. Ao matar: corre mais por 2s. | Ouro | incomum | — |
| Dado de Vinte Lados 🎬 | +8% crítico. Tirou 20! No crítico (20%): explosão. | Dado, Sorte | incomum | — |
| Poção de Mana 🎬 | Atira 12% mais rápido. Chama azul. | Frasco, Eco | incomum | chama: azul |
| Poção de Vida 🎬 | +15 chama máx e enche a chama. *(especial: cura)* | Frasco, Sangue | comum | — |
| Moeda do Encanador 🎬 | +20% cera. | Moeda, Ouro | comum | — |
| Elmo Verde Espartano 🎬 | Um escudo por sala e -15% de dano recebido. *(especial: escudo)* | Capa, Terra | rara | — |
| Bichinho Virtual 🎬 | Uma velinha de estimação atira junto com você. *(especial: gemea)* | Vela | rara | — |
| Cartucho Assoprado 🎬 | Recarga 25% mais rápida. Era só assoprar. | Pergaminho | comum | — |
| Código Secreto 🎬 | Cima, cima, baixo, baixo... +30 chama máx e +1 dash. | Pergaminho, Sorte | rara | — |
| Gorro do Herói 🎬 | +15% alcance e balas que perseguem. | Olhar | incomum | — |
| Esfera de Quatro Estrelas 🎬 | +1 sorte e +25% cera. Faltam seis. Ao limpar (20%): 8 gotas de cera. | Sorte, Ouro | incomum | — |
| Semente dos Deuses 🎬 | Enche a chama e dá +10 chama máx. *(especial: cura)* | Terra | comum | — |
| Chapéu de Palha 🎬 | +1 sorte e +8% velocidade. Vou ser o rei! | Sorte, Vento | incomum | — |
| ☠ Caderno da Morte 🎬 | +40% dano, mas a chama queima 25% mais rápido. A cada 30 tiros, mata os fracos. | Sombra, Pergaminho | rara | — |
| Bandana da Vila Oculta 🎬 | Clones das sombras: +1 tiro. Ao dar dash: clones por 2s. | Eco | rara | — |
| Olho Vermelho Copiador 🎬 | Balas perseguem e a esquiva perfeita fica fácil. No parry: copia dois tiros. | Olho, Olhar | rara | — |
| ☠ Máscara de Pedra 🎬 | Abates curam 1, mas -20% luz. Vampirismo. | Máscara, Sangue | incomum | — |
| Capa da Tropa de Exploração 🎬 | +1 dash e +10% velocidade. | Capa, Vento | incomum | — |
| Pedra Filosofal 🎬 | +30% cera e abates curam 0.5. | Cristal, Sangue | rara | — |
| Óculos do Grande Irmão 🎬 | +15% dano e balas maiores. Quem você pensa que eu sou? | Lente | incomum | acessorio: oculos_grandes |
| Ramen Quentinho 🎬 | +4 de chama a cada sala limpa. | Frasco | comum | — |
| Luva de Círculo Alquímico 🎬 | Balas incendeiam e explodem de leve. | Luva, Fogo | incomum | — |
| ☠ O Um Anel 🎬 | Balas atravessam paredes e você some... mas leva +20% de dano. | Anel, Sombra | rara | acessorio: lencol |
| Capa da Invisibilidade 🎬 | Esquiva perfeita fácil e +5% crítico. | Capa, Sombra | incomum | acessorio: lencol |
| Vira-Tempo 🎬 | Dash volta 25% antes e a câmera lenta dura mais. Ao levar dano: o tempo desacelera. | Relógio, Tempo | incomum | — |
| Pílula Vermelha 🎬 | Câmera lenta 50% maior e esquiva fácil. Veja o código. Ao dar dash: tempo de bala. | Tempo, Sombra | incomum | — |
| Pílula Azul 🎬 | +4 chama por sala e a chama dura mais. Ignorância é uma bênção. | Luz | comum | — |
| Toalha do Mochileiro 🎬 | Não entre em pânico: -10% dano recebido e +0.42 sorte. | Capa, Sorte | comum | — |
| Pato de Borracha 🎬 | +5% crítico e +0.5 sorte. Ele escuta seus problemas. Ao levar dano (50%): 5 críticos. | Sorte | comum | — |
| Lata de Espinafre 🎬 | +15% dano e +30% empurrão. | Terra | incomum | — |
| Bigorna de Desenho Animado 🎬 | Balas enormes e pesadas, mas mais lentas. | Pedra, Terra | incomum | — |
| ☠ Caixa de Pandora 🎬 | +35% dano e +1 sorte, mas monstros têm +20% vida. Ao entrar: 2 meteoros caem. | Sombra | rara | — |
| Cálice Sagrado 🎬 | Abates curam 0.6 e a cera cura +20%. Escolheu bem. | Ouro, Luz | rara | — |
| Chapéu do Arqueólogo 🎬 | +1 sorte. Tesouros aparecem mais. | Sorte | incomum | — |
| Cristal de Sabre 🎬 | Balas atravessam 2 monstros. | Cristal, Lâmina | incomum | — |
| Elmo de Beskar 🎬 | -15% dano recebido. Este é o caminho. | Máscara, Terra | incomum | — |
| Reator no Peito 🎬 | +20 chama máx e raio que pula 1x. A cada 5s: raio em cadeia. | Coração, Raio | rara | — |
| Escudo Redondo Estrelado 🎬 | Um escudo por sala, e as balas voltam como bumerangue. *(especial: escudo)* | Capa | rara | — |
| Anel do Juramento Verde 🎬 | +12% dano e chama verde. Na noite mais densa... A cada 20 tiros: construções verdes giram em você. | Anel, Luz | incomum | chama: verde |
| Cinto de Utilidades 🎬 | +30% pente e recarga 20% mais rápida. | Pergaminho | incomum | — |
| Cartucho de Teia 🎬 | 15% de chance de grudar (congelar) o monstro. | Mola | comum | — |
| Rosquinha Rosa 🎬 | +15 chama máx, -5% velocidade. Hmmm... | Coração | comum | — |
| Cabine Azul de Bolso 🎬 | Maior por dentro: +40% pente e +15% alcance. Ao levar dano (25%): some e aparece longe. | Tempo | incomum | — |
| Pisca-Pisca de Natal 🎬 | +40% luz. Alguém está tentando falar com você. | Luz | comum | — |
| ☠ Cristal Azul 🎬 | Atira 25% mais rápido, mas a chama queima 20% mais. | Vidro | incomum | — |
| Ovo de Dragão 🎬 | Balas incendeiam e +10 chama máx. Ao matar (20%): fogo no chão. | Fogo | incomum | — |
| Medalhão do Bruxo 🎬 | +5% crítico e balas que perseguem um pouco. Ao entrar: 3 críticos. | Amuleto, Olhar | incomum | — |
| Café Danado de Bom 🎬 | Atira 12% mais rápido. | Eco | comum | — |
| Bola de Vôlei Amiga 🎬 | Uma amiga redonda gira em volta e bloqueia balas. *(especial: orbe)* | Sorte | incomum | — |
| ☠ Dedo do Rei das Maldições 🎬 🔒 *(Apocalipse)* | +25% dano. Ao matar (20%): cortes retalham a sala. Monstros +15% vida. | Sangue, Osso | rara | — |
| Punho Divergente 🎬 🔒 *(Grande Alquimista)* | Cada acerto bate de novo um instante depois (50% do dano). | Eco, Luva | rara | — |
| Faísca Negra 🎬 🔒 *(Lenda)* | Às vezes o golpe sai 2,5x mais forte, com um raio negro. | Raio, Sombra | rara | — |
| Seis Olhos 🎬 🔒 *(Espelho Quebrado)* | Infinito: balas inimigas perto de você ficam quase paradas. +10% crítico. | Olho, Tempo | rara | — |
| Técnica Reversa 🎬 | No parry: cura 6. +10 chama máx. | Coração, Luz | incomum | — |
| Cães Divinos 🎬 🔒 *(Ossos no Lugar)* | Dois cães (um preto, um branco) caçam os monstros para sempre. | Sombra, Dente | rara | — |
| Boneco de Palha 🎬 | Ressonância: acertar um monstro machuca outro (30%). | Raio, Máscara | incomum | — |
| Energia Amaldiçoada 🎬 | A cada 6 tiros: 3 balas roxas que perseguem. | Olhar, Sombra | incomum | — |
| Fruta da Borracha 🎬 🔒 *(Mar Calmo)* | Gomu Gomu: balas vão e voltam e empurram muito. Dash volta 40% antes. | Mola, Vento | rara | — |
| Fruta do Fogo 🎬 | Balas incendeiam e o dash deixa fogo. Chama vermelha. | Fogo, Vento | rara | chama: vermelha |
| Fruta do Gelo 🎬 🔒 *(Jardim Apagado)* | 25% de congelar, e o dash deixa um rastro de gelo. | Gelo, Vento | rara | chama: ciano |
| Haki do Armamento 🎬 | +20% dano e atravessa escudos. | Terra, Lâmina | rara | — |
| Estilo de Três Espadas 🎬 🔒 *(Ferro Derretido)* | Cada tiro também solta dois cortes de espada. | Lâmina, Eco | rara | — |
| Perna do Diabo 🎬 | O dash chuta e queima os monstros. +10% velocidade. | Fogo, Bota | incomum | — |
| Mapa da Grande Rota 🎬 | Ao entrar numa sala: revela o mapa. +30% cera. | Ouro, Pergaminho | incomum | — |
| Anel do Senhor do Fogo 🎬 | Aura: quem chega perto queima. | Fogo, Anel | rara | — |
| Tatuagem "E" 🎬 | A tatuagem do Luiz: +12% dano, +8% crítico. No crítico (25%): raio em cadeia. | Sorte, Runa | rara | — |
| Sorriso do Luiz 🎬 | A foto do Luiz no bolso: com pouca chama, ele aparece, cura 8 e protege (a cada 4s). +10 chama máx. | Coração, Luz | rara | — |
| Capuz de Pelúcia 🎬 | Quentinho: a chama queima 20% mais devagar e -10% de dano recebido. | Capa, Terra | incomum | — |
| Bigode Lendário 🎬 | Monstros que encostam levam 6 e voam longe. +25 chama máx. | Terra, Coração | rara | — |
| Pavio Original 🎬 🔒 *(Marca: Velinha)* | O pavio da primeira vela: +10 chama máx. Ao limpar a sala, cura 4. | Luz, Vela | incomum | — |
| Caneta do Criador 🎬 🔒 *(Marca: Luiz)* | Quem fez o jogo desenha o que precisa: ao matar (6%), aparece um baú. | Sorte, Pergaminho | rara | — |
| Foto Revelada 🎬 🔒 *(Marca: Ana)* | Ao entrar numa sala: um flash trava todos por 1,2s e seus 2 próximos tiros são críticos. | Luz, Olho | rara | — |
| Abraço de Urso 🎬 🔒 *(Marca: Luizãooo)* | +15 chama máx. Ao levar dano: empurra tudo em volta e cura 5. | Terra, Coração | rara | — |
| Palito de Reserva 🎬 🔒 *(Marca: Fósforo)* | Uma vez por partida: quando a chama acabar, você reacende com metade dela. | Fogo, Vela | rara | — |
| Óleo Eterno 🎬 🔒 *(Marca: Lamparina)* | A chama queima 30% mais devagar e ilumina 20% mais. | Luz, Frasco | incomum | — |
| Bolo Surpresa 🎬 🔒 *(Marca: Vela de Aniversário)* | Ao limpar a sala (10%): um item aparece num pedestal. | Sorte, Ouro | rara | — |
| Pedra de Isqueiro 🎬 🔒 *(Marca: Isqueiro)* | Ao dar dash: um anel de 8 faíscas de fogo. | Fogo, Bota | incomum | — |
| Caldeirão Borbulhante 🎬 🔒 *(Marca: A Bruxinha)* | A cada 6s em combate: uma nuvem de veneno cai num monstro. | Veneno, Frasco | incomum | — |
| Brasão da Ordem 🎬 🔒 *(Marca: Cavaleiro)* | Um escudo por sala e -10% de dano recebido. *(especial: escudo)* | Terra, Capa | rara | — |
| Flecha Élfica 🎬 🔒 *(Marca: Elfa)* | A cada 6 tiros: uma flecha que atravessa tudo. | Lâmina, Olhar | incomum | — |
| Teclado do Criador 🎬 🔒 *(GG)* | A cada 15 tiros, aperta uma tecla aleatória: um efeito surpresa (explosão, raios, meteoros, lâminas...). | Eco, Sorte | rara | — |
| Grimório 🎬 🔒 *(Marca: Mago)* | Seu item ativo carrega 2 por sala limpa. | Tempo, Pergaminho | rara | — |
<!-- /gerado:itens -->

### Itens ativos *(gerado)*

São 110: os 10 primeiros ficam em `public/dados/ativos.json` (com código próprio em `usarAtivo()`), e os outros 100 são escritos em `scripts/conteudoAtivos.mjs` como listas de efeitos. Para mudar, edite o script e rode `npm run gerar`.

<!-- gerado:ativos -->
<details><summary>110 itens ativos</summary>

| Item ativo | Efeito | Recarga |
|---|---|---|
| Bomba de Cera | Explode tudo em volta. Abre paredes rachadas. | 2 salas |
| Sopro Sagrado | Apaga as balas inimigas e empurra os monstros. | 2 salas |
| Relógio Parado | Congela os monstros e freia as balas. | 3 salas |
| Pavio Reserva | Cura 40 de chama. | 4 salas |
| Espelho de Mão 🔒 *(Mestre do Parry)* | Parry automático por 3 segundos. | 3 salas |
| Pólvora Viva 🔒 *(Quebra-Ossos)* | Dano x2 e tiro rápido por 6 segundos. | 3 salas |
| Vela Fugaz 🔒 *(As Paredes Têm Ouvidos)* | Teleporta para a mira e explode lá. | 1 sala |
| Dado de Cera 🔒 *(Mil Velas Vingadas)* | Sorteia de novo os itens desta sala. | 2 salas |
| Castiçal Portátil 🔒 *(Desafio Aceito)* | Uma torre de luz atira por você (10s). | 3 salas |
| ☠ Sino do Apagador 🔒 *(Sem Fundo)* | Mata os monstros da sala. Custa 30 de chama. | 6 salas |
| Domínio: Vazio Infinito 🔒 *(O Primeiro Amanhecer)* | Informação infinita: todos os monstros travam por 5s e as balas somem. | 6 salas |
| Domínio: Santuário Malevolente 🔒 *(O Primeiro Amanhecer)* | Cortes invisíveis retalham a sala inteira por 4 segundos. | 6 salas |
| Técnica Proibida: Roxo | Junta o azul e o vermelho: uma esfera roxa que apaga tudo no caminho. | 5 salas |
| Lapso: Azul | Um ponto de atração onde você mira: suga os monstros. | 3 salas |
| Reversão: Vermelho | Repulsão: arremessa tudo para longe com uma explosão. | 3 salas |
| Haki do Rei | Os fracos desmaiam: todos travam por 3s e levam dano. | 5 salas |
| Room: Shambles | Troca de lugar com o monstro mais longe e corta a sala toda. | 3 salas |
| Fruta do Tremor | Racha o ar: terremoto que fere tudo e abre paredes. | 5 salas |
| Coup de Burst | Um tiro de canhão de cola: dash gigante e intocável. | 2 salas |
| Tambores da Libertação 🔒 *(O Primeiro Amanhecer)* | Gear 5: dano x2, +40% velocidade, intocável e cura (10s). | 8 salas |
| Granada de Fragmentação | Explosão grande onde você mira. | 2 salas |
| Bola de Energia do Lutador | Uma bola de energia gigante para frente. | 2 salas |
| Estrela da Invencibilidade | Intocável por 6s, mais rápido, e encostar machuca. | 6 salas |
| Poção Vermelha Grande | Cura 40 de chama. | 4 salas |
| Bomba de Pavio Curto | Explode em volta e solta 4 chamas em cruz. | 2 salas |
| Ocarina do Tempo | Toca a música: câmera lenta longa e cura. | 4 salas |
| Flechas de Luz | Um leque de 9 flechas de luz que atravessam. | 2 salas |
| Baú Mímico | Abre a boca: solta 15 gotas de cera... e morde. | 3 salas |
| Kit Médico | Cura 20 e dá um escudo. | 3 salas |
| Luva Antigravidade | Puxa tudo para onde você mira e solta numa explosão. | 3 salas |
| Ataque Aéreo | Pede reforço: 8 bombas caem nos monstros. | 5 salas |
| Escudo de Energia | Recarrega o escudo e fica intocável por 1,5s. | 2 salas |
| Moeda Dobrada | Cara: cera. Coroa: críticos. Dá os dois. | 2 salas |
| Totem da Imortalidade | Intocável por 2s e cura 15. | 4 salas |
| Bola de Neve Gigante | Leque de bolas de neve que congelam. | 2 salas |
| Cartucho Bônus | Munição cheia e 5 tiros de graça. | 3 salas |
| Bola de Captura | Joga a bola: um bichinho caça os monstros por 15s. | 4 salas |
| Jutsu dos Clones das Sombras | Dois clones atiram junto com você por 10s. | 4 salas |
| Esfera de Energia Coletiva | Levanta as mãos: uma esfera gigante e lenta. | 7 salas |
| Corte Lunar | Um leque de lâminas de energia negra. | 3 salas |
| Respiração do Trovão | Um dash relâmpago e raios em todos. | 3 salas |
| Respiração da Água | Ondas que cortam e empurram em volta. | 3 salas |
| Olho que Copia | Copia o golpe: as balas inimigas viram suas. | 3 salas |
| Página Arrancada | Escreve um nome: mata quem tem menos de 40% da vida. | 4 salas |
| Stand: Rajada de Socos | ORA ORA! Cadência x3 por 3s e 3 tiros de graça. | 4 salas |
| O Mundo Parado 🔒 *(Fora do Tempo)* | Para o tempo: tudo trava 4s e as balas somem. | 6 salas |
| Manto da Raposa | Chama laranja: dano x1,6 e lâminas de fogo por 8s. | 5 salas |
| Roda da Adaptação | Gira: escudo, cura e um golpe em tudo. | 5 salas |
| Grito do Titã | Um rugido que trava e empurra tudo. | 4 salas |
| Kunai Explosiva | Teleporta para onde mira e explode. | 2 salas |
| Sabre de Luz | Lâminas de luz giram em você por 6s. | 3 salas |
| Empurrão da Força | Use a Força: empurra tudo e apaga as balas. | 2 salas |
| Poção Polissuco | Vira outra pessoa: um monstro troca de lugar com você. | 2 salas |
| Volta no Tempo | Cura 30 e o tempo desacelera. | 5 salas |
| Martelo do Trovão | Só os dignos: 10 raios caem do céu. | 5 salas |
| Manopla das Joias | Estala os dedos: metade da sala vira pó. | 8 salas |
| Neuralizador | Flash! Todos ficam atordoados por 3s. | 3 salas |
| Armadilha de Fantasmas | Suga tudo para onde você mira e prende. | 3 salas |
| Capacitor de Fluxo | 88 milhas por hora: dash longo e câmera lenta. | 2 salas |
| Tempo de Bala | Câmera lenta longa e as balas inimigas viram suas. | 5 salas |
| Chave Sônica | Abre portas: um tremor que racha as paredes. | 1 sala |
| Cabine no Tempo | Some e aparece num lugar seguro, curado. | 3 salas |
| Flor do Mundo Invertido | Pétalas: um anel de 24 balas que atravessam. | 3 salas |
| Walkie-Talkie | Chama os amigos: 2 cães e uma torre de luz. | 5 salas |
| Sapatos de Rubi | Bata os calcanhares: some, cura e ganha escudo. | 3 salas |
| Flauta Mágica | Os monstros dançam: travam 2s e levam dano. | 3 salas |
| Lâmpada do Gênio | Três desejos: cura, cera e críticos. | 6 salas |
| Tesoura do Destino | Corta os fios: mata quem tem menos de 30% e cura. | 3 salas |
| Controle Remoto Universal | Pausa: tudo para por 2s. | 3 salas |
| Vulcão de Bolso | Erupção: 6 meteoros e fogo em todos. | 5 salas |
| Arco-Íris | Sete cores: um leque largo de 21 balas. | 3 salas |
| Ninho de Vespas | 14 vespas que perseguem e envenenam. | 3 salas |
| Inverno Eterno | Congela a sala 4s e espalha gelo no chão. | 4 salas |
| Chuva Ácida | Envenena a sala e solta uma nuvem onde mira. | 3 salas |
| Tempestade de Lâminas | 8 lâminas giram em você por 5s. | 4 salas |
| Velas de Aniversário | Faça um pedido: um anel de 16 fogos de artifício. | 3 salas |
| Farol | Um feixe gira em volta de você por 4s. | 4 salas |
| Ventilador de Teto | Empurra tudo e acelera você. | 1 sala |
| Ímã Gigante | Atrai fortuna: solta 6 gotas de cera em você. | 2 salas |
| Bola de Cristal | Vê o futuro: revela o mapa e dá 5 críticos. | 3 salas |
| Ampulheta de Areia | Câmera lenta e pernas mais rápidas. | 2 salas |
| Banana de Dinamite | Joga onde mira: explosão enorme. | 3 salas |
| Caixa de Minas | Planta 10 minas em volta. | 3 salas |
| Incenso Sagrado | Fumaça que queima os monstros em volta e cura 10. | 3 salas |
| Olho da Tempestade | Raios em cadeia saem de você 3 vezes. | 3 salas |
| Espelho Duplo | Duas cópias suas por 6s e um escudo. | 4 salas |
| Sangue Frio | Gela a sala e suga a vida de 4 monstros. | 4 salas |
| Show de Fogos | 5 meteoros coloridos e um leque de foguetes. | 4 salas |
| Cartola do Mágico | Tira da cartola: 3 cães, cera e um escudo. | 5 salas |
| Relâmpago Globular | Uma esfera elétrica onde mira e raios em cadeia. | 3 salas |
| Quebra-Cabeça Antigo | Rola os itens da sala e troca sua arma. | 4 salas |
| Fúria Berserker | Perde 15 de chama: dano x2 e cadência x1,5 por 8s. | 2 salas |
| Oração da Velinha | Cura 15 e protege por 2s. | 3 salas |
| Tufão | Um ciclone puxa os monstros para você e corta. | 3 salas |
| Sementes Explosivas | Planta 5 minas e envenena a sala. | 3 salas |
| Eclipse | Escuridão: intocável 2s, todos levam dano e você ganha críticos. | 4 salas |
| Metralha de Cera | Um leque de 30 gotas de cera quente. | 3 salas |
| Raízes Vivas | Raízes prendem e envenenam todos por 3s. | 3 salas |
| Cometa | Uma pedra em chamas que atravessa a sala. | 3 salas |
| Bumerangue de Prata | Cinco lâminas em leque que atravessam tudo. | 2 salas |
| Harpa Celestial | Notas que curam 8 e soltam um raio. | 2 salas |
| Vela Derretida | Gasta 10 de chama: o chão em volta vira lava. | 1 sala |
| Pergaminho de Fogo | Um leque de 12 bolas de fogo. | 2 salas |
| Pergaminho de Gelo | Um leque de 12 estilhaços de gelo. | 2 salas |
| Pergaminho do Trovão | Raios caem em 8 monstros. | 3 salas |
| Moeda do Barqueiro | Paga a travessia: perde 10 de chama e mata os fracos. | 3 salas |
| Orbe das Sombras | Clones, críticos e intocável: o kit do assassino. | 5 salas |
| Pedra das Runas | Escudo, lâminas e câmera lenta. | 4 salas |
| Apito do Dragão | Um dragão passa: fogo em tudo e 4 meteoros. | 6 salas |
| A Última Chama | Enche a chama, +5 de chama máxima e intocável 2s. | 8 salas |

</details>
<!-- /gerado:ativos -->

### Sinergias *(gerado)*

No jogo, ficam escondidas como "???" no Arsenal até o jogador descobrir. A descoberta fica salva no progresso.

<!-- gerado:sinergias -->
<details><summary>112 sinergias (spoiler: no jogo elas ficam escondidas até serem descobertas)</summary>

| Sinergia | Precisa de | Efeito |
|---|---|---|
| LUSTRE | Pavio Duplo + Candelabro | Cinco chamas, chuva de balas |
| VAPOR | Gelo Eterno + Pólvora Negra | Explosões maiores que congelam |
| PINBALL | Olho de Vidro + Mola Velha | Quica mais e persegue melhor |
| SUPERCONDUTOR | Bateria Velha + Gelo Eterno | Raios saltam muito mais |
| ESPÍRITO VOLTANTE | Lençol Fantasma + Cera Elástica | Balas fantasmas que voltam: +50% dano |
| BOMBA CLUSTER | Cristal Rachado + Pólvora Negra | Os fragmentos também explodem |
| VAMPIRO | Frasco de Peçonha + Sangue Quente | Cada abate cura 3 |
| FOGO FRIO | Chama Azul + Gelo Eterno | Queima e congela ao mesmo tempo |
| FAMÍLIA DE CERA | Orbe de Cera + Velinha Gêmea | Mais um orbe, e a gêmea atira em dobro |
| HOLOFOTE | Lente de Aumento + Candelabro | Balas gigantescas |
| SORTUDO | Óculos Escuros + Trevo de 4 Folhas | +15% de crítico |
| REI DA CERA | Coroa do Rei Podre + Pote de Mel | Cera em dobro, de novo |
| TEMPESTADE FANTASMA | Bateria Velha + Lençol Fantasma | +2 saltos de raio, atravessando paredes |
| CHUVA ÁCIDA | Frasco de Peçonha + Pavio Duplo | Veneno três vezes mais forte |
| COMETA | Cera Quente + Pólvora Fina | Balas flamejantes: +30% dano |
| ESTILHAÇOS | **Escopeta** (arma) + Cristal Rachado | Escopeta: cada chumbo vira mais 2 fragmentos |
| ESTEIRA DE CERA | **Gatling de Cera** (arma) + Gatilho Leve | Gatling já começa quente |
| RAIO DA MORTE | **Raio de Pavio** (arma) + Bateria Velha | O laser vira uma tempestade |
| PACTO DE SANGUE | Pacto Sombrio + Sangue Quente | Cada abate cura mais 3 |
| MURALHA | Vela Grossa + Sapato de Chumbo | Você leva 40% menos dano |
| VIDRO TEMPERADO | Cera de Vidro + Casca de Cera | O vidro endurece: o dano que você leva volta ao normal |
| AVAREZA | Moeda Maldita + Pote de Mel | Cera vale ainda mais |
| PIRA | 3x Fogo | balas incendeiam, balas explodem |
| INFERNO | 5x Fogo | +15% dano, balas explodem |
| NEVASCA | 3x Gelo | 15% de congelar |
| ERA DO GELO | 5x Gelo | 25% de congelar, balas se partem em 3 |
| TEMPESTADE | 3x Raio | raio pula 2x |
| DEUS DO TROVÃO | 5x Raio | raio pula 3x, balas mais rápidas |
| PRAGA | 3x Veneno | venenoForca, balas envenenam |
| PESTE NEGRA | 5x Veneno | venenoForca |
| FOGOS | 3x Pólvora | balas explodem |
| ARTILHARIA | 5x Pólvora | balas explodem, balas se partem em 3, fragmentoExplode |
| CACOS | 3x Vidro | balas se partem em 3 |
| VITRAL | 5x Vidro | balas se partem em 5, atravessam 1 |
| PINBALL | 3x Mola | quicam 2x |
| BATE-REBATE | 5x Mola | quicam 4x, balas mais rápidas |
| MIRA LASER | 3x Olhar | balas perseguem |
| OLHO QUE TUDO VÊ | 5x Olhar | +30% alcance, balas perseguem |
| ESPETO | 3x Lâmina | atravessam 2 |
| MIL LÂMINAS | 5x Lâmina | atravessam 5, multiplos |
| PENUMBRA | 3x Sombra | esquiva perfeita mais fácil, +5% crítico |
| SOMBRA VIVA | 5x Sombra | +10% crítico, espectral |
| AURORA | 3x Luz | +30% luz, +3 chama por sala |
| SOL NASCENTE | 5x Luz | +60% luz, +15% dano |
| SEDE | 3x Sangue | abate cura 1 |
| VAMPIRO | 5x Sangue | abate cura 2, +10% dano |
| TESOURO | 3x Ouro | +30% cera |
| TOQUE DE MIDAS | 5x Ouro | +70% cera, +1 sorte |
| RELOJOEIRO | 3x Tempo | dash volta 20% antes, câmera lenta maior |
| PARAR O TEMPO | 5x Tempo | câmera lenta maior, dashes |
| REPETECO | 3x Eco | 20% de tiro duplo |
| ECO INFINITO | 5x Eco | 35% de tiro duplo, multiplos |
| VENTANIA | 3x Vento | +12% velocidade |
| FURACÃO | 5x Vento | +20% velocidade, dashes, balas mais rápidas |
| ROCHEDO | 3x Terra | -10% dano recebido, +30% empurrão |
| TERREMOTO | 5x Terra | -20% dano recebido, balas maiores, balas explodem |
| TREVO DE QUATRO FOLHAS | 3x Sorte | +1 sorte, +5% crítico |
| JACKPOT | 5x Sorte | +2 sorte, +12% crítico |
| O SENHOR DOS ANÉIS | 3x Anel | +20% dano |
| COLAR DE PÉROLAS | 3x Colar | +25 chama máx |
| AMULETO DA SORTE | 3x Amuleto | +8% crítico |
| PAVIO INFINITO | 3x Pavio | chama dura +25% |
| TELESCÓPIO | 3x Lente | +30% alcance, balas perseguem |
| ALQUIMIA | 3x Frasco | cera cura +40% |
| LEVE COMO UMA PENA | 3x Pena | +12% velocidade, esquiva perfeita mais fácil |
| MANDÍBULA | 3x Dente | +10% dano, +30% empurrão, abate cura 0.5 |
| TERCEIRO OLHO | 3x Olho | +4% crítico, balas perseguem |
| CORAÇÃO VALENTE | 3x Coração | +35 chama máx |
| COFRINHO | 3x Moeda | +30% cera |
| MOLHO DE CHAVES | 3x Chave | +1.5 sorte |
| BIBLIOTECA PROIBIDA | 3x Pergaminho | recarga 30% mais rápida |
| CÍRCULO RÚNICO | 3x Runa | +15% dano, raio pula 1x |
| CARRILHÃO | 3x Sino | parry rebate +3, parry mais fácil |
| SALA DOS ESPELHOS | 3x Espelho | parry rebate +2, multiplos |
| PROCISSÃO | 3x Vela | +6 chama por sala |
| GEODO | 3x Cristal | balas maiores, balas se partem em 2 |
| OSSUÁRIO | 3x Osso | +40% empurrão, atravessam 1 |
| BAILE DE MÁSCARAS | 3x Máscara | esquiva perfeita mais fácil, +4% crítico |
| MÃOS LIGEIRAS | 3x Luva | atira 15% mais rápido |
| BOTAS DE SETE LÉGUAS | 3x Bota | +15% velocidade, dashes |
| SUPER-HERÓI | 3x Capa | -15% dano recebido |
| REALEZA | 3x Coroa | +10% dano, +20% cera, +3% crítico |
| RELÓGIO SUÍÇO | 3x Relógio | dash volta 25% antes |
| CASSINO | 3x Dado | +6% crítico, +1 sorte |
| BARALHO COMPLETO | 3x Carta | 15% de tiro duplo |
| NORTE VERDADEIRO | 3x Bússola | puxa cera de longe, balas perseguem |
| FAROL | 3x Lanterna | +40% luz, +2 chama por sala |
| PEDREIRA | 3x Pedra | +30% pente, balas maiores |
| VAPOR | 2x Fogo + 2x Gelo | +5% dano, balas incendeiam, 10% de congelar |
| NAPALM | 2x Fogo + 2x Pólvora | balas incendeiam, balas explodem |
| INCÊNDIO FLORESTAL | 2x Fogo + 2x Vento | +5% velocidade, balas incendeiam, balas mais rápidas |
| CRISTAL DE GELO | 2x Gelo + 2x Vidro | 10% de congelar, balas se partem em 3 |
| CURTO-CIRCUITO | 2x Raio + 2x Mola | quicam 1x, raio pula 1x |
| TROVOADA | 2x Raio + 2x Vento | raio pula 2x |
| SANGUE PODRE | 2x Veneno + 2x Sangue | abate cura 0.5, venenoForca |
| PÂNTANO | 2x Veneno + 2x Terra | balas envenenam, balas maiores |
| ECLIPSE | 2x Sombra + 2x Luz | +10% crítico |
| ASSASSINO | 2x Sombra + 2x Lâmina | +6% crítico, atravessam 2 |
| FRANCO-ATIRADOR | 2x Olhar + 2x Lâmina | +20% alcance, balas perseguem, atravessam 2 |
| ENXAME | 2x Olhar + 2x Eco | multiplos, balas perseguem |
| ESTILHAÇOS QUICANTES | 2x Mola + 2x Vidro | quicam 2x, balas se partem em 2 |
| SORTE GRANDE | 2x Ouro + 2x Sorte | +30% cera, +1 sorte |
| SANGUE AZUL | 2x Ouro + 2x Sangue | +10% dano, abate cura 0.5 |
| DÉJÀ VU | 2x Tempo + 2x Eco | dash volta 15% antes, 20% de tiro duplo |
| VELOCISTA | 2x Tempo + 2x Vento | +12% velocidade, atira 10% mais rápido |
| MINA TERRESTRE | 2x Terra + 2x Pólvora | balas explodem, balas maiores |
| SOL | 2x Luz + 2x Fogo | +30% luz, +8% dano, balas incendeiam |
| NOITE POLAR | 2x Gelo + 2x Sombra | esquiva perfeita mais fácil, 12% de congelar |
| LÂMINA ELÉTRICA | 2x Raio + 2x Lâmina | atravessam 1, raio pula 1x |
| REAÇÃO EM CADEIA | 2x Eco + 2x Pólvora | balas explodem, 10% de tiro duplo |
| ESPELHO QUEBRADO | 2x Sorte + 2x Vidro | +8% crítico, balas se partem em 2 |
| SANGRIA | 2x Sangue + 2x Lâmina | abate cura 0.8, atravessam 1 |

</details>
<!-- /gerado:sinergias -->

### Menu de desenvolvedor (F2)

Dentro da partida, **F2** abre um painel à direita (o jogo pausa). Ele tem busca por nome, id ou etiqueta e estas abas:

| Aba | O que faz |
|---|---|
| Itens | PEGAR (na hora) ou CHÃO (solta na sua frente) qualquer um dos 655 itens |
| Armas | PEGAR ou CHÃO qualquer arma, ordenadas por tier |
| Ativos | dá qualquer item ativo, já carregado |
| Monstros | cria qualquer monstro ou chefe; ELITE cria a versão elite |
| Sinergias | mostra todas (e quais estão ativas); ATIVAR dá o que falta para ela |
| Trapaças | modo deus, chama cheia, cera, munição, matar todos, limpar a sala, revelar o mapa, ir para chefe/loja/sala secreta, pular andar, ir para O Abismo, O Outro Lado, O Acendedor, o infinito ou direto para O Criador (Estúdio), 10 itens aleatórios, tirar os itens, revelar sinergias, liberar ou zerar conquistas |

O código fica em `src/dev.ts` (um painel HTML por cima do jogo).

## 9. Personagens *(gerado)*

Ficam em `public/dados/personagens.json`. Os sprites saem de `src/arte/personagens.ts`: Luiz, Ana e Luizãooo (id `henrique`) são pixel art feita à mão em `src/arte/gente.ts` (estilo chibi, 20x28, com paleta própria; os quadros de andar levantam uma perna de cada vez); personagens "de chama" (Fósforo, Lamparina, Isqueiro...) com corpo próprio e a chama da vela, e por isso mudam de cor e de chama com os itens, como a vela.

- **Luiz**: o criador, com polo branca, cabelo ondulado e tatuagens. Tem a tatuagem "E" (item exclusivo).
- **Ana**: capuz de pelúcia e franja. A arma dela é a **Polaroid do Luiz** (o flash atordoa), e ela leva o **Sorriso do Luiz**: com pouca chama, ele "aparece", cura e protege.
- **Luizãooo**: bigode, cavanhaque e muita chama. Leva o **Bigode Lendário**: quem encosta voa longe.

<!-- gerado:personagens -->
| Personagem | Como é | Começa com | Atributos | Conquista que libera |
|---|---|---|---|---|
| **Velinha** | A última vela da Catedral. Equilibrada em tudo. | Pistola de Pavio, Escopeta | — | *(desde o começo)* |
| **Luiz** | O criador. Pistolas gêmeas, a tatuagem "E" e um sorriso que não apaga. | Ébano e Marfim, Escopeta, Tatuagem "E", Dado de Cera | dano x1.05 | Quebra-Ossos |
| **Ana** | Capuz de pelúcia e a Polaroid do Luiz: o flash atordoa os monstros. | Polaroid do Luiz, Pistola de Pavio, Sorriso do Luiz, Capuz de Pelúcia | velocidade x1.08, chama máx -10 | Regicida |
| **Luizãooo** | Grandão de bigode: muita chama, mais lento, e quem encosta voa. | Espingarda do Exterminador, Pistola de Pavio, Bigode Lendário, Pólvora Viva | velocidade x0.92, chama máx +30 | Mais Fundo |
| **Fósforo** | Pouca chama, muito dano. Rápido e frágil. | Maçarico, Pistola de Pavio, Chama Azul | chama máx -40, dano x1.4, velocidade x1.15 | Pegando Fogo |
| **Lamparina** | Uma chama protegida por vidro: dura muito, anda devagar. | Lança-Bombas, Pistola de Pavio, Lamparina | chama máx +60, queima da chama x0.6, velocidade x0.85 | A Forja |
| **Vela de Aniversário** | Três chamas, três tiros. Cada um mais fraco. | Lança-Confete, Pistola de Pavio, Pavio Duplo | dano x0.85 | Teimosia |
| **Isqueiro** | Metal e fogo: luva de fogo e balas que incendeiam. | Luva do Alquimista de Fogo, Pistola de Pavio, Cera Quente, Pólvora Viva | tempo entre tiros x0.9 | Incendiário |
| **A Bruxinha** | Cera preta, chapéu de bruxa e a NIX no colo. | NIX, Pistola de Pavio, Chapéu de Bruxa | chama máx -10 | Luz no Abismo |
| **Cavaleiro** | Escudo por sala e escopeta. Aguenta tudo. | Escopeta, Pistola de Pavio, Casca de Cera | chama máx +20, velocidade x0.95 | Intocável |
| **Elfa** | Arco que atravessa tudo e passos leves. | Arco do Herói, Pistola de Pavio, Asas de Mariposa | velocidade x1.1 | As Paredes Têm Ouvidos |
| **Mago** | Bobina de Tesla e um orbe de cera que gira. | Bastão Tesla, Pistola de Pavio, Orbe de Cera | chama máx -10 | Alquimista |
<!-- /gerado:personagens -->

### Programa instalado (setup)

Igual ao AUTOMATON: o jogo vira um programa do Windows com **Electron** e o instalador é feito pelo **electron-builder** (NSIS, em português).

- **GERAR_SETUP.bat** (ou `npm run dist`): compila o jogo (`vite build`) e gera `release/PAVIO-Setup-<versão>.exe`. O instalador deixa escolher a pasta, cria atalhos na Área de Trabalho e no Menu Iniciar e abre o jogo no fim.
- `npm run app`: abre o programa direto, sem instalar. `npm run icone`: refaz o ícone (a Velinha) em `build/`.
- `electron/main.cjs`: janela própria (tela cheia por padrão, F11 ou Alt+Enter alterna, lembra tamanho e posição), uma janela por vez, tudo offline pelo protocolo interno `app://pavio/`. O save fica no PC do jogador (pasta do PAVIO em AppData).
- `electron/preload.cjs`: expõe `window.desktop` (sair e tela cheia); no programa instalado o menu ganha **SAIR DO JOGO**.
- A fonte Press Start 2P vem junto (`@fontsource/press-start-2p`), então o jogo não precisa de internet nem no navegador.

### Maldições de andar

A partir do andar 2, cerca de 22% dos andares vêm amaldiçoados (no desafio Amaldiçoado, todos). Em troca, **a cera cai em dobro** naquele andar. O nome da maldição aparece embaixo do andar no HUD.

| Maldição | Efeito |
|---|---|
| Labirinto | o andar tem 60% mais salas |
| Cegueira | itens e ativos viram "?" até você pegar |
| Pavio Curto | a chama queima 2x mais rápido |
| Trevas | todas as salas são escuras |
| Perdido | o mapa some |
| Cera Mole | você leva 50% mais dano |

### Desafios

Partidas com regras fixas (menu DESAFIOS ou o quadro na Sacristia). Vence quem derrotar O Apagador. Cada desafio vencido dá cera dourada; vencer 1, 3 e 8 libera as coleiras da TETE, da NIX e da YUUMI e a Corujinha.

| Desafio | Regra | Prêmio |
|---|---|---|
| Só a TETE | começa com a TETE; armas do chão viram cera | 60 |
| Vela de Vidro | qualquer golpe apaga a chama | 120 |
| Pacifista | você não atira; TETE, NIX e YUUMI lutam (3x mais fortes) | 90 |
| Chefões em Sequência | cada andar é só um baú, uma loja e o chefe | 80 |
| Amaldiçoado | todo andar tem uma maldição | 80 |
| Pés de Chumbo | sem esquiva, +30% de dano | 70 |
| Pavio Curto | a chama queima 2x, mas começa com 3 itens raros | 70 |
| Contra o Relógio | vencer O Apagador em 20 minutos | 100 |

### Maestria e skins

Cada abate conta para a arma que está na mão (somando todas as partidas). Com 25, 100, 250 e 500 abates a arma libera as skins **Bronze, Dourada, Sombria e Arco-íris**. A skin é escolhida na Armaria 3D (teclas 1 a 5) e aparece na mão da vela durante a partida.

### A Forja e o Cassino

- **Forja** (sala especial): a bigorna funde a arma atual com a próxima. A arma nova pega o melhor das duas (mais dano, mais pente, menos recarga...), os efeitos especiais das duas, sobe um tier e ganha um desenho meio-a-meio. Duplas com nome próprio: TETE + NIX = **Briga de Cão e Gato**, TETE + YUUMI = **Bagunça na Sala**, NIX + YUUMI = **Gatas do Apocalipse**.
- **Cassino** (sala especial): o **caça-níquel** custa 5 de cera (até 10 jogadas). Três iguais: chuva de cera, chama cheia, um item, três monstros (caveiras) ou o **jackpot da TETE** (TETE, NIX e YUUMI lutam com você por 60 s). Dois iguais devolvem um troco. A **máquina de doação** recebe 5 de cera por vez (às vezes vem uma bênção de chama); ao doar 100 no total, libera a personagem **Moedinha** (vela de ouro: mais sorte e cera, menos chama).

### Familiares

Itens que trazem um bichinho que segue a vela:

| Item | Bichinho | O que faz |
|---|---|---|
| Coleira da TETE 🔒 | TETE | morde os monstros (latindo) |
| Coleira da NIX 🔒 | NIX | arranha os monstros |
| Coleira da YUUMI 🔒 | YUUMI | pula nos monstros |
| Morceguinho | morcego | voa de monstro em monstro mordendo |
| Mariposa da Chama | mariposa | gira em volta da vela e destrói as balas que encosta |
| Fantasminha | fantasma | flutua atrás e atira em quem chegar perto |
| Pote de Vagalume | vagalume | ilumina as salas escuras e dá choquinhos |
| Corujinha 🔒 | coruja | mostra o mapa de cada andar e dá rasantes |

### Resumo da partida

A tela do fim mostra os números, o **gráfico da chama** ao longo da partida (vermelho quando estava abaixo de 30%) com o ponto em que você **quase apagou**, a build com os ícones (passe o mouse para ver o nome), a semente e o desafio. **[S] SALVAR IMAGEM** baixa um print da tela para mandar aos amigos.

### Eventos surpresa

Cerca de 14% das salas de combate começam com um evento:

| Evento | O que acontece |
|---|---|
| Apagão | a sala fica escura por 12 segundos |
| Chuva de Cera | cai cera do teto por 8 segundos |
| Balas Tortas | as balas inimigas fazem curva |
| Ladrão | um goblin dourado rouba até 15 de cera e foge pela porta em 4s; pegue ele e a cera volta em dobro |
| Sala em Fúria | monstros 30% mais rápidos, mas soltam o dobro de cera |

### Marcas e relíquias

Vencer qualquer um dos 3 finais com um personagem dá a **marca** daquele final (aparece na tela de personagem) e libera a **relíquia** dele, que passa a aparecer em todas as partidas:

| Personagem | Relíquia |
|---|---|
| Velinha | Pavio Original: +10 chama máx, cura 4 ao limpar a sala |
| Luiz | Caneta do Criador: ao matar (6%), aparece um baú |
| Ana | Foto Revelada: ao entrar numa sala, um flash trava todos e dá 2 críticos |
| Luizãooo | Abraço de Urso: +15 chama máx; ao levar dano, empurra tudo e cura 5 |
| Fósforo | Palito de Reserva: uma vez por partida, reacende com metade da chama |
| Lamparina | Óleo Eterno: a chama dura 30% mais e ilumina 20% mais |
| Vela de Aniversário | Bolo Surpresa: ao limpar (10%), um item aparece num pedestal |
| Isqueiro | Pedra de Isqueiro: o dash solta um anel de faíscas de fogo |
| A Bruxinha | Caldeirão Borbulhante: a cada 6s, uma nuvem de veneno cai num monstro |
| Cavaleiro | Brasão da Ordem: escudo por sala e -10% de dano recebido |
| Elfa | Flecha Élfica: a cada 6 tiros, uma flecha que atravessa tudo |
| Mago | Grimório: o item ativo carrega 2 por sala |

### Modo desenvolvedor

Em **Opções → MODO DESENVOLVEDOR**: com ele ligado, todos os personagens, itens, armas, ativos e capítulos ficam liberados e o **F2** abre o menu de desenvolvedor dentro da partida. Desligado, tudo volta a depender das conquistas (o progresso não é apagado).

## 10. Conquistas *(gerado)*

Ficam em `public/dados/conquistas.json`. Um item, arma ou ativo listado em "Libera" fica fora dos sorteios (baús, lojas, tesouros) até a conquista sair.

<!-- gerado:conquistas -->
**43 conquistas.** Cada uma libera algo novo, que só passa a aparecer nas partidas depois dela.

| Conquista | Como conseguir | Libera |
|---|---|---|
| Quebra-Ossos | Derrote O Ogro Encerado. | Pólvora Viva, luiz |
| Regicida | Derrote O Rei Podre. | Velinha Gêmea, ana |
| A Última Chama | Derrote O Apagador. | O Abismo e o modo infinito, Canhão do Vazio |
| Luz no Abismo | Derrote O Pavio Negro. | Raio de Pavio, bruxinha |
| Sem Fundo | Chegue a O Outro Lado. | Sino do Apagador |
| Infernal | Faça um combo x30. | Coroa do Rei Podre |
| Imparável | Faça um combo x75. | Gatling de Cera |
| As Paredes Têm Ouvidos | Ache uma sala secreta. | Vela Fugaz, elfa |
| Desafio Aceito | Vença uma sala de desafio. | Castiçal Portátil |
| Alquimista | Descubra 5 sinergias. | Cristal Rachado, mago |
| Mestre do Parry | Acerte 40 parries numa partida. | Espelho de Mão |
| Amaldiçoado | Tenha 3 itens malditos ao mesmo tempo. | Cera de Vidro |
| Intocável | Derrote um chefe sem levar dano. | Granada Cluster, cavaleiro |
| Mil Velas Vingadas | Derrote 1000 monstros no total. | Dado de Cera |
| Teimosia | Jogue 10 partidas. | Trevo de 4 Folhas, aniversario |
| Mais Fundo | Chegue ao andar 3. | henrique |
| Pegando Fogo | Faça um combo x20. | fosforo |
| A Forja | Chegue ao andar 5. | lamparina |
| Incendiário | Derrote 300 monstros no total. | isqueiro |
| Abraçar a Sombra | Derrote O Pavio Negro 2 vezes. | outroLado |
| Ossos no Lugar | Derrote O Necromante Ancião. | Cães Divinos |
| Ferro Derretido | Derrote O Cavaleiro Derretido. | Estilo de Três Espadas |
| Jardim Apagado | Derrote A Jardineira de Cinzas. | Fruta do Gelo |
| Espelho Quebrado | Derrote O Reflexo. | Seis Olhos |
| Fora do Tempo | Derrote O Relojoeiro. | O Mundo Parado |
| Mar Calmo | Derrote O Leviatã de Cera. | Fruta da Borracha |
| O Primeiro Amanhecer | Derrote O Acendedor. | Domínio: Vazio Infinito, Domínio: Santuário Malevolente, Tambores da Libertação |
| Apocalipse | Faça um combo x50. | Dedo do Rei das Maldições |
| Grande Alquimista | Descubra 15 sinergias. | Punho Divergente |
| Lenda | Derrote 2000 monstros no total. | Faísca Negra |
| Marca: Velinha | Vença um final jogando com Velinha. | Pavio Original |
| Marca: Luiz | Vença um final jogando com Luiz. | Caneta do Criador |
| Marca: Ana | Vença um final jogando com Ana. | Foto Revelada |
| Marca: Luizãooo | Vença um final jogando com Luizãooo. | Abraço de Urso |
| Marca: Fósforo | Vença um final jogando com Fósforo. | Palito de Reserva |
| Marca: Lamparina | Vença um final jogando com Lamparina. | Óleo Eterno |
| Marca: Vela de Aniversário | Vença um final jogando com Vela de Aniversário. | Bolo Surpresa |
| Marca: Isqueiro | Vença um final jogando com Isqueiro. | Pedra de Isqueiro |
| Marca: A Bruxinha | Vença um final jogando com A Bruxinha. | Caldeirão Borbulhante |
| Marca: Cavaleiro | Vença um final jogando com Cavaleiro. | Brasão da Ordem |
| Marca: Elfa | Vença um final jogando com Elfa. | Flecha Élfica |
| Marca: Mago | Vença um final jogando com Mago. | Grimório |
| GG | Derrote O Criador, no Estúdio secreto. | Teclado do Criador |
<!-- /gerado:conquistas -->

## 11. Inimigos

Cada sala de combate tem um **orçamento**: cada inimigo custa pontos. Os mais fortes custam mais e só aparecem a partir de certo andar. Alguns vêm em bando.

<!-- gerado:inimigos -->
| Inimigo | Comportamento | Vida | Dano | Velocidade | IA | Andar | Custo |
|---|---|---|---|---|---|---|---|
| Diabrete | Voa em zigue-zague. Atira a partir do andar 2. | 3 | 12 | 92 | zigue-zague | 1+ | 1 (bando de 2) |
| Goblin | Fraco, mas vem em bando e corre muito. | 3 | 10 | 105 | enxame | 1+ | 1 (bando de 3) |
| Zumbizinho | Servo dos mortos. Sempre vem em dupla. | 2 | 9 | 82 | enxame | 1+ | 1 (bando de 2) |
| Esqueleto | Treme antes do bote. No andar 2, solta balas. | 7 | 14 | 56 | perseguir | 1+ | 2 |
| Lodo | Pula em você e se divide ao morrer. | 7 | 12 | 160 | saltar | 1+ | 2 |
| Carniçal | Lento e duro. Ao morrer, solta dois zumbis. | 12 | 16 | 44 | enxame | 1+ | 3 |
| Xamã | Fica longe e atira leques de balas roxas. | 7 | 13 | 48 | atirador | 1+ | 3 |
| Lesminha | Rápida e nojenta. Vem em bando. | 2 | 9 | 74 | enxame | 2+ | 1 (bando de 3) |
| Cabeça de Abóbora | Corre até você e EXPLODE. Mate de longe. | 5 | 24 | 100 | kamikaze | 1+ | 3 |
| Zumbi Gelado | Atira cristais que te deixam lento. | 9 | 12 | 40 | atirador | 2+ | 3 |
| Chifrudo | Mira, avisa com uma linha vermelha e investe. | 11 | 18 | 50 | investida | 1+ | 4 |
| Lesma de Cera | Gorda e lenta. Deixa um rastro de veneno. | 18 | 14 | 24 | rastro | 2+ | 4 |
| Anjo Caído | Se teletransporta e dispara rajadas. | 8 | 12 | 60 | teleporte | 2+ | 4 |
| Orc Escudeiro | Escudo de frente: flanqueie ou quebre ele. | 15 | 16 | 46 | escudo | 2+ | 4 |
| Orc Mascarado | Lento e resistente. Leques e anéis de balas. | 19 | 18 | 36 | tanque | 2+ | 5 |
| Doutor da Peste | Cura os monstros e joga veneno. Mate primeiro! | 9 | 12 | 40 | curandeiro | 2+ | 4 |
| Wogol | Gira no lugar disparando espirais. | 15 | 14 | 30 | torre | 3+ | 5 |
| Necromante | Invoca zumbis sem parar. Mate primeiro! | 11 | 12 | 42 | invocador | 3+ | 5 |
| Goblin Minador | Espalha minas. Não pise perto. | 6 | 12 | 50 | minador | 2+ | 3 |
| Esqueleto Arqueiro | Fica longe e atira flechas rápidas. | 6 | 12 | 40 | atirador | 3+ | 3 |
| Alma Penada | Atravessa paredes. Só apanha quando aparece. | 9 | 14 | 55 | fantasma | 3+ | 4 |
| Cavaleiro Oco | Armadura vazia que mira e atropela. | 22 | 18 | 40 | investida | 4+ | 5 |
| Broto de Cinza | Planta parada que cospe esporos em espiral. | 16 | 12 | — | torre | só 7 | 3 |
| Espantalho | Some e reaparece atrás de você. | 12 | 13 | 50 | teleporte | só 7 | 4 |
| Corvo de Cinzas | Vem em bando, mergulhando. | 4 | 10 | 95 | enxame | só 7 | 2 (bando de 3) |
| Reflexo | Uma cópia sua. Mira e dispara um raio de balas. | 12 | 13 | 45 | laser | só 8 | 4 |
| Estilhaço | Corre até você e explode em cacos. | 7 | 14 | 80 | kamikaze | só 8 | 3 |
| Vidraceiro | Atira leques de vidro que quicam. | 14 | 12 | 35 | atirador | só 8 | 4 |
| Engrenagem | Gira em volta de você atirando para dentro. | 14 | 12 | 70 | orbitador | só 9 | 4 |
| Cuco | Rapidíssimo. Sai do relógio na hora certa. | 5 | 11 | 120 | zigue-zague | só 9 | 2 |
| Ponteiro | Aponta para você... e dispara como uma flecha. | 12 | 16 | 40 | investida | só 9 | 4 |
| Água-Viva de Cera | Pula devagar e se divide. | 10 | 12 | 110 | saltar | só 10 | 3 |
| Pirata de Cera | Bacamarte: leques largos de chumbo. | 15 | 13 | 40 | atirador | só 10 | 4 |
| Tubarão de Areia | Persegue e dá botes. | 16 | 15 | 65 | perseguir | só 10 | 4 |
| Brasa Viva | Deixa um rastro de fogo por onde passa. | 11 | 13 | 60 | rastro | só 11 | 3 |
| Guardião da Chama | Escudo dourado de frente. Flanqueie. | 24 | 17 | 45 | escudo | só 11 | 5 |
| Fênix Pequena | Teletransporta e solta anéis de fogo. | 14 | 14 | 60 | teleporte | só 11 | 5 |
<!-- /gerado:inimigos -->

### Chefes *(gerado)*

<!-- gerado:chefes -->
| Andar | Chefe | Descrição | Vida | Ataques |
|---|---|---|---|---|
| 1 · AS CATACUMBAS | O Ogro Encerado | Chefe do andar 1. Pula e faz o chão tremer. | 130 | chefe_ogro |
| 2 · O ESGOTO DE CERA | O Rei Podre | Chefe do andar 2. Vomita veneno e chama zumbis. | 180 | chefe_podre |
| 3 · O OSSÁRIO | O Necromante Ancião | Chefe do andar 3. Levanta os mortos e some na fumaça. | 200 | invocar, espiral, teleporte, anel, rajada, chuva |
| 4 · A CRIPTA DOS CAVALEIROS | O Cavaleiro Derretido | Chefe do andar 4. Investidas e paredes de balas. | 240 | investida, leque, salto, parede, investida, espiral |
| 5 · A FORJA DO APAGADOR | O Apagador | O chefe final. Quer apagar a sua chama. | 240 | chefe |
| 6 · O ABISMO | O Pavio Negro | A sua sombra. Atira, se esquiva e até dá parry. | 320 | chefe_negro |
| 7 · O JARDIM DE CINZAS | A Jardineira de Cinzas | O Outro Lado 1. Chuva de brasas e flores de bala. | 320 | chuva, flor, invocar, anel, minas, chuva |
| 8 · O ESPELHO PARTIDO | O Reflexo | O Outro Lado 2. Sua cópia de vidro: raios e clones. | 340 | leque, laser, clones, espiral_dupla, teleporte, laser |
| 9 · O RELÓGIO PARADO | O Relojoeiro | O Outro Lado 3. Para as balas no ar e solta tudo de uma vez. | 360 | tempo, espiral, rajada, parede, tempo, flor |
| 10 · O MAR DE CERA | O Leviatã de Cera | O Outro Lado 4. Ondas, saltos e um mar de balas. | 400 | ondas, parede, salto, chuva, invocar, ondas |
| 11 · O CORAÇÃO DA CHAMA | O Acendedor | O FIM. Quem acendeu a primeira chama e quer queimar o mundo. | 560 | anel, espiral_dupla, chuva, laser, investida, invocar, flor, parede |
<!-- /gerado:chefes -->

- **O Ogro Encerado**: persegue, pula onde você está (com um círculo vermelho de aviso) e solta um anel de balas ao cair; arremessa pedras; investe.
- **O Rei Podre**: vomita um jato de veneno, faz anéis de balas que deixam poças, invoca zumbis e investe.
- **O Apagador**: investida, anéis, rajadas miradas, espiral de balas e invocação. Com metade da vida fica furioso e apaga a sua luz por instantes.
- **O Pavio Negro** (O Abismo): a vela ao contrário. Gira em volta de você atirando, dá dashes deixando um rastro de balas, atira de escopeta, faz espirais duplas, apaga a luz e reaparece atrás de você, e chama Sombras (vela-kamikaze). No **parry** dele (fica piscando roxo) seus tiros voltam contra você, e no fim ele solta um anel de balas: **pare de atirar**.
- **Os chefes falam**: uma frase quando você entra, uma na fúria e as últimas palavras (`falas` em `inimigos.json`).
- **Chefe secreto: O Criador.** Depois de ver os 3 finais, vencer O Acendedor abre também uma **Porta do Estúdio**. Lá está O Criador (o Luiz, gigante), que muda as regras no meio da luta: com 2/3 da vida entra o **MODO DEBUG** (a sala apaga e a sua arma troca sozinha a cada 6s); com 1/3, o **PATCH FINAL** (a TETE, a NIX e a YUUMI aparecem para lutar do seu lado). Vencer dá o título "O JOGO É SEU!" e a conquista **GG**, que libera o **Teclado do Criador** (a cada 15 tiros, um efeito surpresa).
- **Chefes novos** usam uma IA montada por uma lista de ataques (`ataques` e `furia` em `inimigos.json`), com 17 padrões: anel, espiral, espiral dupla, rajada, leque, flor, ondas, investida, salto, invocar, clones, teleporte, chuva (explosões marcadas no chão), parede de balas com um buraco, laser (fila de balas depois de uma linha de aviso), minas e "tempo" (as balas param no ar e depois vêm todas na sua direção).
- **Monstros novos**: Goblin Minador (minas), Esqueleto Arqueiro, Alma Penada (atravessa paredes e só apanha quando aparece), Cavaleiro Oco, e 15 exclusivos de O Outro Lado (com IAs novas como a Engrenagem, que gira em volta de você, e o Reflexo, que mira um laser).
- No modo infinito os chefes voltam em rodízio (todos os 11), começando com pelo menos 420 de vida e +30% por profundeza.
- Todos ficam **furiosos** com metade da vida: mais rápidos e com mais balas.

## 12. Masmorra procedural

`src/sistemas/Masmorra.ts` monta o andar:

1. Cresce uma grade de salas a partir do início, evitando blocos 2x2 para ter corredores e becos.
2. Mede a distância de cada sala até o início.
3. Coloca o chefe no beco mais distante, depois o tesouro e a loja em outros becos; castiçais e salas de descanso longe do início; a sala de desafio num beco que sobrou.
4. A **sala secreta** vai num buraco do mapa que encosta no maior número de salas (nunca no chefe nem no início). A passagem fica como parede rachada até ser aberta; o mapa só mostra a sala depois disso.
5. Sorteia a intensidade de cada sala e quais ficam escuras.

`src/sistemas/GeradorSala.ts` monta cada sala de combate:

1. Escolhe um **estilo**: arena, colunas, ilhas de caixotes, corredores, cruz, anel, campo de espinhos, labirinto ou xadrez.
2. Desenha num quarto da sala e **espelha**, para ficar simétrico.
3. Abre espaço na frente das portas e confere com uma busca em largura que todas se ligam. Se não ligarem, tenta de novo.
4. Distribui os inimigos pelo orçamento, longe das portas.

## 13. Visual

- **Pack 0x72** (`public/assets/0x72/`): chão, paredes, caixotes, baús, estandartes, fontes, 10 heróis e os monstros. Lido de um atlas (`atlas.png` + `tile_list.txt`). O `visual.json` liga cada monstro ou tile a um nome do pack.
- **Feito para o jogo** (`src/arte/`): a vela, O Pavio Negro, as 17 armas, as balas, a mira, os 65 ícones de itens e itens ativos, a parede rachada, a saída de luz, a logo da WW Studios e todos os efeitos.
- **Aparência da vela** (`src/arte/aparencia.ts`): a cada item, a vela é redesenhada com a cor da cera, a cor da chama (azul, ciano, verde, roxa, branca, vermelha, dourada), 1/2/3/5 chamas e acessórios (óculos, monóculo, coroa, chapéu, antena, asas, mola, botas, olhos vermelhos ou azuis, relógio, lençol).
- **Aura da vela**: no jogo, a vela tem contorno brilhante, um halo no chão e três brasas girando em volta. Tudo pulsa com a música e fica vermelho quando a chama está acabando.
- **Menu**: a vela fica ao lado dos botões e mira no selecionado. Ao escolher, ela atira no botão e um círculo escuro com borda dourada cresce do ponto do impacto até cobrir a tela (a transição).
- **Luz**: salas escuras usam uma camada de escuridão "apagada" onde há luz. Por cima, uma camada de brilho colorido soma as cores das balas, explosões e chamas. A câmera tem bloom e vinheta.
- **Fonte**: Press Start 2P.

## 14. Áudio

Tudo é sintetizado na hora (`src/som.ts`), sem arquivos de áudio. As músicas são escritas como partitura em `src/musica.ts`, com seções (intro, verso, refrão, ponte, solo), guitarra distorcida, bumbo duplo, pratos e viradas.

| Faixa | Onde toca | Estilo |
|---|---|---|
| menu | título, menu, altar | sombrio, sininhos, três partes |
| historia | quadrinhos | caixinha de música |
| masmorra1 | andar 1 | metal 8 bits em Mi menor, 152 bpm |
| masmorra2 | andar 2 | groove em Ré menor, 138 bpm |
| masmorra3 | andar 3 | thrash em Mi frígio, 176 bpm |
| abismo | O Abismo | doom arrastado em Si menor, com trítono e galope, 116 bpm |
| chefe | salas de chefe e de desafio | blast beat, 190 bpm |
| calmo | loja, tesouro, castiçal, descanso, sala secreta | chiptune tranquilo |
| vitoria / derrota | fim de partida | vinhetas |

No frenesi a música ganha chimbal em semicolcheias e um arpejo extra. O bumbo avisa o jogo para as luzes e o combo pulsarem no ritmo.

## 15. Arquitetura

```
PAVIO/
├── JOGAR.bat               abre o jogo
├── PROJETO.md              este documento
├── scripts/doc.mjs         gera as tabelas deste documento
├── scripts/gerarConteudo.mjs   gera itens, sinergias por etiqueta e armas extras
├── scripts/conteudoExtra.mjs   itens de referência e armas extras, escritos à mão
├── scripts/conteudoAtivos.mjs  100 ativos, itens de JJK/One Piece, melhorias e exclusivos
├── public/
│   ├── dados/              tudo que é "conteúdo" (dá para mexer sem programar)
│   │   ├── config.json       balanceamento, andares, chefes, preços, parry...
│   │   ├── armas.json        armas
│   │   ├── itens.json        itens feitos à mão
│   │   ├── itens_referencias.json   itens de referência (gerado de scripts/conteudoExtra.mjs)
│   │   ├── itens_gerados.json       540 itens objeto + elemento (gerado)
│   │   ├── sinergias_geradas.json   sinergias por etiqueta (gerado)
│   │   ├── armas_extras.json        52 armas extras (gerado de scripts/conteudoExtra.mjs)
│   │   ├── tags.json                nomes das etiquetas (gerado)
│   │   ├── ativos_extras.json       100 ativos novos (gerado de scripts/conteudoAtivos.mjs)
│   │   ├── personagens.json         personagens jogáveis
│   │   ├── ativos.json       itens ativos (tecla C)
│   │   ├── conquistas.json   conquistas e o que cada uma libera
│   │   ├── sinergias.json    sinergias
│   │   ├── inimigos.json     inimigos e chefes
│   │   ├── salas.json        salas especiais (início, tesouro, loja, castiçal, chefe, secretas)
│   │   ├── historia.json     textos da história e do final
│   │   └── visual.json       ligação com o pack de arte
│   └── assets/0x72/        pack de arte
└── src/
    ├── main.ts             configura o Phaser
    ├── cenas/              Boot, Abertura, Titulo, Menu (+fundo), Historia, Altar, Jogo, HUD, Fim
    ├── entidades/          Jogador, Inimigo (IAs dos monstros e chefes)
    ├── sistemas/           Masmorra, GeradorSala, Itens (modificadores e sinergias)
    ├── arte/               texturas, atlas, ícones, aparência da vela
    ├── musica.ts / som.ts  trilha e sintetizador
    ├── dev.ts              menu de desenvolvedor (F2)
    ├── sistemas/Salvar.ts  salvar/continuar a partida e o sorteio com semente do desafio diário
    ├── arte/gente.ts       Luiz, Ana e Luizãooo em pixel art feita à mão
    ├── sistemas/Efeitos.ts motor de efeitos (gatilhos, efeitos e passivos)
    ├── arte/personagens.ts sprites dos personagens jogáveis
    ├── estado.ts           partida atual e progresso salvo (localStorage)
    └── opcoes.ts           opções salvas
```

- **Cena `Jogo`**: o coração do jogo (salas, tiro, balas, inimigos, itens, luz). A cena `HUD` roda por cima, separada.
- **Progresso salvo** no navegador: cera dourada, melhorias do altar, recordes, sinergias descobertas, conquistas, se já viu a história, e opções.
- **Andares**: `infoAndar(n)` em `src/dados.ts` diz o nome, chefe, música, cor e tamanho de qualquer andar: 1-3 vêm de `config.json`, o 4 de `config.abismo` e o resto de `config.infinito`.

## 16. Créditos

| | |
|---|---|
| Um jogo da | WW STUDIOS (Wraith Ware) |
| Criação e programação | Luiz Vargas |
| Vela, armas e efeitos | Luiz Vargas |
| Música e sons | Luiz Vargas |
| Arte da masmorra | *16x16 DungeonTileset II*, por 0x72, CC0 ([0x72.itch.io/dungeontileset-ii](https://0x72.itch.io/dungeontileset-ii)) |
| Fonte | Press Start 2P, por CodeMan38 (SIL OFL) |

## 17. Histórico

| Versão | O que entrou |
|---|---|
| 0.1 | Ideia, vela com combate corpo a corpo, chama como luz, 3 andares, Apagador |
| 0.2 | Armas de fogo, pack 0x72, menu completo, música sintetizada |
| 0.3 | Parry, esquiva perfeita, frenesi, elites, bullet hell, brilho e luzes no ritmo |
| 0.4 | Logo WW Studios, título, história e final em quadrinhos, trilha metal 8 bits, 17 armas, 55 itens (com malditos), 22 sinergias, aparência da vela, 19 inimigos + 3 chefes, masmorra procedural, salas escuras/de descanso, dificuldade maior |
| 1.0 | A Sacristia (hub jogável), maldições de andar, 8 desafios, maestria das armas com skins (na Armaria 3D), a Forja (fusão de armas), 8 familiares, tela de resumo com gráfico da chama e print, o Cassino (caça-níquel e doação, que libera a Moedinha), sementes para jogar a mesma masmorra, YUUMI tigrada cinza, latidos de verdade da TETE |
| 0.9.1 | Escolha de personagem antes da partida, Armaria 3D, menu de pausa novo, Henrique virou Luizãooo, a TETE late a cada tiro, os bichinhos rodeiam os chefes em vez de sumir dentro deles |
| 0.9 | Transformações, jogar em dupla (teclado ou controle), eventos surpresa nas salas, chefe secreto O Criador (com o Modo Debug e os bichinhos), falas dos chefes |
| 0.8 | Salvar e continuar, estatísticas, desafio diário, tutorial jogável, dicas de etiquetas/sinergias, 12 relíquias (marcas por personagem), Fonte dos Desejos, Altar da Troca, visita dos amigos, personagens e TETE redesenhados, itens em pedestais, limites de equilíbrio nos efeitos |
| 0.7 | Motor de efeitos (gatilhos, efeitos e passivos): os 540 itens gerados viraram comportamentos únicos; 100 itens ativos novos; itens de Jujutsu Kaisen e One Piece; 5 andares no capítulo 1; O Outro Lado (5 andares com monstros e perigos próprios); 7 chefes novos com 17 padrões de ataque; 19 monstros novos; 3 finais; 12 personagens jogáveis (Luiz, Ana, Luizãooo e originais) com itens exclusivos; modo desenvolvedor |
| 0.6 | 600 itens novos (60 referências a jogos, animes, filmes e séries + 540 gerados), etiquetas e 90 sinergias por etiqueta, 52 armas novas com tiers (comum a mítica), TETE, NIX e YUUMI, menu de desenvolvedor (F2), aura da vela, menu com a vela atirando |
| 0.5 | 10 itens ativos (tecla C), salas secretas atrás de paredes rachadas, salas de desafio, 15 conquistas com desbloqueios, O Abismo com O Pavio Negro, modo infinito, saída de luz, música do Abismo |

## 18. Próximos passos (ideias)

- **Nome da velinha** e mais falas na história (e um final próprio para O Abismo).
- **Personagens jogáveis de verdade**: cada herói com arma inicial e atributos diferentes, liberados por conquistas.
- Monstros exclusivos do Abismo.
- Ranking local: recorde de profundeza e de tempo.
- Testar o equilíbrio com pessoas jogando de verdade e ajustar `config.json`.

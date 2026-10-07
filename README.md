# 🕯️ PAVIO: a última chama

*Um jogo da WW STUDIOS (Wraith Ware).*

Roguelite 2D top-down de tiro e bullet hell. O Apagador soprou todas as velas da Catedral de Cera e roubou a Chama Primeira. Sobrou uma velinha, que pegou uma arma e desceu. **A chama é sua vida e seu relógio**: ela queima sozinha.

> 📘 A documentação completa (história, todos os sistemas, tabelas de armas, itens, inimigos e balanceamento) está em **[PROJETO.md](PROJETO.md)**.

## Como jogar

Dê dois cliques em **`JOGAR.bat`**. Na primeira vez ele instala as dependências (precisa do [Node.js](https://nodejs.org)); depois abre o jogo no navegador.

| Tecla | Ação |
|---|---|
| WASD | andar |
| Mouse | mirar (segure o clique para atirar) |
| Setas | mirar e atirar sem mouse |
| Espaço ou Shift | esquiva: dash invencível (2 cargas) |
| Clique direito ou F | **parry**: rebate as balas de volta |
| R | recarregar |
| Q, roda do mouse ou 1/2/3 | trocar de arma |
| E | interagir, comprar, trocar a arma pela do chão |
| P ou ESC | pausar (mostra seus itens e sinergias; X volta ao menu) |
| M | liga/desliga o som |

## O jogo

- **Abertura**: logo da WW Studios → tela de título → história em 5 quadros (estilo Undertale) na primeira partida. Dá para rever em Menu → HISTÓRIA.
- **3 andares** (Catacumbas, Esgoto de Cera, A Forja), cada um com um **chefe**: O Ogro Encerado, O Rei Podre e O Apagador.
- **Masmorra procedural**: o mapa e as salas de combate são gerados a cada partida (arena, colunas, ilhas, corredores, cruz, anel, espinhos, labirinto, xadrez). Algumas salas são **escuras** e só a sua chama ilumina.
- **Caixotes** quebram com tiros e explosões (às vezes com cera, munição ou vela dentro); **espinhos** sobem e descem.
- **19 inimigos + 3 chefes**, versões **elite** (brilho vermelho, explodem num anel de balas).

## Armas (69, de comum a mítica)

Pistola de Pavio, Escopeta, Submetralhadora, Canhão de Mão (perfura), Lança-Bombas, Maçarico, Bate-Volta (quica), Pistola Vagalume (persegue), Bastão Tesla (raio em cadeia), Pistola de Gelo (congela), Gatling de Cera (esquenta), Granada Cluster (fragmentos), Raio de Pavio (laser), Serra Bumerangue (vai e volta), Zarabatana Tóxica (veneno), Canhão do Vazio (buraco negro) e Vela Romana (fogos teleguiados).

## Itens (655) e sinergias (112)

Como no Binding of Isaac, os itens **somam efeitos nas balas**: perseguir, quicar, se partir, explodir, raio, gelo, veneno, fogo, atravessar paredes, voltar como bumerangue, tiros extras, balas gigantes... Qualquer item funciona com qualquer arma: *Escopeta + Olho de Vidro + Mola* = 7 chumbos teleguiados que quicam.

Alguns pares liberam uma **SINERGIA** secreta, com nome e bônus extra: no Arsenal elas aparecem como ??? até você descobrir.

**Itens malditos** (☠) dão um bônus forte com um preço. Leia antes de pegar.

**Instalar no PC (como programa):** dê dois cliques em GERAR_SETUP.bat. Ele cria release/PAVIO-Setup-1.0.0.exe, um instalador em português que coloca o PAVIO no computador com atalho na Área de Trabalho e no Menu Iniciar. O jogo instalado abre numa janela própria, funciona sem internet, F11 liga e desliga a tela cheia e o menu ganha SAIR DO JOGO. Para só abrir o programa sem instalar: npm run app.

**Novo na v1.0:** a Sacristia (o lugar entre as partidas), maldições de andar, 8 desafios, skins por maestria, a Forja (fundir armas), 8 familiares, o Cassino, sementes para jogar a mesma masmorra com um amigo e a tela de resumo com gráfico e print.

**Novo na v0.9.1:** escolha de personagem antes de cada partida (como no Isaac), a Armaria 3D para girar e testar todas as armas, e um menu de pausa novo.

**Novo na v0.9:** transformações da vela, jogar em dupla (teclado ou controle), eventos surpresa nas salas, o chefe secreto O Criador e chefes que falam.

**Novo na v0.8:** continuar a partida, estatísticas, desafio diário, tutorial, dicas de sinergia ao pegar itens, relíquias por personagem, Fonte dos Desejos, Altar da Troca e a visita dos amigos.

**Novo na v0.7:** itens com efeitos de verdade (gatilhos e passivos), 100 itens ativos novos, itens de Jujutsu Kaisen e One Piece, 5 andares até O Apagador, o capítulo O Outro Lado (5 andares novos) com 7 chefes novos, 3 finais, 12 personagens jogáveis (Luiz, Ana, Henrique e originais) e o MODO DESENVOLVEDOR nas Opções (libera tudo e liga o F2).

**Novo na v0.6:** 600 itens novos (com referências a jogos, animes, filmes e séries) que combinam por etiquetas, 52 armas novas separadas por tier (TETE, NIX e YUUMI são míticas) e o menu de desenvolvedor no F2.

**Novo na v0.5:** itens ativos (tecla C), salas secretas atrás de paredes rachadas, salas de desafio, 15 conquistas que liberam armas e itens, e depois do Apagador: O Abismo, O Pavio Negro e o modo infinito.

**A vela muda de aparência** com os itens: cor da cera, cor da chama, 2/3/5 chamas, óculos, monóculo, coroa, chapéu de bruxa, asas, mola nos pés, olhos vermelhos, relógio...

Também há itens especiais: **Orbe de Cera** (gira em volta e bloqueia balas), **Velinha Gêmea** (atira junto) e **Casca de Cera** (escudo de 1 golpe por sala).

## Sistemas de combate

- **Parry**: na hora certa, rebate até 6 balas como balas douradas, cura, devolve um dash e congela a tela por um instante.
- **Esquiva perfeita**: passar raspando numa bala durante o dash = câmera lenta + cura + combo.
- **Combo e Frenesi**: x10 deixa você mais rápido e atirando mais; marcos FRENESI, MASSACRE, INFERNAL...
- **Críticos**, números de dano, luzes coloridas, tela piscando, luzes no ritmo da música. Dá para desligar **luzes piscantes**, **tremor** e **brilho** em Opções.

## Estrutura

```
PAVIO/
├── JOGAR.bat
├── public/
│   ├── dados/                ← quase tudo do jogo se edita aqui, sem mexer no código
│   │   ├── config.json         dificuldade, andares, chefes, preços, parry, elites...
│   │   ├── armas.json          as 17 armas
│   │   ├── itens.json          os 40 itens (efeitos e aparência)
│   │   ├── sinergias.json      combinações com nome
│   │   ├── inimigos.json       vida, dano, IA, custo, andar mínimo
│   │   ├── salas.json          salas especiais (as de combate são procedurais)
│   │   ├── historia.json       o texto da história
│   │   └── visual.json         liga monstros/tiles aos quadros do pack
│   └── assets/0x72/          ← pack 16x16 DungeonTileset II (CC0)
└── src/
    ├── cenas/                Boot, Abertura, Titulo, Historia, Menu, Altar, Jogo, HUD, Fim
    ├── entidades/            Jogador, Inimigo (todas as IAs e chefes)
    ├── sistemas/             Masmorra, GeradorSala (procedural), Itens (mods e sinergias)
    ├── arte/                 texturas, ícones dos itens, aparência da vela, atlas do pack
    ├── musica.ts             a trilha (metal 8 bits) escrita como partitura
    └── som.ts                sintetizador
```

## Editando a música

Em `src/musica.ts` cada faixa tem **seções** (intro, verso, refrão, ponte, solo) tocadas numa ordem:

```ts
riff: ['xxx.xxx.xxx.X---']          // guitarra: x abafada, X aberta, o oitava, - segura, . pausa
melodia: ['E5 - - G5 - - A5 - ...'] // nota, "." pausa, "-" segura
bateria: { bumbo: 'x.xxx.xxx.xxx.xx', caixa: '....x.......x...', chimbal: 'x.x.x.x.x.x.x.x.' }
```

## Comandos

```bash
npm run dev     # servidor de desenvolvimento (o que o JOGAR.bat roda)
npm run build   # gera a versão final em dist/
npm run check   # checa os tipos do TypeScript
```

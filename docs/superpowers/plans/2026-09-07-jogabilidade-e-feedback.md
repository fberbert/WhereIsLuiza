# Plano de implementação — atenção, animações e clareza do jogo

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` para executar este plano tarefa por tarefa quando a implementação for solicitada. Os passos usam checkboxes para acompanhamento. O planejamento foi seguido da autorização de execução pelo objetivo “implementar o plano”. Resultados e limites estão em `docs/SESSION-2026-09-07-jogabilidade.md`.

**Goal:** Implementar as sugestões 1 a 5: mostrar e embaralhar os copos, melhorar a revelação, dar clareza ao tabuleiro, simplificar o placar e mostrar o progresso da vida extra.

**Architecture:** Manter regras e permutações puras em `src/game`; um controlador de rodada coordena o estado com os callbacks das animações. A interface representa o estado, sem sortear uma nova resposta ao final do movimento. Persistir checkpoints versionados, separados de animações e sons transitórios.

**Tech Stack:** React Native 0.87.1, React 19, TypeScript, Animated, Lottie, AsyncStorage e Jest já presentes. Sem dependências novas previstas.

## Escopo e condições

- Base examinada: commit `e3edd74`, com correção da área segura já instalada no S25.
- A solicitação inicial autorizava somente planejamento; a execução posterior autorizou implementação, build e instalação no S25. Push e publicação permanecem fora do escopo.
- Na implementação, testar exclusivamente em `adb -s s25:5555`. Não executar emulador sem consentimento prévio, inclusive por comandos que iniciem um automaticamente.
- Preservar landscape, margens da área segura, três copos, três vidas iniciais, ponto por acerto, Hall da Fama local e configurações de áudio.
- Dois acertos acumulados dão uma vida; errar não apaga o primeiro acerto. Não estabelecer um teto novo para as vidas.
- Gravação de vozes, backend, publicação e atualização geral de dependências ficam fora do escopo.
- Valores de duração e espaçamento abaixo são propostas iniciais, a calibrar no S25 durante a implementação.

## Experiência proposta

### 1. Mostrar, esconder, embaralhar e escolher

Cada rodada segue esta ordem:

1. Mostrar Luiza sob um copo levantado por 1.200 ms. Texto: **“Olhe onde a Luiza está!”**
2. Baixar o copo em 220 ms, mantendo os toques bloqueados.
3. Executar trocas visíveis entre dois copos por vez. Texto: **“Acompanhe o copo!”**
4. Liberar a escolha somente após concluir a última troca. Texto: **“Onde está a Luiza?”**
5. Aceitar exatamente uma escolha e revelar o resultado.
6. Mostrar **“Próxima rodada”** após o feedback; esse botão inicia outra apresentação. Evita que um toque repetido no copo pule a preparação seguinte.

Cada copo tem identidade fixa `0`, `1` ou `2`; Luiza acompanha essa identidade durante toda a rodada. As posições esquerda/centro/direita mudam, mas não há novo sorteio após o embaralhamento.

| Pontuação antes da rodada | Trocas | Duração por troca |
| ------------------------- | ------ | ----------------- |
| 0–2                       | 3      | 650 ms            |
| 3–5                       | 4      | 560 ms            |
| 6–8                       | 5      | 470 ms            |
| 9 ou mais                 | 6      | 380 ms            |

Sortear pares de posições diferentes, evitando repetir imediatamente o mesmo par. Uma troca deve ter trajetórias distintas na altura para que os dois copos não se confundam na passagem. A dificuldade é calculada uma vez no início da rodada, com limite de velocidade.

### 2. Revelação e recompensa

- Levantar o copo escolhido em aproximadamente 300 ms; revelar Luiza também no copo correto em caso de erro.
- Acerto: Luiza faz um pequeno salto/escala, aparece **“Me achou!”**, e um único troféu voa até o placar em aproximadamente 500 ms.
- Erro: movimento curto e suave do copo errado, texto **“Vamos tentar de novo!”** e indicação de perda de um coração. Sem flashes ou tremores fortes.
- Vida extra: preencher o segundo indicador, animar um coração e então voltar o progresso visual para zero.
- Atualizar pontos e vidas uma única vez na lógica; a animação apenas comunica o resultado. Falhar uma animação ou um som nunca altera a pontuação nem impede a próxima rodada.
- Última vida: revelar primeiro e abrir o fim de jogo ao encerrar o feedback visual, sem permitir outra escolha.
- Reutilizar imagens e sons existentes. O salto dá personalidade à imagem atual sem exigir uma nova expressão facial ou geração de assets.

### 3. Hierarquia e cenário

- Preservar a floresta e os personagens; aplicar uma camada escura suave somente atrás da região de jogo, inicialmente `rgba(0, 0, 0, 0.18)`.
- Essa camada é decorativa, com `pointerEvents="none"`, e não intercepta os copos.
- Reduzir o título para uma faixa de 28–34 dp conforme o espaço e suspender seu balanço durante apresentação, embaralhamento e escolha.
- Pausar os movimentos decorativos da aranha durante esses mesmos momentos de atenção.
- Organizar título/controles, placar/instrução, tabuleiro e ação da rodada em faixas próprias, mantendo os controles fora das barras do Android.
- Substituir as margens fixas de 140/100 do tabuleiro e do placar por espaço medido no contêiner seguro. Reservar uma faixa lateral para o detetive, reduzindo-a em larguras menores.
- Dimensionar os copos pelo espaço disponível, com limite superior próximo do tamanho atual e áreas de toque de pelo menos 48 dp quando houver espaço. A trajetória inteira, inclusive a elevação, deve caber no tabuleiro.

### 4. Placar compacto

- Um único troféu acompanhado de **“Pontos: N”**; animação curta ao pontuar, sem um Lottie permanente por ponto.
- Até cinco corações visíveis. Acima disso, cinco corações e **“+N”** para o excedente; o rótulo acessível informa o total real.
- Exemplo: oito vidas = cinco corações + `+3`. Isso limita elementos renderizados, sem limitar vidas da partida.
- Manter o número do recorde visível, com espaço reservado para não colidir com o botão do Hall da Fama.

### 5. Progresso da vida extra

- Dois indicadores junto às vidas e texto **“Vida extra: 0/2”** ou **“Vida extra: 1/2”**.
- Primeiro acerto preenche um indicador. Um erro mantém esse preenchimento.
- Segundo acerto mostra brevemente `2/2`, concede uma vida e limpa os indicadores.
- A regra permanece no domínio; o estado transitório `2/2` pertence ao feedback e não é salvo como progresso pendente.
- Atualizar o README e os nomes dos testes que hoje mencionam “acertos seguidos”.

## Estado, interrupções e compatibilidade

Fluxo de fases proposto:

```text
preview -> covering -> shuffling -> guessing -> revealing -> roundEnd
                                                     \-> gameOver
roundEnd -> preview
gameOver -> salvar pontuação -> preview de uma nova partida
```

Tipos e limites entre módulos:

```ts
type CupId = 0 | 1 | 2
type SlotIndex = 0 | 1 | 2
type CupOrder = readonly [CupId, CupId, CupId] // identidade em cada posição
type Swap = readonly [SlotIndex, SlotIndex]
type Phase = 'preview' | 'covering' | 'shuffling' | 'guessing' | 'revealing' | 'roundEnd' | 'gameOver'
type Difficulty = { swaps: number; durationMs: number }
```

- `shuffle.ts`: `applySwap(order, swap)`, `planSwaps(count, rng)` e `difficultyForScore(score)`; sem React, sons ou temporizadores.
- `logic.ts`: estado com `score`, `lives`, `hitsTowardLife`, `luizaCupId`, `order`, `swaps`, `swapIndex`, `phase`, `lastGuess` e `roundId`. `lastGuess` identifica o copo, não a posição.
- `newGame(rng)` inicia `preview`; `nextRound(state, rng)` preserva pontos/vidas/progresso e cria outra rodada.
- `chooseCup(state, cupId)` aceita apenas `guessing` e retorna `{ state, events }`; os eventos existentes de acerto, erro, vida e fim de jogo continuam disponíveis.
- `completePhase(state, roundId)` conclui apresentação, cobertura ou revelação; `completeSwap(state, roundId, swapIndex)` aplica uma troca concluída. Eventos atrasados, índices já concluídos e IDs de rodada diferentes são ignorados.
- `useRoundController` coordena callbacks, estado de foreground, overlays e limpeza. A transição visual ocorre por callback `finished`, não por um temporizador que apenas presume que a animação acabou.
- Durante shuffle, bloquear toques tanto no componente quanto no domínio. Áudio nunca determina a progressão da fase.
- Abrir Hall/Sair ou colocar o app em segundo plano interrompe a animação, invalida callbacks e suspende áudio. Não perder vida nem conceder ponto por interrupção.
- Retomar uma rodada sem escolha: reapresentar Luiza e recomeçar o embaralhamento, preservando pontos, vidas e progresso. Uma nova geração de execução invalida callbacks anteriores mesmo se o `roundId` salvo for reutilizado.
- Retomar uma rodada já julgada: ir a `roundEnd` ou `gameOver`, sem reaplicar recompensa ou sons. Salvar o julgamento antes de depender de qualquer efeito visual.
- Rotação ou mudança de tamanho durante movimento: interromper e usar a mesma regra de retomada; medir novamente o tabuleiro e o destino do troféu.
- Respeitar redução de movimento: remover balanços/salto/voo decorativos; manter as trocas essenciais para o jogo, mais lentas, sem arcos acentuados e sem aumento agressivo de velocidade.

### Persistência

- Gravar `luiza.game` como envelope `{ version: 2, state: ... }`; não persistir valores Animated, coordenadas, referências de áudio ou progresso por frame.
- Validar números inteiros não negativos, vidas, progresso em `0|1`, identidades únicas dos três copos, fases e coerência de julgamento antes de restaurar.
- Migrar o formato atual sem envelope: preservar `score`, `lives` e `streak` como `hitsTowardLife`; se já terminou, restaurar `gameOver`; caso contrário, iniciar uma nova apresentação com esses totais.
- Manter intactas as chaves de configurações e ranking. O recorde continua sendo o máximo histórico pessoal; pontuações antigas não serão convertidas para a nova dificuldade e não são estritamente comparáveis.
- JSON ou formato inválido: descartar apenas a partida inválida e iniciar outra; preservar configurações/ranking. Falha de leitura do armazenamento: apresentar recuperação/repetição e não sobrescrever silenciosamente os dados existentes.
- Serializar checkpoints para evitar que uma gravação atrasada substitua estado mais recente. Em falha de gravação, informar que o progresso não foi salvo e manter o estado em memória para nova tentativa.
- Salvar ranking no fim de jogo deve ter estado de envio, bloquear toque duplo, mostrar erro e reiniciar a partida apenas após sucesso.

## Mapa dos arquivos

| Arquivo                                                                         | Responsabilidade planejada                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/game/shuffle.ts` e `shuffle.test.ts` (novos)                               | Pares de troca, permutações e dificuldade                                                   |
| `src/game/logic.ts` e `logic.test.ts`                                           | Fases, escolha por identidade e regras de recompensa                                        |
| `src/game/useRoundController.ts` (novo)                                         | Ciclo de vida, callbacks, pausa e coordenação dos efeitos                                   |
| `src/storage/game.ts` e `game.test.ts` (novo teste)                             | Envelope, validação, migração e checkpoints                                                 |
| `src/storage/persist.ts`                                                        | Fronteira de leitura/escrita sem confiar em cast de JSON                                    |
| `src/components/Board.tsx`                                                      | Área medida e disposição dos três copos                                                     |
| `src/components/AnimatedCup.tsx` (novo)                                         | Trajetória e elevação de cada copo com identidade estável                                   |
| `src/components/RoundFeedback.tsx` (novo)                                       | Mensagens e troféu transitório até o placar                                                 |
| `src/components/TrophiesRow.tsx`                                                | Um troféu e pontuação numérica                                                              |
| `src/components/LivesRow.tsx`                                                   | Corações em quantidade visual limitada e excedente                                          |
| `src/components/ExtraLifeProgress.tsx` (novo)                                   | Dois indicadores e feedback de vida extra                                                   |
| `src/components/AnimatedTitle.tsx`, `Spider.tsx`, `Detective.tsx`, `TopBar.tsx` | Tamanho/pausa/posicionamento adequados às faixas do layout                                  |
| `src/screens/GameScreen.tsx`, `src/theme.ts`                                    | Composição, camada de contraste, ação seguinte e tokens visuais                             |
| `src/audio/useAudio.ts`                                                         | Suspensão, retomada e cancelamento de efeitos pendentes                                     |
| `src/overlays/GameOverOverlay.tsx`                                              | Envio de pontuação com bloqueio e recuperação                                               |
| `__tests__/App.test.tsx`                                                        | Integração do fluxo completo com mocks nativos                                              |
| `__tests__/RoundController.test.tsx`, `Scoreboard.test.tsx` (novos)             | Interrupções e placar                                                                       |
| `README.md`, `docs/SESSION-2026-09-07-safe-area.md`                             | Referências a preservar; documentar novas regras no README e criar novo SESSION ao concluir |

## Sequência de implementação

Cada tarefa segue RED → GREEN → revisão. As mensagens de commit abaixo são indicativas; a execução agrupou os contratos interdependentes numa entrega integrada validada. Não publicar nem fazer push automaticamente.

### Tarefa 1 — modelo de embaralhamento

**Arquivos:** `src/game/shuffle.ts`, `src/game/shuffle.test.ts`.

- [x] Escrever testes determinísticos para troca, imutabilidade, pares válidos, identidade de Luiza e limites de dificuldade.

```ts
const initial: CupOrder = [0, 1, 2]
const first = applySwap(initial, [0, 2])
const last = applySwap(first, [1, 2])
expect(initial).toEqual([0, 1, 2])
expect(last).toEqual([2, 0, 1])
expect(last.indexOf(0)).toBe(1)
expect(difficultyForScore(0)).toEqual({ swaps: 3, durationMs: 650 })
expect(difficultyForScore(999)).toEqual({ swaps: 6, durationMs: 380 })
```

- [x] Rodar `npm test -- --runInBand src/game/shuffle.test.ts`; confirmar falha por comportamento ausente.
- [x] Implementar troca por cópia da tupla, lista dos pares `[0,1]`, `[0,2]`, `[1,2]`, seleção injetável e tabela de dificuldade acima.
- [x] Reexecutar testes; revisar que o copo acompanha a permutação sem sorteio final. Commit `feat: modela embaralhamento e dificuldade dos copos`.

### Tarefa 2 — fases e julgamento único

**Arquivos:** `src/game/logic.ts`, `src/game/logic.test.ts`.

- [x] Criar testes de cada transição; usar a fase `guessing` explicitamente nos cenários de escolha.
- [x] Testar que tocar em preview/covering/shuffling/revealing não produz pontos, vidas nem eventos; segunda escolha também é ignorada.
- [x] Testar acerto → erro → acerto: progresso `1 → 1 → 0`, dois pontos e concessão de exatamente uma vida.
- [x] Testar callbacks duplicados, fora de ordem e de rodada anterior; última vida chega a `revealing` antes de `gameOver`.
- [x] Rodar `npm test -- --runInBand src/game/logic.test.ts`, observar as falhas e implementar os contratos definidos em “Estado”.
- [x] Atualizar `cupFace`/representação para separar imagem da Luiza e imagem do copo: a revelação passa a levantar o copo, em vez de apenas trocar o bitmap.
- [x] Confirmar os testes verdes. Commit `feat: controla fases e escolha única por rodada`.

### Tarefa 3 — migração e checkpoints

**Arquivos:** `src/storage/game.ts`, `src/storage/game.test.ts`, `src/storage/persist.ts`.

- [x] Escrever fixtures do formato antigo: partida em andamento, fase revelada, game over, JSON inválido e campos incompatíveis.
- [x] Exigir preservação de score/vidas/progresso e ausência de escrita nas chaves de settings/ranking.
- [x] Testar restauração em cada fase v2, leitura rejeitada e gravações completando fora da ordem de solicitação.
- [x] Rodar `npm test -- --runInBand src/storage/game.test.ts` antes da implementação.
- [x] Implementar validação/migração e fila de checkpoints; aguardar o julgamento salvo antes de permitir avançar à rodada seguinte.
- [x] Confirmar que falha de gravação tem recuperação e que dados parcialmente carregados não são sobrescritos. Commit `feat: migra e preserva partidas entre fases`.

### Tarefa 4 — copos animados e controlador

**Arquivos:** `src/components/Board.tsx`, `src/components/AnimatedCup.tsx`, `src/game/useRoundController.ts`, `__tests__/RoundController.test.tsx`, `src/screens/GameScreen.tsx`.

- [x] Criar testes com conclusão de animação controlada: nenhuma troca é aplicada antes do callback, e `finished: false` não avança fase.
- [x] Testar AppState inativo, abertura de overlay, desmontagem e alteração de dimensões durante cada fase; callbacks antigos não podem alterar uma nova execução.
- [x] Implementar o controlador e substituir a coordenação dispersa no `GameScreen`; efeitos e decisões de persistência devem sair de callbacks de renderização.
- [x] Medir o tabuleiro com `onLayout`; conservar `key={cupId}` ao trocar posições e usar transforms com driver nativo. Não animar `left`, largura ou margem a cada frame.
- [x] Remover o balanço vertical coletivo atual dos copos; a movimentação passa a indicar apenas embaralhamento/revelação.
- [x] Adicionar instrução por fase, botão de próxima rodada e rótulos acessíveis de posição sem revelar a resposta enquanto fechado.
- [x] Executar `npm test -- --runInBand __tests__/RoundController.test.tsx src/game` e TypeScript. Commit `feat: anima apresentação e troca dos copos`.

### Tarefa 5 — placar e progresso da vida extra

**Arquivos:** `TrophiesRow.tsx`, `LivesRow.tsx`, `ExtraLifeProgress.tsx`, `__tests__/Scoreboard.test.tsx`, `GameScreen.tsx`.

- [x] Escrever testes de pontos `0`, `1`, `1000`; deve existir um único ícone de troféu em todos os casos.
- [x] Testar vidas `0`, `3`, `5`, `8`; para oito, renderizar cinco corações, `+3` e rótulo “8 vidas”.
- [x] Testar progresso `0/2`, `1/2`, erro sem reset e feedback transitório `2/2` seguido de `0/2`.
- [x] Rodar `npm test -- --runInBand __tests__/Scoreboard.test.tsx`; implementar componentes com texto explícito e animação apenas quando houver mudança.
- [x] Confirmar que o número de elementos animados não cresce com a pontuação ou o total de vidas. Commit `feat: simplifica placar e mostra progresso da vida extra`.

### Tarefa 6 — revelação, troféu e sincronização de áudio

**Arquivos:** `AnimatedCup.tsx`, `RoundFeedback.tsx`, `useRoundController.ts`, `src/audio/useAudio.ts`, `__tests__/RoundController.test.tsx`.

- [x] Testar que uma escolha produz um único conjunto de eventos; callbacks repetidos não repetem som nem recompensa.
- [x] Testar áudio desligado, load de som com erro e áudio cancelado; nenhum deles bloqueia o fluxo visual.
- [x] Implementar elevação, salto suave e feedback de erro. Medir copo e placar no mesmo sistema de coordenadas para o voo do troféu.
- [x] Criar no máximo um troféu transitório e liberar suas referências ao concluir, interromper ou desmontar.
- [x] Encadear acerto/vida usando o áudio existente, mas revalidar a preferência atual antes de iniciar o som seguinte; cancelar sequência ao sair de foreground.
- [x] Em redução de movimento, substituir voo/salto por indicação estática ou fade curto. Manter o significado do resultado.
- [x] Reexecutar testes do controlador e app. Commit `feat: adiciona feedback visual às descobertas da Luiza`.

### Tarefa 7 — composição visual e área segura

**Arquivos:** `GameScreen.tsx`, `Board.tsx`, `AnimatedTitle.tsx`, `Spider.tsx`, `Detective.tsx`, `TopBar.tsx`, `theme.ts`.

- [x] Aplicar as faixas de conteúdo, tamanhos de título e camada de contraste descritos na experiência proposta.
- [x] Preservar as margens calculadas de safe area no contêiner dos controles absolutos; não reintroduzir padding como única proteção.
- [x] Medir largura e altura úteis, incluindo o espaço necessário para elevar os copos. Tratar layout ainda não medido bloqueando o início da animação.
- [x] Pausar a decoração nos momentos de atenção e reservá-la fora das trajetórias/toques dos copos.
- [ ] Validação física parcial; conferir landscape invertido em sessão coordenada. No landscape usado no S25 foram observados: título, X, áudio, Hall, copos, placar e overlays inteiramente utilizáveis.
- [x] Não mudar a configuração global de navegação/resolução do S25 sem solicitação. Tamanhos adicionais podem ser modelados nos testes de layout, mas não substituem validação visual real.
- [x] Commit `feat: destaca tabuleiro e reorganiza interface do jogo` após revisão visual.

### Tarefa 8 — integração e salvamento final

**Arquivos:** `__tests__/App.test.tsx`, `GameScreen.tsx`, `GameOverOverlay.tsx`, `src/storage/leaderboard.test.ts`.

- [x] Limpar armazenamento mockado, timers e árvores renderizadas entre testes; cada cenário deve ser independente.
- [x] Adaptar teste de toque: avançar apresentação e concluir trocas antes de escolher. Não manter a suposição antiga de que o app abre com copos já disponíveis.
- [x] Cobrir partida completa com RNG fixo: apresentação, shuffle, acerto, erro, vida extra, próxima rodada, game over e gravação no ranking.
- [x] Cobrir toque duplo em salvar, erro de gravação e nova tentativa; não reiniciar nem duplicar o ranking durante envio.
- [x] Verificar retomada de partida legada e v2 pela interface, sem apagar nome, preferências ou recorde.
- [x] Adicionar limiar de cobertura para o código novo/modificado após medir a base; exigir pelo menos 80% de instruções, branches, funções e linhas desse escopo, sem criar exclusões para esconder código não testado.
- [x] Commit `test: cobre ciclo completo e retomada do novo jogo`.

### Tarefa 9 — verificação no S25 e entrega

- [x] Preparar Node 22 e executar os checks locais:

```bash
export PATH=/opt/node-v22.21.1/bin:$PATH
npm test -- --runInBand --coverage --coverageDirectory=/tmp/whereisluiza-jogabilidade-coverage
./node_modules/.bin/tsc --noEmit
npm run lint
./node_modules/.bin/prettier --check src __tests__ README.md
npm audit
```

- [x] Avaliar avisos de dependências separadamente. A base já registrava oito ocorrências high; não rodar `npm audit fix --force` nem mudar RN como parte automática deste plano.
- [x] Revisar código e segurança, corrigir regressões do trabalho e gerar release com Node 22 no PATH, em `android/`: `./gradlew assembleRelease --console=plain`.
- [x] Na etapa de execução autorizada, confirmar o serial e atualizar preservando dados:

```bash
adb devices -l
adb -s s25:5555 install -r android/app/build/outputs/apk/release/app-release.apk
adb -s s25:5555 shell am start -W -n com.whereisluiza/.MainActivity
```

- [x] Testar os três destinos da Luiza, o primeiro e o último nível de velocidade, toques rápidos durante movimento, acerto/erro/vida extra e números grandes no placar usando fixtures nos testes, sem inventar pontuações no ranking pessoal do aparelho.
- [ ] Checklist físico parcial: X/cancelar, Hall/voltar e retomada verificados; falta repetir áudio on/off, interrupção durante revelação e fim de jogo na release final em sessão coordenada. Não desinstalar nem limpar dados para testar migração.
- [x] Observar fluidez e consumo visual de animações, calibrar tempos sem ultrapassar os limites definidos e registrar qualquer comportamento não validado fisicamente.
- [x] Atualizar README com a regra de memória, dois acertos acumulados, próxima rodada e conservação do recorde. Criar SESSION com evidências e a restrição de não usar emulador sem consentimento.
- [x] Commit local de documentação; entregar resumo, APK e limitações verificadas. Push/publicação continuam fora do escopo.

## Critérios de conclusão

- A resposta final coincide sempre com o copo acompanhado visualmente, inclusive após várias trocas.
- Não é possível pontuar ou perder vidas com toques durante a preparação, callbacks repetidos ou retomada do app.
- Acerto e erro têm feedback claro; troféu, vida extra e sons não impedem o andamento da partida.
- Pontuação e quantidade de vidas não multiplicam indefinidamente os elementos visuais.
- O jogador entende quanto falta para a vida extra; um erro preserva o progresso acumulado.
- O X e todos os controles permanecem acessíveis junto à barra de navegação do S25.
- Partidas antigas são migradas sem perda dos totais válidos; configurações e ranking continuam preservados.
- Testes do domínio, integração e cobertura do escopo concluídos. Resultados e limites do checklist físico registrados no SESSION; itens físicos parciais ficam explicitamente abertos acima.

## Ordem das entregas

1. Regras, permutações e migração — tarefas 1–3.
2. Rodada jogável com embaralhamento real — tarefa 4.
3. Placar e progresso de vida extra — tarefa 5.
4. Revelação e recompensa animada — tarefa 6.
5. Layout final e validação completa — tarefas 7–9.

Os três primeiros passos formam a base funcional. A calibração visual final ocorre depois que a nova rodada já funciona, para avaliar o movimento real no S25.

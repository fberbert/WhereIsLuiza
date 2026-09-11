# Sessão — embaralhamento, feedback e placar (2026-09-07)

## Autorização e ambiente

Implementação do plano `docs/superpowers/plans/2026-09-07-jogabilidade-e-feedback.md`,
autorizada pelo objetivo **“implementar o plano”**, a partir de `e3edd74`.
Branch local: `feat/jogabilidade-e-feedback`. Implementação: commit `f591d37`.
Sem push ou publicação.

**Não executar emuladores sem consentimento prévio.** A validação Android desta
implementação usou exclusivamente `adb -s s25:5555`, com atualização por
`install -r`. Não houve desinstalação, limpeza dos dados, alteração de resolução
ou configuração global de navegação do aparelho.

## Comportamento entregue

1. Luiza aparece durante 1.200 ms, o copo fecha em 220 ms e começam as trocas.
   A identidade do copo é estável: a resposta acompanha as posições mostradas.
   Só há escolha após o último movimento; **Próxima rodada** inicia a seguinte.
   São 3/4/5/6 trocas de 650/560/470/380 ms nos patamares 0/3/6/9 pontos.
2. A escolha é contabilizada uma vez e salva antes de liberar a animação.
   O acerto levanta o copo correto, anima Luiza e envia um único troféu ao placar.
   O erro levanta também o copo escolhido e mantém o progresso para vida extra.
   A última vida é revelada antes da tela de fim de jogo.
3. O layout mantém a floresta e as margens da área segura, separa os controles,
   placar, instrução, tabuleiro e rodapé, e mede o espaço dos copos. O tabuleiro
   tem contraste suave; título e aranha pausam nos momentos de atenção.
4. O placar usa um troféu com pontuação numérica e até cinco corações com o
   excedente `+N`. Não há limite novo para as vidas da partida.
5. O progresso mostra `0/2`, `1/2` e brevemente `2/2` quando concede uma vida.
   São dois acertos acumulados; errar entre eles não apaga o primeiro acerto.

Nenhuma dependência foi adicionada. Imagens, fontes, Lottie e sons foram
reutilizados. Com redução de movimento, as trocas essenciais ficam mais lentas
e as animações decorativas são suprimidas.

## Estado e persistência

- `src/game/logic.ts` e `shuffle.ts` concentram as regras puras, a dificuldade e
  as permutações. IDs de rodada, fase esperada e índice da troca rejeitam
  callbacks atrasados ou duplicados.
- `useRoundController` coordena animação, julgamento, checkpoints e interrupções.
  Hall, confirmação de saída e segundo plano suspendem a rodada e o áudio.
  Retomar antes da escolha reapresenta Luiza; depois da escolha, retoma o
  resultado sem repetir pontos, vidas ou sons.
- `luiza.game` passa a usar `{ version: 2, state }`, com validação e migração.
  Partidas legadas em andamento preservam os totais e começam uma apresentação;
  partidas encerradas mantêm o fim de jogo. Settings e ranking mantêm as chaves.
- As gravações de checkpoints e preferências são serializadas. Falhas de leitura
  não sobrescrevem os dados existentes; falhas de escrita têm nova tentativa.
  Salvar o ranking bloqueia toque duplo e só reinicia após sucesso.
- `useGameSession` e `useGameEnvironment` foram extraídos para separar hidratação,
  preferências, ranking, foreground e redução de movimento da composição visual.

Os commits foram agrupados por entrega integrada, em vez dos nove commits
indicativos do plano, pois o novo contrato de fases precisava ser integrado
entre domínio, persistência e interface antes de compilar o aplicativo completo.

## Regressão encontrada no aparelho

Em rodadas consecutivas, um copo incorreto permanecia levantado depois de um
acerto. No Android/Fabric do RN 0.87, trocar uma propriedade de interpolação
nativa por número constante deixava uma transformação anterior no componente.

`AnimatedCup` agora conserva os nós de interpolação também nos estados estáticos,
incluindo elevação, deslocamento de erro, opacidade e salto da Luiza. O teste de
regressão primeiro falhou e depois passou; a nova release foi reinstalada e
filmada no S25. A próxima rodada fechou todos os copos e o acerto levantou somente
o correto. A aranha também ganhou um frame estático visível durante a pausa.

## Verificação automatizada

Node `/opt/node-v22.21.1/bin/node`, versão 22.21.1:

```sh
export PATH=/opt/node-v22.21.1/bin:$PATH
npm test -- --runInBand --coverage --coverageDirectory=/tmp/whereisluiza-jogabilidade-coverage
./node_modules/.bin/tsc --noEmit
npm run lint
./node_modules/.bin/prettier --check src __tests__ README.md
git diff --check
npm audit
```

- **12 suites, 214 testes aprovados.** Cobertura global: 98,14% instruções,
  94,12% ramificações, 97,87% funções e 99,22% linhas. Limiar obrigatório de 80%
  nas quatro métricas, coletando todo o código de `src` exceto os próprios testes.
- TypeScript, ESLint, Prettier e verificação de whitespace aprovados.
- Revisões independentes de aderência ao plano e correção do código realizadas.
- Fixtures cobrem as três posições, todos os patamares de dificuldade, pontuação
  alta, vidas excedentes, julgamento único, acerto/erro/acerto, callbacks antigos,
  interrupções, dimensões, redução de movimento, migração e falhas de persistência.
- Testes de integração cobrem uma partida até o ranking e o bloqueio/recuperação
  de salvamento; usam mocks dos módulos nativos. Não equivalem a E2E nativo.
- `npm audit`: oito ocorrências **high**, zero **critical**, preexistentes na
  árvore `image-size`/Metro/React Native. Não houve mudança de dependências nem
  aplicação de `audit fix --force`.

## Verificação física e limites

S25, landscape 2340 × 1080, navegação de três botões:

- Release compilada e instalada com preservação dos dados; recorde anterior `2`
  permaneceu visível. Preferências de áudio permaneceram disponíveis.
- Apresentação, fechamento, trocas e liberação de escolha observados em vídeo.
  Em uma rodada com quatro trocas, Luiza começou à direita, terminou no centro
  conforme o movimento acompanhado e foi encontrada no centro.
- Confirmados pontuação `5 → 6`, vidas `3 → 4`, progresso `1/2 → 2/2 → 0/2`,
  salto, voo do troféu e botão da próxima rodada. Rodadas posteriores mostraram
  também o erro, com os dois copos correspondentes levantados e progresso mantido.
- X acessível fora da barra do Android: abriu a confirmação; cancelar retornou
  ao resultado, preservando `7` pontos, `3` vidas e progresso `1/2`.
- Após a continuação solicitada, Hall/voltar foi conferido: o ranking mostrou
  o novo resultado `8` e o anterior `2`. Esse novo resultado já estava salvo
  quando o aplicativo foi reaberto; não foi inserido diretamente pelo agente.
  Voltar ao jogo reapresentou Luiza. Home/reabrir antes da escolha também voltou
  à prévia e depois liberou os copos, mantendo `0` pontos, `3` vidas e recorde `8`.
- Captura do log do processo não apresentou `FATAL EXCEPTION`, erro JS ou
  `AndroidRuntime`. Houve aviso de biblioteca Samsung `libpenguin.so` ausente,
  sem falha observada no jogo.

Houve atividade de jogo entre comandos ADB. Para evitar interferência na partida,
a verificação física adicional foi limitada. Background e retomada
em cada fase, áudio ligado/desligado, fim de jogo/salvamento, redução de movimento,
vidas acima de cinco e landscape invertido não foram todos repetidos fisicamente
na release final. Os fluxos correspondentes estão cobertos automaticamente,
exceto a avaliação auditiva e a geometria do landscape invertido. Não houve
medição instrumental de FPS nem avaliação auditiva pela gravação de tela.

Artefatos locais temporários desta verificação, fora do Git:

- `/tmp/wil-round-validation.mp4`: apresentação e embaralhamento.
- `/tmp/wil-hit-validation.mp4`: acerto, troféu e vida extra.
- `/tmp/wil-hit-end.png`, `/tmp/wil-current-status.png`: resultado após acerto e erro.
- `/tmp/wil-hall-final.png`, `/tmp/wil-hall-return.png`, `/tmp/wil-resume-preview.png`,
  `/tmp/wil-resume-guessing.png`: Hall, retorno e retomada antes da escolha.
- `/tmp/wil-tests.log`, `/tmp/whereisluiza-jogabilidade-coverage/`: testes/cobertura.
- `/tmp/wil-gameplay-build.log`, `/tmp/wil-final-device.log`: build e log do processo.

## APK entregue

Build em `android/`: `./gradlew assembleRelease --console=plain`, com Node 22 no PATH.
Arquivo: `android/app/build/outputs/apk/release/app-release.apk`.
SHA-256: `e0d91fb3c2cd5873cce021f5abb54b8462255260e33eb84ef96e753a8bce40c2`.
É a release já instalada no S25; funciona sem Metro.

Para futuras verificações, conferir primeiro o foco do aplicativo e coordenar
qualquer sequência de toques com quem estiver usando o S25. Não inserir pontuações
artificiais no ranking pessoal e não limpar armazenamento para testar migração.

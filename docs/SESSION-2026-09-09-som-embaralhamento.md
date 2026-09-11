# Sessão — som dos copos no embaralhamento

## Escopo autorizado

Gerar um efeito por código, integrar uma reprodução por troca dos copos, compilar
o APK release e atualizar o aparelho `s25:5555`, preservando os dados. Não usar
emulador. Sem publicação na Play Store ou push.

## Implementação

- `scripts/generate_shuffle_sound.py` sintetiza ruído filtrado de deslizamento e
  um toque oco suave no final. Usa somente a biblioteca padrão do Python e uma
  semente fixa; não utiliza gravações nem assets de bancos de som.
- Saída: `android/app/src/main/res/raw/shuffle.wav`, PCM16 mono, 44.100 Hz,
  360 ms, 31.796 bytes. Pico limitado a aproximadamente -6 dBFS, com início e
  final suaves. Regenerar com `python3 scripts/generate_shuffle_sound.py`.
- `useAudio.playShuffle(durationMs)` usa uma instância de Sound própria,
  pré-carregada, volume 0,55 e velocidade `360 / durationMs`. Assim, o mesmo
  efeito acompanha os patamares de velocidade e a redução de movimento.
- `Board` inicia o efeito apenas ao iniciar uma troca medida e habilitada.
  Conclusão, interrupção, troca de fase e desmontagem encerram a reprodução.
  `GameScreen` conecta a animação ao controle de áudio.
- Mute, segundo plano e overlays interrompem o som. Uma geração separada
  invalida callbacks de parada atrasados e evita que uma limpeza antiga pare
  uma reprodução nova. O áudio não determina pontos nem avanço da rodada.

## Verificação

- TDD: sete testes novos do áudio e dois do tabuleiro falharam pela ausência do
  comportamento antes da implementação e passaram depois. Teste adicional de
  integração confirma a conexão do som com o botão de efeitos.
- 224 testes / 12 suites aprovados. Cobertura global: 98,25% instruções,
  94,33% ramificações, 97,95% funções e 99,27% linhas.
- TypeScript, ESLint e Prettier aprovados. WAV verificado quanto a formato,
  duração, amostras não silenciosas, pico sem clipping e extremos suaves.
- `react-native-sound` instalado oferece `setSpeed` no Android; a integração
  usa a API existente, sem dependências novas.

## Entrega

APK: `android/app/build/outputs/apk/release/app-release.apk`.
Build: Node 22 no PATH, `android/gradlew -p android assembleRelease --console=plain`.
Instalação: `adb -s s25:5555 install -r` no APK acima.
Resultados de build e instalação serão registrados após concluir a validação.

## Validação para integração — 2026-09-11

- Regra pendente consolidada: vida extra a cada cinco acertos acumulados,
  preservando o progresso após erros e ao carregar partidas. README e testes
  de integração atualizados para essa regra.
- Node 22.21.1: 233 testes em 12 suites aprovados; cobertura de 98,25% das
  instruções, 94,35% das ramificações, 97,95% das funções e 99,27% das linhas.
- ESLint, TypeScript e `git diff --check` aprovados.
- `assembleRelease` aprovado. Não houve instalação nem teste em aparelho nesta
  validação para commit.
- `npm audit` reportou oito alertas altos na cadeia existente de
  `image-size`/Metro. O lockfile não foi alterado; a correção automática proposta
  exige mudança incompatível de dependências e não foi aplicada nesta integração.

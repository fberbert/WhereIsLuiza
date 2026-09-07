# Handoff — WhereIsLuiza (sessão 2026-09-04)

Resumo para retomar o trabalho com outro assistente/LLM. Tudo abaixo está verificado no estado atual do repositório (`master` em `eea6af2`, working tree limpa).

## O projeto

"Onde Está Luiza?" — jogo Android em React Native que o Fábio (fberbert) fez para a filha. Três copos, adivinhe onde a Luiza está. Repo: https://github.com/fberbert/WhereIsLuiza (público). Código em português; commits em português.

## O que foi feito nesta sessão

### 1. Diagnóstico
- O diretório local era uma cópia idêntica do remoto, mas sem `.git`. Restaurei o `.git` a partir de um clone.
- O app (RN 0.62, 2020) fechava ao abrir no Samsung S25 (Android 16). Causa capturada via `adb logcat`:
  `UnsatisfiedLinkError: couldn't find DSO to load: libhermes.so` — SoLoader 0.8 não procura em `/system/lib64`; o S25 é arm64-only; JSC falhava e caía no Hermes, que não estava no APK. Sem fix sem subir o RN.
- Backend do Hall da Fama (`vivaolinux.com.br/publico/WhereIsLuiza` e `187.84.229.156:8040`) retorna 404. Removido.
- Senha do keystore (`m3uGoogle!`) estava commitada em `android/app/build.gradle` no repo público. **Ainda está no histórico do git.** Keystore novo gerado; se a senha for reutilizada em outro lugar, trocar lá.

### 2. Decisões do usuário (já tomadas, não perguntar de novo)
- Projeto RN 0.87 novo gerado pelo template, código portado (não upgrade incremental, não Expo).
- Hall da Fama **local** (top 10 em AsyncStorage), não backend.
- Modernizar de verdade: TypeScript, function components + hooks, lógica pura testável.
- App é só sideload (não está na Play Store) → keystore novo, senha fora do git.
- Usuário pediu autonomia total e para ser incomodado só com o jogo pronto.

### 3. Implementação (commits `f49c5e5`..`eea6af2`)
- `android/`, `ios/`, config raiz: template `@react-native-community/cli init --version 0.87.1`.
- `android/app/build.gradle`: `applicationId com.whereisluiza`, `versionCode 4`, `versionName "2.0"`, signing release lê `WHEREISLUIZA_*` de `~/.gradle/gradle.properties`.
- `AndroidManifest.xml`: `android:screenOrientation="sensorLandscape"` (substitui `react-native-orientation-locker`).
- Ícones antigos copiados para `res/mipmap-*`; fontes em `android/app/src/main/assets/fonts/`; **sons em `android/app/src/main/res/raw/`** (`forest.mp3`, `got_it.mp3`, `errou.mp3`, `vida.mp3`, `game_over.mp3`, `boing.wav`, `spider.mp3`).
- Dependências: `@react-native-async-storage/async-storage` 3, `lottie-react-native` 7.5, `react-native-sound` 0.13, `@react-native-vector-icons/fontisto` e `/fontawesome5` 13 (imports `/static`), `react-native-safe-area-context` 5.
- Código novo em `src/`:
  - `game/logic.ts` — `newGame`, `nextRound`, `tap(state, cup, rng) → {state, events}`, `cupFace`. Puro. 10 testes.
  - `storage/persist.ts`, `settings.ts` (`luiza.settings`), `game.ts` (`luiza.game`, partida em andamento), `leaderboard.ts` (`luiza.leaderboard`, `insertEntry` puro + 3 testes).
  - `audio/useAudio.ts` — música em loop vol 0.2, efeitos; `playEvents` encadeia `extraLife` depois de `hit` (comportamento original).
  - `components/` — `AnimatedTitle` (+`useSway`), `Board`, `LivesRow`, `TrophiesRow`, `Detective`, `Spider`, `TopBar`, `Wallpaper`, `Overlay`.
  - `overlays/` — `CloseAppOverlay`, `GameOverOverlay`, `HallOfFameOverlay`.
  - `screens/GameScreen.tsx` — estado, persistência, composição. `App.tsx` = `SafeAreaProvider` + `GameScreen`.
  - `assets.ts` (índice de `require`s), `theme.ts` (fontes/cores).
- `__tests__/App.test.tsx` — renderiza o app com mocks nativos, exercita um toque de copo e verifica que settings persistidos não são sobrescritos. Total: **15 testes, todos passando**.
- Prettier: `semi: false`, `printWidth: 120`, `singleQuote`, `arrowParens: avoid`.
- `src/*.js` antigos, assets órfãos, `assets/sounds/`, `assets/fonts/` removidos. README reescrito.
- Plano completo com notas de execução: `docs/superpowers/plans/2026-09-04-modernizacao-rn087.md` (seção "Execução — desvios do plano" no fim).

### 4. Regras do jogo preservadas (de `Game.js` original)
3 copos, sorteio uniforme; 3 vidas iniciais; acerto = +1 score, +1 streak; `streak === 2` → streak 0, +1 vida, som "vida" **após** o som de acerto; erro = −1 vida, copos errados mostram `cup-wrong`, o certo mostra `luizaHead`; **streak não zera ao errar** (mantido de propósito); vidas 0 → game over, atualiza recorde; toque com copos revelados → nova rodada mantendo score/vidas/streak; salvar no game over grava no Hall da Fama e reinicia; partida em andamento persiste entre aberturas do app.

### 5. Bugs encontrados só em runtime (e resolvidos)
| Sintoma | Causa | Fix |
|---|---|---|
| Tela preta, `TypeError: undefined is not a function` em `GameScreen` | `react-native-sound` 0.13 não aceita id numérico de `require()`; exige string + `Sound.MAIN_BUNDLE`; `setVolume/setNumberOfLoops/play` só funcionam após o callback de load | sons em `res/raw`, hook aplica tudo no `onReady` |
| Hall da Fama desenhado em ~65% da largura | `Image` com `StyleSheet.absoluteFill` sem `width/height` no Fabric fica no tamanho intrínseco (598×398 dp) | `Wallpaper` usa `width/height: '100%'` |
| `Modal` nativo anima slide de lado em landscape | comportamento do Fabric/Dialog | `Overlay` = View absoluto com fade + `BackHandler` |
| Recorde/nome apagados ao abrir | `useEffect` de `saveSettings` disparava com defaults antes do `loadSettings` resolver | `settings` começa `null`; persiste só depois de carregado |
| `ImageBackground` deprecado no 0.87 | — | `Wallpaper` |

### 6. Verificação realizada
- `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check`, `npx jest` → tudo limpo, 15/15.
- APK release (`android/app/build/outputs/apk/release/app-release.apk`, ~64 MB, targetSdk 36) instalado no **S25 via `adb -s s25:5555`** (Wi-Fi ADB): processo sobe, `ReactNativeJS: Running "WhereIsLuiza"`, zero `FATAL`.
- **O S25 ficou com tela bloqueada por PIN durante toda a sessão**, então o checklist visual/interativo completo foi feito em **emulador Android 16 x86_64** (AVD `wil`, `-gpu swangle_indirect`, headless): acerto, erro, vida extra, game over, digitar nome, salvar, Hall da Fama ordenado, toggles de música/efeitos, aranha e detetive com som, "Sair → Sim" volta pro launcher, matar o app e reabrir retoma a partida. Screenshots via `adb exec-out screencap`.
- Recorde/nome antigos do app 0.62 foram perdidos (keystore diferente → desinstalação obrigatória).

## Ambiente da máquina (instalado nesta sessão)
- Node do sistema é 25.9 — **RN 0.87 não aceita**. Usar `export PATH=/opt/node-v22.21.1/bin:$PATH` (Node 22.21.1).
- JDK 21 (`/usr/lib/jvm/java-21-openjdk-amd64`), ok para Gradle 9 / AGP 8.
- Android SDK em `~/Android/Sdk` (`ANDROID_HOME` já aponta): `cmdline-tools/latest`, `platform-tools`, `platforms;android-37.0`, `build-tools;37.0.0` (+36.0.0 baixado pelo Gradle), `ndk;27.1.12297006`, `cmake;3.22.1`, `emulator`, `system-images;android-36;google_apis;x86_64`. AVD `wil` criado (pixel_6).
- `~/.gradle/gradle.properties` contém `WHEREISLUIZA_STORE_FILE/KEY_ALIAS/STORE_PASSWORD/KEY_PASSWORD` (senha aleatória gerada com openssl; **não está em nenhum arquivo do repo**). Keystore em `android/app/whereisluiza.keystore` (gitignored).
- Primeiro `assembleRelease` levou ~42 min (C++ da New Architecture); incrementais levam ~45–90 s.
- Emulador foi parado ao fim da sessão. Para subir: `~/Android/Sdk/emulator/emulator -avd wil -no-window -no-audio -no-boot-anim -gpu swangle_indirect -no-snapshot -port 5554`.

## Comandos úteis
```bash
export PATH=/opt/node-v22.21.1/bin:$HOME/Android/Sdk/platform-tools:$PATH ANDROID_HOME=$HOME/Android/Sdk
npm test && npx tsc --noEmit && npx eslint .
cd android && ./gradlew assembleRelease && cd ..
adb -s s25:5555 install -r android/app/build/outputs/apk/release/app-release.apk
adb -s s25:5555 logcat -d | grep -E 'ReactNativeJS|FATAL'
# debug com Metro (celular na mesma rede; PC = 192.168.0.120):
npx react-native start --host 0.0.0.0   # e no aparelho debug_http_host=192.168.0.120:8081
```

## Pendências / ideias não executadas (nenhuma foi pedida)
- Nada bloqueante. O objetivo ("jogo rodando no Android atual, código modernizado") está concluído e mergeado.
- Possíveis próximos passos se o usuário quiser: publicar no GitHub (`git push origin master`), ajustar margens fixas (`marginLeft: 140` em `Board.tsx`/`GameScreen.tsx`) se apertar em telas menores, `ios/` não é mantido (sem Mac).
- Não há mudanças não commitadas.

# Onde Está Luiza?

Joguinho em React Native que fiz pra minha filha: acompanhe os três copos e encontre onde a Luiza está escondida.

Android, landscape. React Native 0.87 (Hermes, New Architecture), TypeScript.

## Como jogar

1. A Luiza aparece por 1.200 ms. Memorize o copo em que ela está.
2. O copo cobre a Luiza e os três copos trocam de posição. Acompanhe o movimento.
3. Quando todos pararem, toque em um copo para escolher.
4. Depois da revelação, toque em **Próxima rodada** para continuar.

Cada acerto vale um ponto. A cada dois acertos acumulados, você ganha uma vida; um erro entre eles
não apaga o progresso. Por exemplo: acerto, erro, acerto ainda rende uma vida extra.
O jogo começa com três vidas e cada erro custa uma. Ao chegar a zero, a Luiza é revelada antes do fim de jogo.

As vidas podem continuar aumentando. A tela mostra até cinco corações e indica as vidas restantes com
um número adicional, como `+3` para um total de oito vidas.

A dificuldade de cada rodada depende da pontuação ao começá-la:

| Pontuação | Trocas de posição | Duração de cada troca |
| --------- | ----------------- | --------------------- |
| 0–2       | 3                 | 650 ms                |
| 3–5       | 4                 | 560 ms                |
| 6–8       | 5                 | 470 ms                |
| 9 ou mais | 6                 | 380 ms                |

O recorde e o Hall da Fama existentes são preservados. As pontuações históricas foram obtidas com
as regras anteriores e não são diretamente comparáveis às partidas com os copos em movimento.
Ao retomar uma partida interrompida antes da escolha, uma nova prévia começa, preservando pontos,
vidas e progresso para a próxima vida extra.

## Rodar

Requisitos: Node 22.11 ou superior (Node 22 recomendado), JDK 17+, Android SDK com
`platforms;android-37.0`, `build-tools;37.0.0`, `ndk;27.1.12297006`, `cmake;3.22.1`.

Neste ambiente, o Node 22 está em `/opt/node-v22.21.1/bin`:

```sh
export PATH=/opt/node-v22.21.1/bin:$PATH
npm install
npm start
```

Em outro terminal, a partir da raiz do projeto, compile e instale no aparelho autorizado:

```sh
android/gradlew -p android assembleDebug
adb -s s25:5555 get-state
adb -s s25:5555 reverse tcp:8081 tcp:8081
adb -s s25:5555 install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s s25:5555 shell am start -n com.whereisluiza/.MainActivity
```

A validação no aparelho deve usar somente `adb -s s25:5555`. Se esse dispositivo estiver indisponível,
interrompa a validação. Não inicie nem use emuladores sem consentimento explícito.

## Testes e lint

```sh
npm test -- --runInBand
npm run lint
npx tsc --noEmit
```

Os testes automatizados cobrem regras, componentes, interrupções, migração e salvamento da partida.
Em 07/09/2026, a release foi validada no S25 com prévia, fechamento, trocas, revelação, troféu,
vida extra, próxima rodada e acesso ao X. Os resultados e limites da verificação física estão no
[SESSION de jogabilidade](docs/SESSION-2026-09-07-jogabilidade.md).

## Release

O keystore fica em `android/app/whereisluiza.keystore` (ignorado pelo git) e as credenciais em
`~/.gradle/gradle.properties`:

```properties
WHEREISLUIZA_STORE_FILE=whereisluiza.keystore
WHEREISLUIZA_KEY_ALIAS=whereisluiza
WHEREISLUIZA_STORE_PASSWORD=...
WHEREISLUIZA_KEY_PASSWORD=...
```

A partir da raiz do projeto:

```sh
android/gradlew -p android assembleRelease
adb -s s25:5555 install -r android/app/build/outputs/apk/release/app-release.apk
```

## Estrutura

    src/game/logic.ts      regras e fases do jogo, puras e testadas
    src/game/shuffle.ts    trocas de posição e dificuldade por pontuação
    src/storage/          settings, jogo em andamento e hall da fama (AsyncStorage)
    src/audio/useAudio.ts  música e efeitos (react-native-sound; arquivos em android/app/src/main/res/raw)
    src/components/       peças visuais e animação do tabuleiro
    src/overlays/         fim de jogo, hall da fama, sair
    src/screens/GameScreen.tsx
    assets/               imagens e animações Lottie
    android/app/src/main/assets/fonts   fontes do jogo

# Onde Está Luiza?

Joguinho em React Native que fiz pra minha filha: adivinhe em qual dos três copos a Luiza está escondida.
Acertou, ganha troféu; dois acertos seguidos, ganha vida; três vidas perdidas, fim de jogo e Hall da Fama.

Android, landscape. React Native 0.87 (Hermes, New Architecture), TypeScript.

## Rodar

Requisitos: Node 22+, JDK 17+, Android SDK com `platforms;android-37.0`, `build-tools;37.0.0`,
`ndk;27.1.12297006`, `cmake;3.22.1`.

    npm install
    npm run android

## Testes e lint

    npm test
    npm run lint
    npx tsc --noEmit

## Release

O keystore fica em `android/app/whereisluiza.keystore` (ignorado pelo git) e as credenciais em
`~/.gradle/gradle.properties`:

    WHEREISLUIZA_STORE_FILE=whereisluiza.keystore
    WHEREISLUIZA_KEY_ALIAS=whereisluiza
    WHEREISLUIZA_STORE_PASSWORD=...
    WHEREISLUIZA_KEY_PASSWORD=...

    cd android && ./gradlew assembleRelease
    adb install -r android/app/build/outputs/apk/release/app-release.apk

## Estrutura

    src/game/logic.ts      regra do jogo, pura e testada
    src/storage/           settings, jogo em andamento e hall da fama (AsyncStorage)
    src/audio/useAudio.ts  música e efeitos (react-native-sound; arquivos em android/app/src/main/res/raw)
    src/components/        peças visuais
    src/overlays/          fim de jogo, hall da fama, sair
    src/screens/GameScreen.tsx
    assets/                imagens e animações Lottie
    android/app/src/main/assets/fonts   fontes do jogo

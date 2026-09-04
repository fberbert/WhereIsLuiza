# Modernização WhereIsLuiza → React Native 0.87 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o jogo voltar a abrir no Android 16 (S25) e deixar o código sustentável, preservando o comportamento atual do jogo.

**Architecture:** Projeto bare gerado pelo template RN 0.87 (TypeScript, Hermes, New Architecture), com `src/` reescrito em function components. A regra do jogo vira um módulo puro (`src/game/logic.ts`) testado com Jest; persistência (`src/storage/`) e áudio (`src/audio/`) ficam isolados atrás de funções/hook. O Hall da Fama passa a ser local (top 10 em AsyncStorage); o backend antigo (404) é removido.

**Tech Stack:** React Native 0.87.1, React 19.2, TypeScript, Jest 29, `@react-native-async-storage/async-storage` 3, `lottie-react-native` 7, `react-native-sound` 0.13, `@react-native-vector-icons/{fontisto,fontawesome5}` 13, `react-native-safe-area-context` 5.

---

## Contexto (por que isto existe)

Crash capturado no S25 (Android 16) via `adb logcat`:

```
FATAL EXCEPTION: create_react_context
java.lang.UnsatisfiedLinkError: couldn't find DSO to load: libhermes.so
```

SoLoader 0.8 (RN 0.62) não procura em `/system/lib64`; o S25 é arm64-only → `libjscexecutor.so` falha ao resolver `libc.so` → RN cai no Hermes, que não está no APK (`enableHermes: false`). Só resolve subindo o RN.

Fatos adicionais verificados:
- Endpoints do Hall da Fama (`vivaolinux.com.br/publico/WhereIsLuiza`, `187.84.229.156:8040`) → 404.
- Senha do keystore commitada em `android/app/build.gradle:149` (repo público). Decisão: gerar keystore novo, senha fora do git.
- Máquina local: Node 25.9 (não suportado; usar `/opt/node-v22.21.1`), JDK 21, **sem Android SDK** instalado, `adb` de `/usr/lib/android-sdk/platform-tools`.

## Regras do jogo a preservar (extraídas de `src/Game.js`)

1. 3 copos, Luiza sob um deles (sorteio uniforme). Estado: `score`, `lives` (inicial 3), `streak`.
2. Toque com copos fechados:
   - Acertou: `score+1`, `streak+1`. Se `streak === 2`: `streak = 0`, `lives+1`, toca som "vida" **depois** do som de acerto. Copo certo mostra `luizaHead`; os outros continuam com imagem de copo fechado.
   - Errou: `lives-1`. Copo certo mostra `luizaHead`; os outros mostram `cup-wrong`. Se `lives === 0`: game over, toca "game-over", atualiza `highScore` se `score > highScore`.
   - `streak` **não** zera ao errar (comportamento original; manter).
3. Toque com copos abertos → nova rodada (re-sorteia, fecha copos, mantém score/lives/streak).
4. Game over → modal com campo de nome e botão salvar; salvar grava no Hall da Fama e inicia jogo novo (score 0, lives 3, streak 0).
5. Botões: mudo (efeitos), música, fechar (modal "Sair do jogo?" Sim/Não). Aranha toca som ao tocar; detetive faz "spring" + som boing ao tocar.
6. Persistência: música/efeitos ligados, recorde, nome do jogador, e o jogo em andamento (fechar o app e abrir de novo continua de onde parou).
7. Música de fundo em loop, volume 0.2. Orientação travada em landscape (sensor).

Mudanças deliberadas (aprovadas): Hall da Fama local; status bar oculta; animações de título/copos via `transform` com native driver (mesmo efeito visual).

## Estrutura de arquivos final

```
WhereIsLuiza/
├── android/                      # gerado pelo template 0.87 (Kotlin) + ajustes
├── ios/                          # gerado pelo template; não mantido (sem Mac)
├── assets/                       # images/, sounds/, lottie/, fonts/ — inalterados
├── App.tsx                       # SafeAreaProvider + GameScreen
├── index.js                      # template
├── src/
│   ├── assets.ts                 # require() central de imagens/lottie/sons
│   ├── theme.ts                  # fontes e cores
│   ├── game/
│   │   ├── logic.ts              # regra pura: newGame, tap, cupFace
│   │   └── logic.test.ts
│   ├── storage/
│   │   ├── persist.ts            # loadJson/saveJson sobre AsyncStorage
│   │   ├── settings.ts           # Settings + defaults + load/save
│   │   ├── game.ts               # GameState em andamento load/save/clear
│   │   ├── leaderboard.ts        # insertEntry (puro) + load/save
│   │   └── leaderboard.test.ts
│   ├── audio/
│   │   └── useAudio.ts           # hook: música + efeitos, respeita settings
│   ├── components/
│   │   ├── AnimatedTitle.tsx
│   │   ├── Board.tsx             # 3 copos animados
│   │   ├── LivesRow.tsx
│   │   ├── TrophiesRow.tsx
│   │   ├── Detective.tsx
│   │   ├── Spider.tsx
│   │   └── TopBar.tsx            # mudo / música / fechar
│   ├── modals/
│   │   ├── GameOverModal.tsx
│   │   ├── HallOfFameModal.tsx
│   │   └── CloseAppModal.tsx
│   └── screens/
│       └── GameScreen.tsx        # estado, persistência, composição
└── docs/superpowers/plans/…
```

Removidos: `src/*.js` antigos, `android/` e `ios/` antigos, `.buckconfig`, `.flowconfig`, `.eslintrc.js`, `metro.config.js` antigo, `babel.config.js` antigo, `react-native.config.js`, `__tests__/App-test.js`, `url-search-params`, `react-native-orientation-locker`.

---

## Task 0: Ambiente (Node 22 + Android SDK)

**Files:** nenhum no repo.

- [ ] **Step 1: Node 22 no PATH da sessão**

```bash
export PATH=/opt/node-v22.21.1/bin:$PATH
node -v
```
Expected: `v22.21.1`. (Opcional: adicionar a linha `export PATH=...` no `~/.bashrc`.)

- [ ] **Step 2: Instalar cmdline-tools do Android**

```bash
mkdir -p ~/Android/Sdk/cmdline-tools && cd /tmp
curl -LO https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q commandlinetools-linux-11076708_latest.zip -d ~/Android/Sdk/cmdline-tools
mv ~/Android/Sdk/cmdline-tools/cmdline-tools ~/Android/Sdk/cmdline-tools/latest
```
Se o arquivo não existir mais, pegar o nome atual em https://developer.android.com/studio#command-line-tools-only.

- [ ] **Step 3: Instalar componentes exigidos pelo template 0.87**

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;android-37" "build-tools;37.0.0" "ndk;27.1.12297006" "cmake;3.22.1"
sdkmanager --list_installed
```
Expected: as 5 entradas listadas. `java -version` deve mostrar 21 (já instalado; Gradle 9/AGP 8 aceitam).

- [ ] **Step 4: Confirmar o celular**

```bash
adb devices
```
Expected: `s25:5555  device`.

---

## Task 1: Branch e snapshot do projeto antigo

**Files:** git.

- [ ] **Step 1: Branch**

```bash
cd ~/projetos/WhereIsLuiza
git checkout -b modernizacao
```

- [ ] **Step 2: Guardar referência do android antigo (ícones, strings)**

```bash
mkdir -p /tmp/wil-old && cp -r android/app/src/main/res /tmp/wil-old/res
```

- [ ] **Step 3: Remover tudo que o template vai substituir**

```bash
git rm -r -q android ios __tests__ .buckconfig .flowconfig .eslintrc.js .prettierrc.js .watchmanconfig \
  babel.config.js metro.config.js react-native.config.js index.js app.json package.json package-lock.json .gitattributes
rm -rf node_modules
git commit -q -m "chore: remove projeto RN 0.62"
```

Ficam: `assets/`, `src/` (antigo, será apagado na Task 12), `LICENSE`, `README.md`, `.gitignore`, `docs/`.

---

## Task 2: Gerar template RN 0.87 e trazer para o repo

**Files:**
- Create: tudo que o template gera (`android/`, `ios/`, `App.tsx`, `index.js`, `app.json`, `package.json`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `tsconfig.json`, `.eslintrc.js`, `.prettierrc.js`, `.watchmanconfig`, `Gemfile`, `.gitignore`)

- [ ] **Step 1: Gerar em /tmp**

```bash
cd /tmp && rm -rf WhereIsLuiza
npx @react-native-community/cli@latest init WhereIsLuiza --version 0.87.1 --skip-install --skip-git-init --pm npm
```
Expected: pasta `/tmp/WhereIsLuiza` com `android/app/build.gradle` contendo `applicationId "com.whereisluiza"` e `namespace "com.whereisluiza"`.

- [ ] **Step 2: Copiar para o repo (sem sobrescrever assets/LICENSE/README/docs)**

```bash
cd ~/projetos/WhereIsLuiza
rsync -a --exclude README.md --exclude .gitignore /tmp/WhereIsLuiza/ ./
cat /tmp/WhereIsLuiza/.gitignore >> .gitignore
```

- [ ] **Step 3: Remover teste de template (renderiza App com deps nativas; será substituído por testes puros)**

```bash
rm -rf __tests__
```

- [ ] **Step 4: Instalar e verificar TS**

```bash
npm install
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "chore: template React Native 0.87.1"
```

---

## Task 3: Configuração Android (id, versão, orientação, ícones, keystore)

**Files:**
- Modify: `android/app/build.gradle`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `android/app/src/main/res/values/strings.xml`
- Replace: `android/app/src/main/res/mipmap-*/`
- Create: `android/app/whereisluiza.keystore` (gitignored), `~/.gradle/gradle.properties`

- [ ] **Step 1: Gerar keystore novo (senha fora do git)**

```bash
cd ~/projetos/WhereIsLuiza/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore whereisluiza.keystore \
  -alias whereisluiza -keyalg RSA -keysize 2048 -validity 10000
```
Anotar a senha. Confirmar que `.gitignore` já ignora `*.keystore` (o antigo ignorava `android/app/whereisluiza.keystore`; o do template ignora `*.keystore`):

```bash
cd ~/projetos/WhereIsLuiza && git check-ignore android/app/whereisluiza.keystore
```
Expected: imprime o caminho (ignorado).

- [ ] **Step 2: Credenciais em `~/.gradle/gradle.properties`**

```properties
WHEREISLUIZA_STORE_FILE=whereisluiza.keystore
WHEREISLUIZA_KEY_ALIAS=whereisluiza
WHEREISLUIZA_STORE_PASSWORD=<senha>
WHEREISLUIZA_KEY_PASSWORD=<senha>
```

- [ ] **Step 3: `android/app/build.gradle` — versão e signing**

No bloco `defaultConfig`, trocar `versionCode 1` / `versionName "1.0"` por:

```groovy
        versionCode 4
        versionName "2.0"
```

Substituir o bloco `signingConfigs { debug { … } }` por:

```groovy
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('WHEREISLUIZA_STORE_FILE')) {
                storeFile file(WHEREISLUIZA_STORE_FILE)
                storePassword WHEREISLUIZA_STORE_PASSWORD
                keyAlias WHEREISLUIZA_KEY_ALIAS
                keyPassword WHEREISLUIZA_KEY_PASSWORD
            }
        }
    }
```

Em `buildTypes.release`, trocar `signingConfig signingConfigs.debug` por `signingConfig signingConfigs.release`.

- [ ] **Step 4: Manifest — landscape**

Em `android/app/src/main/AndroidManifest.xml`, na `<activity android:name=".MainActivity"`, adicionar:

```xml
        android:screenOrientation="sensorLandscape"
```

- [ ] **Step 5: Nome e ícones**

`android/app/src/main/res/values/strings.xml`:
```xml
<resources>
    <string name="app_name">Onde Está Luiza?</string>
</resources>
```

```bash
cp -r /tmp/wil-old/res/mipmap-* android/app/src/main/res/
```

- [ ] **Step 6: Fontes do jogo**

```bash
mkdir -p android/app/src/main/assets/fonts
cp assets/fonts/BowlbyOneSC-Regular.ttf assets/fonts/FredokaOne-Regular.ttf android/app/src/main/assets/fonts/
```

- [ ] **Step 7: Build do template no celular (gate: prova que o crash sumiu)**

```bash
export PATH=/opt/node-v22.21.1/bin:$PATH ANDROID_HOME=$HOME/Android/Sdk
adb -s s25:5555 uninstall com.whereisluiza
npm run android -- --deviceId s25:5555
```
Expected: app abre no S25 em landscape mostrando a tela padrão do template, sem fechar. (Primeiro build baixa Gradle 9 e compila C++; pode levar >10 min.)

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -q -m "chore(android): id, versão 2.0, landscape, ícones, signing via gradle.properties"
```

---

## Task 4: Dependências e assets

**Files:**
- Modify: `package.json`
- Create: `src/assets.ts`, `src/theme.ts`

- [ ] **Step 1: Instalar**

```bash
npm install @react-native-async-storage/async-storage lottie-react-native react-native-sound \
  @react-native-vector-icons/fontisto @react-native-vector-icons/fontawesome5
```

- [ ] **Step 2: `src/assets.ts`**

```ts
export const images = {
  cup: require('../assets/images/cup-resized.png'),
  cupWrong: require('../assets/images/cup-wrong-resized.png'),
  luizaHead: require('../assets/images/luizaHead-draw.png'),
  detective: require('../assets/images/detective-original.png'),
  wallpaper: require('../assets/images/forest-background.jpg'),
  wallpaperHallOfFame: require('../assets/images/forest-background2.jpg'),
} as const

export const lottie = {
  trophy: require('../assets/lottie/trophy.json'),
  spider: require('../assets/lottie/spider.json'),
  heart: require('../assets/lottie/heart.json'),
} as const

export const sounds = {
  music: require('../assets/sounds/forest.mp3'),
  hit: require('../assets/sounds/got-it.mp3'),
  miss: require('../assets/sounds/errou.mp3'),
  extraLife: require('../assets/sounds/vida.mp3'),
  gameOver: require('../assets/sounds/game-over.mp3'),
  boing: require('../assets/sounds/boing.wav'),
  spider: require('../assets/sounds/spider.mp3'),
} as const
```

- [ ] **Step 3: `src/theme.ts`**

```ts
export const fonts = {
  body: 'FredokaOne-Regular',
  title: 'BowlbyOneSC-Regular',
} as const

export const colors = {
  white: '#fff',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayStrong: 'rgba(0, 0, 0, 0.8)',
  placeholder: '#c0c0c0',
  gold: '#FFCE42',
} as const

export const textShadow = {
  textShadowColor: '#000',
  textShadowRadius: 20,
  textShadowOffset: { width: 2, height: 2 },
} as const
```

- [ ] **Step 4: Verificar e commitar**

```bash
npx tsc --noEmit && git add -A && git commit -q -m "chore: dependências e índice de assets"
```

---

## Task 5: Lógica pura do jogo (TDD)

**Files:**
- Create: `src/game/logic.ts`
- Test: `src/game/logic.test.ts`

- [ ] **Step 1: Teste**

```ts
import { CUP_COUNT, INITIAL_LIVES, cupFace, newGame, nextRound, tap } from './logic'

const rngFor = (cup: number) => () => cup / CUP_COUNT

describe('newGame', () => {
  it('starts with 3 lives, zero score, closed cups', () => {
    const g = newGame(rngFor(1))
    expect(g).toEqual({
      score: 0, lives: INITIAL_LIVES, streak: 0,
      luizaAt: 1, phase: 'closed', lastGuess: null, gameOver: false,
    })
  })
})

describe('tap on closed cups', () => {
  it('hit: +1 score, +1 streak, reveals', () => {
    const { state, events } = tap(newGame(rngFor(2)), 2)
    expect(state).toMatchObject({ score: 1, streak: 1, lives: 3, phase: 'revealed', lastGuess: 2 })
    expect(events).toEqual(['hit'])
  })

  it('second consecutive hit grants a life and resets streak', () => {
    const first = tap(newGame(rngFor(0)), 0).state
    const { state, events } = tap(nextRound(first, rngFor(1)), 1)
    expect(state).toMatchObject({ score: 2, streak: 0, lives: 4 })
    expect(events).toEqual(['hit', 'extraLife'])
  })

  it('miss: -1 life, streak untouched', () => {
    const g = { ...newGame(rngFor(0)), streak: 1 }
    const { state, events } = tap(g, 2)
    expect(state).toMatchObject({ lives: 2, streak: 1, score: 0, phase: 'revealed', lastGuess: 2 })
    expect(events).toEqual(['miss'])
  })

  it('miss on last life ends the game', () => {
    const g = { ...newGame(rngFor(0)), lives: 1 }
    const { state, events } = tap(g, 1)
    expect(state.gameOver).toBe(true)
    expect(state.lives).toBe(0)
    expect(events).toEqual(['miss', 'gameOver'])
  })
})

describe('tap on revealed cups', () => {
  it('starts a new round keeping score/lives/streak', () => {
    const revealed = tap(newGame(rngFor(0)), 0).state
    const { state, events } = tap(revealed, 1, rngFor(2))
    expect(state).toMatchObject({ score: 1, streak: 1, lives: 3, luizaAt: 2, phase: 'closed', lastGuess: null })
    expect(events).toEqual([])
  })
})

describe('tap after game over', () => {
  it('is ignored', () => {
    const g = { ...newGame(rngFor(0)), lives: 0, gameOver: true, phase: 'revealed' as const }
    expect(tap(g, 0)).toEqual({ state: g, events: [] })
  })
})

describe('cupFace', () => {
  it('all closed before a guess', () => {
    const g = newGame(rngFor(1))
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['closed', 'closed', 'closed'])
  })
  it('hit: luiza on the right cup, others stay closed', () => {
    const g = tap(newGame(rngFor(1)), 1).state
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['closed', 'luiza', 'closed'])
  })
  it('miss: luiza on the right cup, others wrong', () => {
    const g = tap(newGame(rngFor(1)), 0).state
    expect([0, 1, 2].map(i => cupFace(g, i as 0 | 1 | 2))).toEqual(['wrong', 'luiza', 'wrong'])
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx jest src/game
```
Expected: FAIL, `Cannot find module './logic'`.

- [ ] **Step 3: Implementar `src/game/logic.ts`**

```ts
export const CUP_COUNT = 3
export const INITIAL_LIVES = 3
export const STREAK_FOR_LIFE = 2

export type CupIndex = 0 | 1 | 2
export type CupFace = 'closed' | 'luiza' | 'wrong'
export type GameEvent = 'hit' | 'miss' | 'extraLife' | 'gameOver'
export type Rng = () => number

export interface GameState {
  score: number
  lives: number
  streak: number
  luizaAt: CupIndex
  phase: 'closed' | 'revealed'
  lastGuess: CupIndex | null
  gameOver: boolean
}

function randomCup(rng: Rng): CupIndex {
  return Math.floor(rng() * CUP_COUNT) as CupIndex
}

export function newGame(rng: Rng = Math.random): GameState {
  return {
    score: 0,
    lives: INITIAL_LIVES,
    streak: 0,
    luizaAt: randomCup(rng),
    phase: 'closed',
    lastGuess: null,
    gameOver: false,
  }
}

export function nextRound(state: GameState, rng: Rng = Math.random): GameState {
  return { ...state, luizaAt: randomCup(rng), phase: 'closed', lastGuess: null }
}

export function tap(
  state: GameState,
  cup: CupIndex,
  rng: Rng = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.gameOver) return { state, events: [] }
  if (state.phase === 'revealed') return { state: nextRound(state, rng), events: [] }

  if (cup === state.luizaAt) {
    let { streak, lives } = state
    const events: GameEvent[] = ['hit']
    streak += 1
    if (streak === STREAK_FOR_LIFE) {
      streak = 0
      lives += 1
      events.push('extraLife')
    }
    return {
      state: { ...state, score: state.score + 1, streak, lives, phase: 'revealed', lastGuess: cup },
      events,
    }
  }

  const lives = state.lives - 1
  const gameOver = lives === 0
  return {
    state: { ...state, lives, phase: 'revealed', lastGuess: cup, gameOver },
    events: gameOver ? ['miss', 'gameOver'] : ['miss'],
  }
}

export function cupFace(state: GameState, cup: CupIndex): CupFace {
  if (state.phase === 'closed') return 'closed'
  if (cup === state.luizaAt) return 'luiza'
  return state.lastGuess === state.luizaAt ? 'closed' : 'wrong'
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx jest src/game
```
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/game && git commit -q -m "feat(game): lógica pura do jogo com testes"
```

---

## Task 6: Persistência (settings, jogo em andamento, leaderboard)

**Files:**
- Create: `src/storage/persist.ts`, `src/storage/settings.ts`, `src/storage/game.ts`, `src/storage/leaderboard.ts`
- Test: `src/storage/leaderboard.test.ts`

- [ ] **Step 1: Teste do leaderboard (parte pura)**

```ts
import { MAX_ENTRIES, insertEntry, type LeaderboardEntry } from './leaderboard'

const e = (name: string, score: number, at: number): LeaderboardEntry => ({ name, score, at })

describe('insertEntry', () => {
  it('orders by score desc, then older first', () => {
    const list = insertEntry([e('a', 5, 1), e('b', 7, 2)], e('c', 5, 3))
    expect(list.map(x => x.name)).toEqual(['b', 'a', 'c'])
  })

  it('keeps at most MAX_ENTRIES', () => {
    const full = Array.from({ length: MAX_ENTRIES }, (_, i) => e(`p${i}`, 100 - i, i))
    const list = insertEntry(full, e('low', 1, 99))
    expect(list).toHaveLength(MAX_ENTRIES)
    expect(list.find(x => x.name === 'low')).toBeUndefined()
  })

  it('does not mutate the input', () => {
    const input = [e('a', 1, 1)]
    insertEntry(input, e('b', 2, 2))
    expect(input).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx jest src/storage
```
Expected: FAIL, módulo não encontrado.

- [ ] **Step 3: `src/storage/persist.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveJson(key: string, value: unknown): Promise<void> {
  return AsyncStorage.setItem(key, JSON.stringify(value))
}

export function remove(key: string): Promise<void> {
  return AsyncStorage.removeItem(key)
}
```

- [ ] **Step 4: `src/storage/settings.ts`**

```ts
import { loadJson, saveJson } from './persist'

const KEY = 'luiza.settings'

export interface Settings {
  musicOn: boolean
  effectsOn: boolean
  highScore: number
  playerName: string
}

export const DEFAULT_SETTINGS: Settings = {
  musicOn: true,
  effectsOn: true,
  highScore: 0,
  playerName: '',
}

export async function loadSettings(): Promise<Settings> {
  const saved = await loadJson<Partial<Settings>>(KEY)
  return { ...DEFAULT_SETTINGS, ...saved }
}

export function saveSettings(settings: Settings): Promise<void> {
  return saveJson(KEY, settings)
}
```

- [ ] **Step 5: `src/storage/game.ts`**

```ts
import type { GameState } from '../game/logic'
import { loadJson, remove, saveJson } from './persist'

const KEY = 'luiza.game'

export function loadGame(): Promise<GameState | null> {
  return loadJson<GameState>(KEY)
}

export function saveGame(state: GameState): Promise<void> {
  return saveJson(KEY, state)
}

export function clearGame(): Promise<void> {
  return remove(KEY)
}
```

- [ ] **Step 6: `src/storage/leaderboard.ts`**

```ts
import { loadJson, saveJson } from './persist'

const KEY = 'luiza.leaderboard'
export const MAX_ENTRIES = 10

export interface LeaderboardEntry {
  name: string
  score: number
  at: number
}

export function insertEntry(list: readonly LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  return [...list, entry]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, MAX_ENTRIES)
}

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  return (await loadJson<LeaderboardEntry[]>(KEY)) ?? []
}

export async function recordScore(name: string, score: number, now = Date.now): Promise<LeaderboardEntry[]> {
  const next = insertEntry(await loadLeaderboard(), { name: name.trim() || 'Sem nome', score, at: now() })
  await saveJson(KEY, next)
  return next
}
```

- [ ] **Step 7: Rodar — deve passar**

```bash
npx jest src/storage && npx tsc --noEmit
```
Expected: 3 passed; sem erros TS. (O teste importa apenas a função pura; `AsyncStorage` é resolvido pelo módulo mas não invocado.)

- [ ] **Step 8: Commit**

```bash
git add src/storage && git commit -q -m "feat(storage): settings, jogo em andamento e hall da fama local"
```

---

## Task 7: Áudio

**Files:**
- Create: `src/audio/useAudio.ts`

- [ ] **Step 1: Implementar**

```ts
import { useEffect, useMemo, useRef } from 'react'
import Sound from 'react-native-sound'
import { sounds } from '../assets'
import type { GameEvent } from '../game/logic'

Sound.setCategory('Playback')

export type Effect = 'hit' | 'miss' | 'extraLife' | 'gameOver' | 'boing' | 'spider'

const EVENT_EFFECT: Record<GameEvent, Effect> = {
  hit: 'hit',
  miss: 'miss',
  extraLife: 'extraLife',
  gameOver: 'gameOver',
}

function load(asset: number, volume: number): Sound {
  const s = new Sound(asset, () => {})
  s.setVolume(volume)
  return s
}

interface Options {
  musicOn: boolean
  effectsOn: boolean
}

export function useAudio({ musicOn, effectsOn }: Options) {
  const music = useRef<Sound | null>(null)
  const effects = useRef<Record<Effect, Sound> | null>(null)

  useEffect(() => {
    const m = load(sounds.music, 0.2)
    m.setNumberOfLoops(-1)
    music.current = m
    effects.current = {
      hit: load(sounds.hit, 1),
      miss: load(sounds.miss, 1),
      extraLife: load(sounds.extraLife, 1),
      gameOver: load(sounds.gameOver, 1),
      boing: load(sounds.boing, 1),
      spider: load(sounds.spider, 1),
    }
    return () => {
      m.stop()
      m.release()
      Object.values(effects.current ?? {}).forEach(s => s.release())
      music.current = null
      effects.current = null
    }
  }, [])

  useEffect(() => {
    const m = music.current
    if (!m) return
    if (musicOn) m.play()
    else m.pause()
  }, [musicOn])

  return useMemo(() => {
    const play = (effect: Effect, onEnd?: () => void) => {
      if (!effectsOn) return
      effects.current?.[effect].play(onEnd)
    }
    const playEvents = (events: GameEvent[]) => {
      const [first, ...rest] = events.map(e => EVENT_EFFECT[e])
      if (!first) return
      // 'extraLife' toca depois de 'hit' terminar (comportamento original)
      play(first, () => rest.forEach(e => play(e)))
    }
    return { play, playEvents }
  }, [effectsOn])
}
```

Invariantes: sons carregados uma vez por montagem; `musicOn` faz pause/play sem recriar o objeto; `miss`+`gameOver` tocam encadeados (original tocava os dois ao mesmo tempo — diferença imperceptível, `errou.mp3` é curto).

- [ ] **Step 2: Verificar e commitar**

```bash
npx tsc --noEmit && git add src/audio && git commit -q -m "feat(audio): hook de música e efeitos"
```

---

## Task 8: Componentes visuais

**Files:**
- Create: `src/components/AnimatedTitle.tsx`, `Board.tsx`, `LivesRow.tsx`, `TrophiesRow.tsx`, `Detective.tsx`, `Spider.tsx`, `TopBar.tsx`

- [ ] **Step 1: `src/components/AnimatedTitle.tsx`**

```tsx
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { colors, fonts, textShadow } from '../theme'

export function useSway(): Animated.Value {
  const value = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true }),
    )
    loop.start()
    return () => loop.stop()
  }, [value])
  return value
}

export function AnimatedTitle({ children }: { children: string }) {
  const sway = useSway()
  const translateX = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, 0] })
  return <Animated.Text style={[styles.title, { transform: [{ translateX }] }]}>{children}</Animated.Text>
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: 40, fontFamily: fonts.title, ...textShadow },
})
```

- [ ] **Step 2: `src/components/Board.tsx`**

```tsx
import React from 'react'
import { Animated, Pressable, StyleSheet, View } from 'react-native'
import { images } from '../assets'
import { cupFace, type CupFace, type CupIndex, type GameState } from '../game/logic'
import { useSway } from './AnimatedTitle'

const FACE_IMAGE: Record<CupFace, number> = {
  closed: images.cup,
  luiza: images.luizaHead,
  wrong: images.cupWrong,
}

const CUPS: CupIndex[] = [0, 1, 2]

interface Props {
  game: GameState
  onTap: (cup: CupIndex) => void
}

export function Board({ game, onTap }: Props) {
  const sway = useSway()
  const translateY = sway.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -30, 0] })
  return (
    <View style={styles.board}>
      {CUPS.map(cup => (
        <View key={cup} style={styles.slot}>
          <Pressable onPress={() => onTap(cup)}>
            <Animated.Image source={FACE_IMAGE[cupFace(game, cup)]} style={[styles.cup, { transform: [{ translateY }] }]} />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  board: { flex: 6, flexDirection: 'row', marginLeft: 140, marginRight: 100 },
  slot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cup: { width: 117, height: 120 },
})
```

- [ ] **Step 3: `src/components/LivesRow.tsx` e `TrophiesRow.tsx`**

```tsx
// src/components/LivesRow.tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function LivesRow({ count }: { count: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <LottieView key={i} source={lottie.heart} autoPlay loop style={styles.icon} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  icon: { width: 30, height: 30, marginRight: 4 },
})
```

```tsx
// src/components/TrophiesRow.tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function TrophiesRow({ count }: { count: number }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <LottieView key={i} source={lottie.trophy} autoPlay loop style={styles.icon} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  icon: { width: 30, height: 30, marginRight: 4 },
})
```

- [ ] **Step 4: `src/components/Detective.tsx` e `Spider.tsx`**

```tsx
// src/components/Detective.tsx
import React, { useRef } from 'react'
import { Animated, Pressable, StyleSheet } from 'react-native'
import { images } from '../assets'

export function Detective({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current
  const bounce = () => {
    scale.setValue(0.8)
    Animated.spring(scale, { toValue: 1, friction: 1, useNativeDriver: true }).start()
    onPress()
  }
  return (
    <Pressable onPress={bounce} style={styles.wrap}>
      <Animated.Image source={images.detective} style={[styles.image, { transform: [{ scale }] }]} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 20, left: 10 },
  image: { width: 110, height: 140 },
})
```

```tsx
// src/components/Spider.tsx
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'
import LottieView from 'lottie-react-native'
import { lottie } from '../assets'

export function Spider({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <LottieView source={lottie.spider} autoPlay loop style={styles.anim} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 20 },
  anim: { width: 120, height: 120 },
})
```

- [ ] **Step 5: `src/components/TopBar.tsx`**

```tsx
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Fontisto from '@react-native-vector-icons/fontisto/static'
import { colors } from '../theme'

interface Props {
  effectsOn: boolean
  musicOn: boolean
  onToggleEffects: () => void
  onToggleMusic: () => void
  onClose: () => void
}

export function TopBar({ effectsOn, musicOn, onToggleEffects, onToggleMusic, onClose }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable onPress={onToggleEffects} style={[styles.button, !effectsOn && styles.off]}>
        <Fontisto name="volume-mute" size={25} color={colors.white} />
      </Pressable>
      <Pressable onPress={onToggleMusic} style={[styles.button, !musicOn && styles.off]}>
        <Fontisto name="music-note" size={25} color={colors.white} />
      </Pressable>
      <Pressable onPress={onClose} style={styles.button}>
        <Fontisto name="close-a" size={25} color={colors.white} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', padding: 5 },
  button: { margin: 10 },
  off: { opacity: 0.5 },
})
```

- [ ] **Step 6: Verificar e commitar**

```bash
npx tsc --noEmit && git add src/components && git commit -q -m "feat(ui): componentes do tabuleiro"
```

---

## Task 9: Modais

**Files:**
- Create: `src/modals/CloseAppModal.tsx`, `GameOverModal.tsx`, `HallOfFameModal.tsx`

- [ ] **Step 1: `src/modals/CloseAppModal.tsx`**

```tsx
import React from 'react'
import { BackHandler, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  onCancel: () => void
}

export function CloseAppModal({ visible, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Text style={styles.question}>Sair do jogo?</Text>
        <View style={styles.answers}>
          <Pressable onPress={() => BackHandler.exitApp()}>
            <Text style={styles.answer}>Sim</Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text style={styles.answer}>Não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, justifyContent: 'center', alignItems: 'center' },
  question: { color: colors.white, fontFamily: fonts.body, fontSize: 60 },
  answers: { flexDirection: 'row' },
  answer: { color: colors.white, fontFamily: fonts.body, fontSize: 30, margin: 30 },
})
```

- [ ] **Step 2: `src/modals/GameOverModal.tsx`**

```tsx
import React from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import LottieView from 'lottie-react-native'
import Fontisto from '@react-native-vector-icons/fontisto/static'
import { lottie } from '../assets'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  score: number
  playerName: string
  onChangeName: (name: string) => void
  onSave: () => void
}

export function GameOverModal({ visible, score, playerName, onChangeName, onSave }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <Text style={styles.title}>Fim de Jogo</Text>
        <View style={styles.scoreRow}>
          <LottieView source={lottie.trophy} autoPlay loop style={styles.trophy} />
          <Text style={styles.title}> = {score}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            placeholder="Digite seu nome"
            value={playerName}
            onChangeText={onChangeName}
            autoComplete="name"
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.placeholder}
            style={styles.input}
          />
          <Pressable onPress={onSave}>
            <Fontisto name="save" size={40} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlayStrong, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: 45, fontFamily: fonts.body, textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  trophy: { width: 45, height: 45 },
  form: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: {
    borderColor: colors.placeholder, borderWidth: 0.5, width: 250, color: colors.placeholder,
    paddingLeft: 20, fontSize: 20, fontFamily: fonts.body, marginRight: 10,
  },
})
```

- [ ] **Step 3: `src/modals/HallOfFameModal.tsx`**

```tsx
import React from 'react'
import { FlatList, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import FontAwesome5 from '@react-native-vector-icons/fontawesome5/static'
import { images } from '../assets'
import { AnimatedTitle } from '../components/AnimatedTitle'
import type { LeaderboardEntry } from '../storage/leaderboard'
import { colors, fonts } from '../theme'

interface Props {
  visible: boolean
  entries: LeaderboardEntry[]
  onClose: () => void
}

function Row({ rank, entry }: { rank: number; entry: LeaderboardEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rankCell}>
        <FontAwesome5 name="trophy" iconStyle="solid" size={30} color={colors.gold} />
        <Text style={styles.rankNumber}>{rank}</Text>
      </View>
      <View style={styles.nameCell}><Text style={styles.cellText}>{entry.name}</Text></View>
      <View style={styles.scoreCell}><Text style={styles.cellText}>{entry.score}</Text></View>
    </View>
  )
}

export function HallOfFameModal({ visible, entries, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ImageBackground source={images.wallpaperHallOfFame} resizeMode="stretch" style={styles.wallpaper}>
        <View style={styles.container}>
          <View style={styles.header}><AnimatedTitle>Hall da Fama</AnimatedTitle></View>
          <View style={styles.tableHeader}>
            <View style={styles.rankCell}><Text style={styles.headerText}>RANK</Text></View>
            <View style={styles.nameCell}><Text style={styles.headerText}>NOME</Text></View>
            <View style={styles.scoreCell}><Text style={styles.headerText}>PONTOS</Text></View>
          </View>
          <FlatList
            data={entries}
            keyExtractor={e => `${e.at}-${e.name}`}
            renderItem={({ item, index }) => <Row rank={index + 1} entry={item} />}
            style={styles.list}
          />
          <Pressable onPress={onClose} style={styles.close}>
            <FontAwesome5 name="home" iconStyle="solid" size={30} color={colors.white} />
          </Pressable>
        </View>
      </ImageBackground>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wallpaper: { flex: 1 },
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', padding: 20 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  tableHeader: { marginTop: 15, flexDirection: 'row', width: '80%', backgroundColor: 'rgba(0,0,0,0.6)', padding: 5 },
  headerText: { color: colors.white, fontSize: 15, fontFamily: fonts.body },
  list: { width: '80%', backgroundColor: 'rgba(0,0,0,0.3)', paddingTop: 5 },
  row: { flexDirection: 'row' },
  rankCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  rankNumber: { position: 'absolute', color: 'black', fontWeight: 'bold' },
  nameCell: { flex: 3, justifyContent: 'center' },
  scoreCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: colors.white, fontSize: 20, marginRight: 15, fontFamily: fonts.body },
  close: { position: 'absolute', right: 20, bottom: 20 },
})
```

- [ ] **Step 4: Verificar e commitar**

```bash
npx tsc --noEmit && git add src/modals && git commit -q -m "feat(ui): modais de fim de jogo, hall da fama e sair"
```

---

## Task 10: Tela do jogo e App

**Files:**
- Create: `src/screens/GameScreen.tsx`
- Modify: `App.tsx` (substituir o do template)

- [ ] **Step 1: `src/screens/GameScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react'
import { ImageBackground, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { images } from '../assets'
import { useAudio } from '../audio/useAudio'
import { AnimatedTitle } from '../components/AnimatedTitle'
import { Board } from '../components/Board'
import { Detective } from '../components/Detective'
import { LivesRow } from '../components/LivesRow'
import { Spider } from '../components/Spider'
import { TopBar } from '../components/TopBar'
import { TrophiesRow } from '../components/TrophiesRow'
import { newGame, tap, type CupIndex, type GameState } from '../game/logic'
import { CloseAppModal } from '../modals/CloseAppModal'
import { GameOverModal } from '../modals/GameOverModal'
import { HallOfFameModal } from '../modals/HallOfFameModal'
import { loadGame, saveGame } from '../storage/game'
import { loadLeaderboard, recordScore, type LeaderboardEntry } from '../storage/leaderboard'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../storage/settings'
import { colors, fonts } from '../theme'

type Overlay = 'none' | 'hallOfFame' | 'closeApp'

export function GameScreen() {
  const insets = useSafeAreaInsets()
  const [game, setGame] = useState<GameState | null>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [overlay, setOverlay] = useState<Overlay>('none')
  const audio = useAudio(settings)

  useEffect(() => {
    Promise.all([loadSettings(), loadGame(), loadLeaderboard()]).then(([s, g, lb]) => {
      setSettings(s)
      setGame(g ?? newGame())
      setLeaderboard(lb)
    })
  }, [])

  useEffect(() => {
    if (game) saveGame(game)
  }, [game])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  const patchSettings = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), [])

  const onTapCup = (cup: CupIndex) => {
    if (!game) return
    const { state, events } = tap(game, cup)
    setGame(state)
    audio.playEvents(events)
    if (state.gameOver && state.score > settings.highScore) patchSettings({ highScore: state.score })
  }

  const onSaveScore = async () => {
    if (!game) return
    setLeaderboard(await recordScore(settings.playerName, game.score))
    setGame(newGame())
  }

  if (!game) return null

  return (
    <ImageBackground source={images.wallpaper} resizeMode="stretch" style={styles.wallpaper}>
      <StatusBar hidden />
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
        <HallOfFameModal visible={overlay === 'hallOfFame'} entries={leaderboard} onClose={() => setOverlay('none')} />
        <CloseAppModal visible={overlay === 'closeApp'} onCancel={() => setOverlay('none')} />
        <GameOverModal
          visible={game.gameOver}
          score={game.score}
          playerName={settings.playerName}
          onChangeName={name => patchSettings({ playerName: name })}
          onSave={onSaveScore}
        />

        <Spider onPress={() => audio.play('spider')} />
        <Detective onPress={() => audio.play('boing')} />
        <TopBar
          effectsOn={settings.effectsOn}
          musicOn={settings.musicOn}
          onToggleEffects={() => patchSettings({ effectsOn: !settings.effectsOn })}
          onToggleMusic={() => patchSettings({ musicOn: !settings.musicOn })}
          onClose={() => setOverlay('closeApp')}
        />

        <View style={styles.header}><AnimatedTitle>Onde Está Luiza?</AnimatedTitle></View>

        <View style={styles.scoreRow}>
          <View style={[styles.scoreBox, styles.scoreLeft]}><TrophiesRow count={game.score} /></View>
          <View style={[styles.scoreBox, styles.scoreRight]}><LivesRow count={game.lives} /></View>
        </View>

        <Board game={game} onTap={onTapCup} />

        <Pressable onPress={() => setOverlay('hallOfFame')} style={styles.hallOfFame}>
          <Text style={styles.hallOfFameText}>Hall da Fama | Recorde: {settings.highScore}</Text>
        </Pressable>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  wallpaper: { flex: 1 },
  container: { flex: 1 },
  header: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10 },
  scoreRow: { flex: 1, flexDirection: 'row', marginLeft: 140, marginRight: 100, marginTop: 20 },
  scoreBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlay },
  scoreLeft: { marginRight: 20 },
  scoreRight: { marginLeft: 20 },
  hallOfFame: { position: 'absolute', right: 20, bottom: 10, padding: 10 },
  hallOfFameText: { color: colors.white, fontFamily: fonts.body, fontSize: 20 },
})
```

- [ ] **Step 2: `App.tsx`**

```tsx
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GameScreen } from './src/screens/GameScreen'

export default function App() {
  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 3: Remover dependência não usada do template**

```bash
npm uninstall @react-native/new-app-screen
```

- [ ] **Step 4: Verificar**

```bash
npx tsc --noEmit && npx jest && npx eslint src App.tsx
```
Expected: sem erros TS; 13 testes passando (10 de `logic`, 3 de `leaderboard`); lint limpo.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -q -m "feat: tela do jogo em function components com persistência local"
```

---

## Task 11: Smoke test no S25 e APK release

- [ ] **Step 1: Debug no aparelho**

```bash
export PATH=/opt/node-v22.21.1/bin:$PATH ANDROID_HOME=$HOME/Android/Sdk
npm run android -- --deviceId s25:5555
```

Checklist manual (tudo em landscape, sem status bar):
- [ ] Música de fundo toca; botão de música pausa/retoma; botão de mudo silencia efeitos.
- [ ] Tocar copo certo: som de acerto, cabeça da Luiza aparece, troféu +1. Segundo acerto seguido: som de vida depois do acerto, coração +1.
- [ ] Tocar copo errado: som de erro, copos errados aparecem, coração −1.
- [ ] Tocar de novo com copos abertos: nova rodada.
- [ ] Perder as 3 vidas: som de game over, modal "Fim de Jogo" com pontuação; digitar nome, salvar → Hall da Fama mostra o nome; jogo reinicia com 3 vidas; "Recorde:" atualizado.
- [ ] Fechar o app no meio de um jogo e reabrir: score/vidas/copos preservados.
- [ ] Aranha e detetive tocam som ao toque; detetive faz spring.
- [ ] Botão fechar → "Sair do jogo?" → Sim encerra; Não volta.
- [ ] Nada fica escondido sob o recorte da câmera (lado esquerdo em landscape).

- [ ] **Step 2: Release**

```bash
cd android && ./gradlew assembleRelease && cd ..
adb -s s25:5555 install -r android/app/build/outputs/apk/release/app-release.apk
adb -s s25:5555 shell am start -n com.whereisluiza/.MainActivity
```
Expected: app abre em release (Hermes, sem Metro). Repetir o checklist rapidamente.

- [ ] **Step 3: Verificar targetSdk e alinhamento 16 KB do APK**

```bash
$ANDROID_HOME/build-tools/37.0.0/aapt2 dump badging android/app/build/outputs/apk/release/app-release.apk | sed -n '/targetSdkVersion/p'
```
Expected: `targetSdkVersion:'36'`.

---

## Task 12: Limpeza

**Files:**
- Delete: `src/Game.js`, `src/CloseApp.js`, `src/GameOver.js`, `src/HighScores.js`, `src/Lives.js`, `src/Trophies.js`, `src/cssValues.js`, `assets/images/1px.png`, `assets/images/cup.png`, `assets/images/cup-wrong.png`, `assets/images/open-cup.png`, `assets/images/luizaHead.png`, `assets/images/pink-background.jpg`, `assets/images/castle-wallpaper.jpg`, `assets/lottie/interrogation.json`, `assets/sounds/out.mp3`, `assets/sounds/spider.wav`, `assets/sounds/music1.mp3`, `assets/sounds/acertou.mp3`
- Modify: `README.md`

- [ ] **Step 1: Apagar código e assets não referenciados**

```bash
git rm -q src/*.js assets/images/{1px.png,cup.png,cup-wrong.png,open-cup.png,luizaHead.png,pink-background.jpg,castle-wallpaper.jpg} \
  assets/lottie/interrogation.json assets/sounds/{out.mp3,spider.wav,music1.mp3,acertou.mp3}
```
Antes de rodar, confirmar que nenhum é referenciado:
```bash
grep -rn "1px.png\|cup.png\|open-cup\|luizaHead.png\|pink-background\|castle-wallpaper\|interrogation\|out.mp3\|spider.wav\|music1\|acertou" src App.tsx
```
Expected: nenhuma linha.

- [ ] **Step 2: README**

```markdown
# Onde Está Luiza?

Joguinho em React Native que fiz pra minha filha: adivinhe em qual copo a Luiza está escondida.

## Rodar

Requisitos: Node 22, JDK 17+, Android SDK (platform 37, build-tools 37.0.0, NDK 27.1.12297006).

    npm install
    npm run android

## Release

Credenciais do keystore em `~/.gradle/gradle.properties` (`WHEREISLUIZA_STORE_FILE`, `WHEREISLUIZA_KEY_ALIAS`, `WHEREISLUIZA_STORE_PASSWORD`, `WHEREISLUIZA_KEY_PASSWORD`).

    cd android && ./gradlew assembleRelease

## Testes

    npm test
```

- [ ] **Step 3: Commit final e merge**

```bash
git add -A && git commit -q -m "chore: remove código e assets do RN 0.62"
git checkout master && git merge --no-ff modernizacao -m "Modernização para React Native 0.87"
```

---

## Riscos conhecidos

- **Primeiro build**: Gradle 9 + NDK + C++ da New Arch; espere >10 min e ~5 GB em `~/.gradle`. Se falhar com erro de `cmake`, rodar `sdkmanager "cmake;3.22.1"` (já incluído na Task 0).
- **Layout**: margens fixas (`marginLeft: 140`) foram calibradas em 2020. O S25 em landscape tem ~830 dp de largura; deve caber. Se os copos apertarem, reduzir para 100/60 em `Board.tsx` e `GameScreen.tsx`.
- **Nomes de ícones**: `Fontisto` `volume-mute`, `music-note`, `close-a`, `save` e `FontAwesome5` `trophy`, `home` existem nos glyphmaps v13; o TypeScript acusa se algum sumiu.
- **Senha antiga** (`m3uGoogle!`) continua no histórico do git público. O keystore novo torna isso irrelevante para o app; se a senha for reutilizada em outro lugar, trocar lá.

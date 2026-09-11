# Sessão — área segura no Android (2026-09-07)

## Restrição de ambiente

O usuário determinou: não executar emulador sem consentimento prévio.
Continuar os testes no aparelho `s25:5555`, sempre usando `adb -s s25:5555`.
O emulador iniciado nesta sessão já não estava em execução ao conferir essa restrição.

## Problema e correção

A barra de navegação de três botões do S25 sobrepunha o X no canto superior
direito. O `GameScreen` aplicava os insets como padding, mas os filhos com
posição absoluta continuavam ancorados à borda externa do contêiner.

Os quatro insets agora são margens: o próprio contêiner fica dentro da área
segura, incluindo TopBar, Hall da Fama e overlays. O wallpaper externo continua
cobrindo a tela inteira. Os fundos dos overlays preenchem apenas a área segura.
Não houve alteração nas regras, dependências ou persistência.

## Validação

- S25 em landscape, 2340 × 1080, navegação de três botões: antes, o X ficava
  sob a barra e o toque não abria a confirmação; depois, o X recuou e abriu
  “Sair do jogo?”. Cancelamento e abertura do Hall da Fama também conferidos.
- APK release gerado e atualizado no S25 com `install -r`; recorde preservado.
- 15 testes Jest passando; TypeScript, ESLint e Prettier sem erros.
- Revisão do diff sem achados de correção ou segurança.
- `npm audit`: oito ocorrências high e zero critical na árvore de dependências
  existente, relacionadas a `image-size`/Metro/React Native. Atualização dessas
  dependências ficou fora desta correção de layout.

O teste visual foi manual via ADB e screenshots. A tentativa de automatizar a
leitura da interface com UIAutomator não foi confiável devido às animações;
os testes Jest existentes não verificam geometria nativa.

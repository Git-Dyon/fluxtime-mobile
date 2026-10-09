# FluxTime — mobile

App Android (Expo + TypeScript) para gerentes e usuários acompanharem e
rodarem o cronômetro em campo. O Manager Master não tem tela própria aqui —
a administração de contas continua no desktop (ver `MasterAvisoScreen`).

## Por que Expo, e por que Notifee

A decisão de produto foi Expo em vez de Capacitor porque o cronômetro precisa
continuar contando com a tela apagada ou o app minimizado — é o caso de uso
central do produto, não um extra. Isso exige um **foreground service** do
Android, que só existe com código nativo.

`@notifee/react-native` é quem implementa esse serviço aqui
(`src/timer/cronometroService.ts`): ele sobe uma notificação persistente
("Rodando: <task> — toque para pausar") que diz ao Android "não mate este
processo", com um botão de pausar que funciona mesmo se o app tiver sido
encerrado pelo sistema (`src/timer/pausarViaNotificacao.ts`, registrado em
`index.ts` fora do ciclo de vida do React).

`npx expo-doctor` aponta o notifee como "unmaintained" no React Native
Directory — por isso ele está na lista de exclusão em `package.json`
(`expo.doctor.reactNativeDirectoryCheck.exclude`). A biblioteca continua
sendo a opção mais completa do ecossistema Expo para notificação com ação +
foreground service; se isso mudar, vale revisitar.

A verdade sobre quanto tempo passou nunca mora na notificação: o backend
guarda `iniciadoEm` e recalcula a duração real quando o cronômetro para (G5,
G6 — ver `backend/src/services/tempoTotal.ts`). A notificação é só o que o
usuário vê enquanto isso não acontece.

## Rodando localmente

Notifee tem módulo nativo — **não funciona no Expo Go**. É preciso gerar um
dev client:

```bash
npm install
cp .env.example .env   # ajuste o IP — ver comentário dentro do arquivo
npx expo prebuild      # gera android/ e ios/ localmente (ignorados no git)
npx expo run:android   # compila e instala o dev client num emulador/dispositivo
```

`localhost` no `.env` não alcança o backend a partir do emulador nem do
celular físico — o arquivo `.env.example` explica as três variações
(emulador, dispositivo físico, iOS Simulator).

Depois do primeiro `expo run:android`, o dia a dia é `npm start` normalmente
(o Metro conecta no dev client já instalado).

## Gerando o AAB (Play Store)

Build fica na nuvem via EAS — não precisa de Android Studio configurado
localmente. Isto exige uma conta Expo/EAS, que só o dono do projeto pode
autenticar:

```bash
npx eas-cli login                 # uma vez por máquina
npx eas-cli init                  # a primeira vez, vincula este projeto a um projectId no EAS
npm run build:android:preview     # gera um .apk para distribuição interna/teste
npm run build:android             # gera o .aab de produção (o que a Play Store pede)
```

O `projectId` fica em `app.json` → `expo.extra.eas.projectId`, hoje vazio —
`eas init` preenche sozinho na primeira execução.

## Escopo desta fase

- **Usuário**: lista de tasks, criação rápida ("o que você vai fazer agora?"),
  play/pause com cronômetro em foreground service, barra de tasks fixas
  (Daily/Reunião/Evento).
- **Gerente**: as mesmas ações sobre as próprias tasks, aba "Equipe agora"
  (quem está com o quê rodando, sem editar), tasks fixas.
- **Fora do escopo mobile, por decisão de produto**: delegar para até 3
  responsáveis, criar/renomear tasks fixas, editar dados de conta, relatórios,
  auditoria — telas com formulário grande demais para a tela pequena, ou uso
  administrativo raro. Tudo isso já existe no desktop.

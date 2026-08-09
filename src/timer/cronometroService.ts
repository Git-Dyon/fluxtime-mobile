import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { formatHM } from '../lib/utils';

/**
 * Notificação persistente do cronômetro (foreground service, G-mobile).
 *
 * Sem isto, o Android suspende o processo do app poucos segundos depois da
 * tela apagar ou do usuário trocar de app — e o cronômetro, que é o motivo de
 * existir deste aplicativo, para de contar. A notificação fixa é o que diz ao
 * sistema operacional "este app está fazendo um trabalho que o usuário pediu
 * para continuar"; sem ela o Android tem todo o direito de matar o processo.
 *
 * A verdade sobre quanto tempo passou nunca mora aqui: o backend guarda
 * `iniciadoEm` e recalcula a duração real quando o cronômetro para (G5/G6).
 * Esta notificação é só o que o usuário vê enquanto isso não acontece — ela
 * pode atrasar alguns segundos sem consequência nenhuma para a hora faturada.
 */

const CANAL_ID = 'fluxtime-cronometro';
export const ID_NOTIFICACAO = 'fluxtime-cronometro-ativo';
/** Id da ação de pausar, compartilhado entre o handler de foreground e o de background. */
export const ACAO_PAUSAR = 'pausar-cronometro';

/** Tipo de serviço em primeiro plano do Android 14+ (FOREGROUND_SERVICE_TYPE_DATA_SYNC). */
const TIPO_SERVICO_DATA_SYNC = 1;

export async function garantirPermissaoDeNotificacao(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

async function garantirCanal(): Promise<string> {
  return notifee.createChannel({
    id: CANAL_ID,
    name: 'Cronômetro em execução',
    description: 'Mostra a task ativa enquanto o cronômetro está contando.',
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
  });
}

export interface DadosCronometro {
  taskId: string;
  taskTitulo: string;
  /** Epoch ms de quando esta sessão começou — mesma fonte que o backend usa. */
  iniciadoEm: number;
}

let intervaloAtualizacao: ReturnType<typeof setInterval> | null = null;
/** Resolve a promise que `registerForegroundService` mantém pendente — é o sinal para o Android encerrar o serviço. */
let resolverServico: (() => void) | null = null;

async function montarNotificacao(dados: DadosCronometro, canalId: string) {
  const segundos = Math.max(0, Math.floor((Date.now() - dados.iniciadoEm) / 1000));
  return notifee.displayNotification({
    id: ID_NOTIFICACAO,
    title: `Rodando: ${dados.taskTitulo}`,
    body: `${formatHM(segundos)} decorridos — toque para pausar`,
    data: { taskId: dados.taskId },
    android: {
      channelId: canalId,
      asForegroundService: true,
      foregroundServiceTypes: [TIPO_SERVICO_DATA_SYNC],
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      smallIcon: 'ic_launcher',
      color: '#aa3bff',
      pressAction: { id: 'default' },
      actions: [{ title: 'Pausar', pressAction: { id: ACAO_PAUSAR } }],
    },
  });
}

/**
 * Registra a tarefa do serviço em primeiro plano.
 *
 * Precisa rodar uma única vez, em escopo de módulo (ver index.ts) — fora do
 * ciclo de vida do React, porque o Android pode reiniciar o processo do app
 * enquanto ele está minimizado, e só um handler registrado cedo sobrevive a isso.
 * A promise devolvida só resolve quando `pararCronometro` chama `resolverServico`.
 */
export function registrarTarefaDeForeground() {
  notifee.registerForegroundService(
    () =>
      new Promise<void>((resolve) => {
        resolverServico = resolve;
      }),
  );
}

/** Play: sobe a notificação e passa a atualizar o tempo decorrido a cada minuto. */
export async function iniciarCronometro(dados: DadosCronometro): Promise<void> {
  const canalId = await garantirCanal();
  await montarNotificacao(dados, canalId);

  if (intervaloAtualizacao) clearInterval(intervaloAtualizacao);
  intervaloAtualizacao = setInterval(() => {
    void montarNotificacao(dados, canalId);
  }, 60_000);
}

/** Pause/stop: derruba a notificação e libera o serviço em primeiro plano. */
export async function pararCronometro(): Promise<void> {
  if (intervaloAtualizacao) {
    clearInterval(intervaloAtualizacao);
    intervaloAtualizacao = null;
  }
  await notifee.cancelNotification(ID_NOTIFICACAO);
  resolverServico?.();
  resolverServico = null;
}

/** true se o app foi aberto a partir do toque na notificação — usado para focar a task certa. */
export async function taskIdDaNotificacaoDeAbertura(): Promise<string | null> {
  const inicial = await notifee.getInitialNotification();
  return (inicial?.notification.data?.taskId as string | undefined) ?? null;
}

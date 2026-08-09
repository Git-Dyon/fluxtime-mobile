import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventType, type Event } from '@notifee/react-native';
import { ACAO_PAUSAR, ID_NOTIFICACAO, pararCronometro } from './cronometroService';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3741/api';
const CHAVE_TOKEN = 'fx_token';

/**
 * Efeito do botão "Pausar" da notificação — compartilhado entre o handler de
 * foreground (App.tsx, app aberto) e o de background (index.ts, app minimizado
 * ou o processo já foi morto pelo Android).
 *
 * Não usa `src/lib/api.ts`: aquele módulo guarda o token em variável de
 * memória, que não existe neste contexto quando o Android acorda o app só
 * para processar o evento da notificação. Aqui o token vem direto do
 * AsyncStorage, que é a mesma fonte, só que sem depender de o app já ter
 * rodado nesta execução do processo.
 */
export async function tratarEventoDeNotificacao(event: Event): Promise<void> {
  const { type, detail } = event;
  if (detail.notification?.id !== ID_NOTIFICACAO) return;

  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === ACAO_PAUSAR) {
    const taskId = detail.notification.data?.taskId as string | undefined;
    if (taskId) await pararTaskNoServidor(taskId);
    await pararCronometro();
  }

  if (type === EventType.DISMISSED) {
    // A notificação é `ongoing`/não descartável pelo usuário — chegar aqui
    // significa que o próprio app chamou cancelNotification (via pararCronometro),
    // e o serviço já foi liberado por quem cancelou. Nada a fazer.
  }
}

async function pararTaskNoServidor(taskId: string): Promise<void> {
  const token = await AsyncStorage.getItem(CHAVE_TOKEN);
  if (!token) return;

  try {
    await fetch(`${BASE}/tasks/${taskId}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    // Sem conexão no momento do toque: o cronômetro do servidor continua
    // rodando e o usuário vê isso ao reabrir o app — não há como recuperar
    // silenciosamente aqui, e falhar alto não ajudaria (não há UI para mostrar).
  }
}

import { useCallback } from 'react';
import { api } from '../lib/api';
import type { Task } from '../lib/types';
import { minhaAtribuicao } from '../lib/utils';
import { garantirPermissaoDeNotificacao, iniciarCronometro, pararCronometro } from '../timer/cronometroService';

/**
 * Play/pause de uma task, sincronizado com o serviço em primeiro plano.
 *
 * O servidor é sempre a fonte da verdade sobre o tempo (G5/G6) — este hook só
 * garante que, sempre que o app inicia um cronômetro, a notificação que impede
 * o Android de matar o processo sobe junto, e que ela desce quando o servidor
 * confirma o stop. Nunca ao contrário: se `POST /start` falhar, não sobe
 * notificação nenhuma para uma sessão que não existe no backend.
 */
export function useCronometroTask(userId: string, onAlterado: () => void) {
  const iniciar = useCallback(async (taskId: string, titulo: string) => {
    await garantirPermissaoDeNotificacao();
    const task = await api.post<Task>(`/tasks/${taskId}/start`);
    const minha = minhaAtribuicao(task, userId);
    if (minha?.iniciadoEm) {
      await iniciarCronometro({ taskId, taskTitulo: titulo, iniciadoEm: minha.iniciadoEm });
    }
    onAlterado();
  }, [userId, onAlterado]);

  /** Sem `alvoUserId` = para o próprio cronômetro; com ele, o gerente para o de um membro. */
  const pausar = useCallback(async (taskId: string, alvoUserId?: string) => {
    await api.post(`/tasks/${taskId}/stop`, alvoUserId ? { userId: alvoUserId } : undefined);
    if (!alvoUserId || alvoUserId === userId) await pararCronometro();
    onAlterado();
  }, [userId, onAlterado]);

  return { iniciar, pausar };
}

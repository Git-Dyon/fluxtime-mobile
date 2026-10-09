import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Task } from '../lib/types';
import {
  calcMeusSegundos, deadlineClass, deadlineLabel, formatSeconds, minhaAtribuicao,
  severidadeColor, SEVERIDADE_LABELS, STATUS_LABELS,
} from '../lib/utils';
import { cores, espacamento, raio } from '../theme';

const CORES_DEADLINE: Record<string, string> = {
  green: cores.verde, yellow: cores.amarelo, orange: cores.laranja, red: cores.vermelho,
};
const CORES_SEVERIDADE: Record<string, string> = {
  green: cores.verde, yellow: cores.amarelo, orange: cores.laranja, red: cores.vermelho,
};

interface Props {
  task: Task;
  userId: string;
  now: number;
  /** Só o usuário comum tem play/pause direto no card — o gerente monitora, não atua nas tasks alheias por aqui. */
  podeAtuar: boolean;
  onIniciar: (taskId: string, titulo: string) => void;
  onPausar: (taskId: string) => void;
}

export function TaskCard({ task, userId, now, podeAtuar, onIniciar, onPausar }: Props) {
  const minha = minhaAtribuicao(task, userId);
  const rodando = Boolean(minha?.rodando);
  const segundos = calcMeusSegundos(task, userId, now);
  const dl = deadlineClass(task.dataFinal, task.status);

  return (
    <View style={[styles.cartao, rodando && styles.cartaoAtivo]}>
      <View style={styles.topo}>
        <Text style={styles.codigo}>{task.codigo}</Text>
        <View style={[styles.chip, { backgroundColor: `${CORES_SEVERIDADE[severidadeColor(task.severidade)]}22` }]}>
          <Text style={[styles.chipTexto, { color: CORES_SEVERIDADE[severidadeColor(task.severidade)] }]}>
            {SEVERIDADE_LABELS[task.severidade]}
          </Text>
        </View>
      </View>

      <Text style={styles.titulo} numberOfLines={2}>{task.titulo}</Text>

      <View style={styles.linhaMeta}>
        <Text style={styles.status}>{STATUS_LABELS[task.status]}</Text>
        <Text style={[styles.prazo, { color: CORES_DEADLINE[dl] }]}>{deadlineLabel(task.dataFinal)}</Text>
      </View>

      <View style={styles.rodape}>
        <Text style={styles.tempo}>{formatSeconds(segundos)}</Text>
        {podeAtuar && (
          <Pressable
            style={[styles.botaoPlay, rodando && styles.botaoPausar]}
            onPress={() => (rodando ? onPausar(task.id) : onIniciar(task.id, task.titulo))}
          >
            <Text style={styles.botaoPlayTexto}>{rodando ? 'Pausar' : 'Iniciar'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie, borderRadius: raio.md, padding: espacamento.md,
    marginBottom: espacamento.sm, borderWidth: 1, borderColor: cores.borda,
  },
  cartaoAtivo: { borderColor: cores.accent, borderWidth: 1.5 },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codigo: { fontSize: 10.5, fontWeight: '700', color: cores.texto4, letterSpacing: 0.4 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: raio.pill },
  chipTexto: { fontSize: 10, fontWeight: '700' },
  titulo: { fontSize: 15, fontWeight: '700', color: cores.texto1, marginTop: 6 },
  linhaMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  status: { fontSize: 11.5, color: cores.texto3 },
  prazo: { fontSize: 11.5, fontWeight: '600' },
  rodape: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: espacamento.sm, paddingTop: espacamento.sm, borderTopWidth: 1, borderTopColor: cores.borda,
  },
  tempo: { fontSize: 18, fontWeight: '800', color: cores.texto1, fontVariant: ['tabular-nums'] },
  botaoPlay: {
    backgroundColor: cores.accent, paddingHorizontal: espacamento.lg, height: 36,
    borderRadius: raio.pill, alignItems: 'center', justifyContent: 'center',
  },
  botaoPausar: { backgroundColor: cores.texto3 },
  botaoPlayTexto: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

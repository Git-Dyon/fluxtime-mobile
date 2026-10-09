import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Task } from '../lib/types';
import { calcMeusSegundos, formatHM, minhaAtribuicao } from '../lib/utils';
import { cores, espacamento, raio } from '../theme';

interface Props {
  /** Já filtradas para tipo === 'ESPECIAL', ordenadas por ordemFixa. */
  especiais: Task[];
  userId: string;
  now: number;
  onIniciar: (taskId: string, titulo: string) => void;
  onPausar: (taskId: string) => void;
}

/**
 * Daily, Reunião, Evento — fixas no rodapé, espelhando o desktop (G4). Cada
 * uma tem o próprio play/pause independente das tasks comuns; a regra de
 * concorrência (G5) só impede duas do mesmo tipo ao mesmo tempo, que é o
 * backend quem garante.
 *
 * Sem renomear aqui — no mobile essa ação fica só no desktop por ora: é uma
 * ação administrativa rara, e a tela pequena não pede outro fluxo de edição
 * competindo por espaço com o cronômetro.
 */
export function EspeciaisBar({ especiais, userId, now, onIniciar, onPausar }: Props) {
  const visiveis = especiais.filter((t) => minhaAtribuicao(t, userId));
  if (visiveis.length === 0) return null;

  return (
    <View style={styles.barra}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conteudo}>
        {visiveis.map((t) => {
          const minha = minhaAtribuicao(t, userId)!;
          const segundos = calcMeusSegundos(t, userId, now);
          return (
            <Pressable
              key={t.id}
              style={[styles.chip, minha.rodando && styles.chipAtivo]}
              onPress={() => (minha.rodando ? onPausar(t.id) : onIniciar(t.id, t.titulo))}
            >
              <View style={[styles.bolinha, minha.rodando && styles.bolinhaAtiva]} />
              <Text style={[styles.chipTitulo, minha.rodando && styles.chipTituloAtivo]} numberOfLines={1}>
                {t.titulo}
              </Text>
              <Text style={[styles.chipTempo, minha.rodando && styles.chipTituloAtivo]}>{formatHM(segundos)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: { borderTopWidth: 1, borderTopColor: cores.borda, backgroundColor: cores.superficie },
  conteudo: { paddingHorizontal: espacamento.md, paddingVertical: espacamento.sm, gap: espacamento.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: espacamento.md, height: 38,
    borderRadius: raio.pill, backgroundColor: cores.fundo, borderWidth: 1, borderColor: cores.borda,
  },
  chipAtivo: { backgroundColor: cores.accent, borderColor: cores.accent },
  bolinha: { width: 7, height: 7, borderRadius: 4, backgroundColor: cores.texto4 },
  bolinhaAtiva: { backgroundColor: '#fff' },
  chipTitulo: { fontSize: 12.5, fontWeight: '600', color: cores.texto2, maxWidth: 110 },
  chipTituloAtivo: { color: '#fff' },
  chipTempo: { fontSize: 11.5, fontWeight: '700', color: cores.texto3, fontVariant: ['tabular-nums'] },
});

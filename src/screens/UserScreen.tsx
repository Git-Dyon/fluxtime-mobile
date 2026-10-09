import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import { subscribeTaskEvents } from '../lib/socket';
import type { PaginaDeTasks, Task } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useNow } from '../hooks/useNow';
import { useCronometroTask } from '../hooks/useCronometroTask';
import { TaskCard } from '../components/TaskCard';
import { EspeciaisBar } from '../components/EspeciaisBar';
import { cores, espacamento, raio } from '../theme';

export function UserScreen() {
  const { user, logout } = useAuth();
  const now = useNow();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    // As fixas vêm fora da paginação (G4) — a barra do rodapé não é uma lista.
    const r = await api.get<PaginaDeTasks>('/tasks?limite=200');
    setTasks([...r.itens, ...r.especiais]);
  }, []);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      try { await carregar(); } finally { setCarregando(false); }
    })();
  }, [carregar]);

  useEffect(() => subscribeTaskEvents(() => { void carregar(); }), [carregar]);

  const atualizar = async () => {
    setAtualizando(true);
    try { await carregar(); } finally { setAtualizando(false); }
  };

  const { iniciar, pausar } = useCronometroTask(user!.id, () => { void carregar(); });

  const comuns = useMemo(() => tasks.filter((t) => t.tipo === 'COMUM'), [tasks]);
  const especiais = useMemo(
    () => tasks.filter((t) => t.tipo === 'ESPECIAL').sort((a, b) => (a.ordemFixa ?? 0) - (b.ordemFixa ?? 0)),
    [tasks],
  );

  const criarTaskRapida = async () => {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    setCriando(true);
    setErro('');
    try {
      const dataFinal = new Date();
      dataFinal.setDate(dataFinal.getDate() + 7);
      const task = await api.post<Task>('/tasks', {
        titulo, userIds: [user!.id], status: 'ATUANDO', severidade: 'BAIXA', horas: 1,
        dataFinal: dataFinal.toISOString().slice(0, 10),
      });
      setNovoTitulo('');
      await iniciar(task.id, task.titulo);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível criar a task.');
    } finally {
      setCriando(false);
    }
  };

  return (
    <SafeAreaView style={styles.tela} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.perfil}>Você</Text>
          <Text style={styles.nome}>{user?.nome}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10}>
          <Text style={styles.sair}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.novaTask}>
        <TextInput
          style={styles.campoNovaTask}
          placeholder="O que você vai fazer agora?"
          placeholderTextColor={cores.texto4}
          value={novoTitulo}
          onChangeText={setNovoTitulo}
          onSubmitEditing={criarTaskRapida}
          editable={!criando}
        />
        <Pressable style={styles.botaoNovaTask} onPress={criarTaskRapida} disabled={criando || !novoTitulo.trim()}>
          {criando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botaoNovaTaskTexto}>Iniciar</Text>}
        </Pressable>
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      {carregando ? (
        <ActivityIndicator style={{ marginTop: espacamento.xl }} color={cores.accent} />
      ) : (
        <FlatList
          data={comuns}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.accent} />}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhuma task ainda. Crie uma acima.</Text>}
          renderItem={({ item }) => (
            <TaskCard task={item} userId={user!.id} now={now} podeAtuar onIniciar={iniciar} onPausar={pausar} />
          )}
        />
      )}

      <EspeciaisBar especiais={especiais} userId={user!.id} now={now} onIniciar={iniciar} onPausar={pausar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: espacamento.lg, paddingTop: espacamento.md, paddingBottom: espacamento.sm,
  },
  perfil: { fontSize: 10.5, fontWeight: '700', color: cores.texto4, letterSpacing: 1, textTransform: 'uppercase' },
  nome: { fontSize: 18, fontWeight: '800', color: cores.texto1 },
  sair: { fontSize: 13, fontWeight: '600', color: cores.texto3 },
  novaTask: { flexDirection: 'row', gap: espacamento.sm, paddingHorizontal: espacamento.lg, marginBottom: espacamento.sm },
  campoNovaTask: {
    flex: 1, height: 44, borderRadius: raio.md, backgroundColor: cores.superficie, borderWidth: 1,
    borderColor: cores.borda, paddingHorizontal: espacamento.md, fontSize: 14, color: cores.texto1,
  },
  botaoNovaTask: {
    height: 44, paddingHorizontal: espacamento.lg, borderRadius: raio.md,
    backgroundColor: cores.accent, alignItems: 'center', justifyContent: 'center',
  },
  botaoNovaTaskTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  erro: { color: cores.erro, fontSize: 12, textAlign: 'center', marginBottom: espacamento.sm },
  lista: { paddingHorizontal: espacamento.lg, paddingBottom: espacamento.lg },
  vazio: { textAlign: 'center', color: cores.texto4, fontSize: 13, marginTop: espacamento.xl },
});

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import { subscribeTaskEvents } from '../lib/socket';
import type { PaginaDeTasks, Task, User } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { useNow } from '../hooks/useNow';
import { useCronometroTask } from '../hooks/useCronometroTask';
import { TaskCard } from '../components/TaskCard';
import { EspeciaisBar } from '../components/EspeciaisBar';
import { calcAtribuicaoSeconds, formatHM } from '../lib/utils';
import { cores, espacamento, raio } from '../theme';

type Aba = 'minhas' | 'equipe';

/**
 * Painel do gerente no celular.
 *
 * Escopo deliberadamente mais enxuto que o desktop: aqui o gerente acompanha
 * a equipe em campo e toca as próprias tasks e tasks fixas. Delegar para até
 * 3 pessoas, criar Daily/Reunião/Evento e editar dados exigem formulários
 * maiores (severidade, empresa, projeto, prazo) que cabem melhor numa tela
 * grande — esse fluxo continua no desktop. O celular resolve o que precisa
 * ser resolvido andando pela empresa: ver quem está com o quê rodando agora.
 */
export function ManagerScreen() {
  const { user, logout } = useAuth();
  const now = useNow();
  const [aba, setAba] = useState<Aba>('minhas');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [equipe, setEquipe] = useState<User[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    const [t, e] = await Promise.all([
      api.get<PaginaDeTasks>('/tasks?limite=200'),
      api.get<User[]>(`/users/team/${user!.id}`),
    ]);
    setTasks([...t.itens, ...t.especiais]);
    setEquipe(e);
  }, [user]);

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
  const minhas = useMemo(() => comuns.filter((t) => t.atribuicoes.some((a) => a.userId === user!.id)), [comuns, user]);
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
          <Text style={styles.perfil}>Gerente</Text>
          <Text style={styles.nome}>{user?.nome}</Text>
        </View>
        <Pressable onPress={logout} hitSlop={10}>
          <Text style={styles.sair}>Sair</Text>
        </Pressable>
      </View>

      <View style={styles.abas}>
        <Pressable style={[styles.aba, aba === 'minhas' && styles.abaAtiva]} onPress={() => setAba('minhas')}>
          <Text style={[styles.abaTexto, aba === 'minhas' && styles.abaTextoAtivo]}>Minhas tasks</Text>
        </Pressable>
        <Pressable style={[styles.aba, aba === 'equipe' && styles.abaAtiva]} onPress={() => setAba('equipe')}>
          <Text style={[styles.abaTexto, aba === 'equipe' && styles.abaTextoAtivo]}>Equipe agora</Text>
        </Pressable>
      </View>

      {aba === 'minhas' ? (
        <>
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
              data={minhas}
              keyExtractor={(t) => t.id}
              contentContainerStyle={styles.lista}
              refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.accent} />}
              ListEmptyComponent={<Text style={styles.vazio}>Nenhuma task sua no momento.</Text>}
              renderItem={({ item }) => (
                <TaskCard task={item} userId={user!.id} now={now} podeAtuar onIniciar={iniciar} onPausar={pausar} />
              )}
            />
          )}
        </>
      ) : (
        <FlatList
          data={equipe}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.accent} />}
          ListEmptyComponent={<Text style={styles.vazio}>Ninguém na equipe ainda.</Text>}
          renderItem={({ item }) => <MembroCard membro={item} tasks={comuns} now={now} />}
        />
      )}

      <EspeciaisBar especiais={especiais} userId={user!.id} now={now} onIniciar={iniciar} onPausar={pausar} />
    </SafeAreaView>
  );
}

function MembroCard({ membro, tasks, now }: { membro: User; tasks: Task[]; now: number }) {
  const tasksDoMembro = tasks.filter((t) => t.atribuicoes.some((a) => a.userId === membro.id));
  const ativa = tasksDoMembro.find((t) => t.atribuicoes.find((a) => a.userId === membro.id)?.rodando);
  const totalHoje = tasksDoMembro.reduce((soma, t) => {
    const a = t.atribuicoes.find((x) => x.userId === membro.id);
    return a ? soma + calcAtribuicaoSeconds(a, now) : soma;
  }, 0);

  return (
    <View style={styles.membroCartao}>
      <View style={[styles.bolinhaStatus, ativa && styles.bolinhaAtiva]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.membroNome}>{membro.nome}</Text>
        <Text style={styles.membroAtividade} numberOfLines={1}>
          {ativa ? `Rodando: ${ativa.titulo}` : 'Parado no momento'}
        </Text>
      </View>
      <Text style={styles.membroTotal}>{formatHM(totalHoje)}</Text>
    </View>
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
  abas: {
    flexDirection: 'row', marginHorizontal: espacamento.lg, marginBottom: espacamento.sm,
    backgroundColor: cores.superficie, borderRadius: raio.pill, padding: 4, borderWidth: 1, borderColor: cores.borda,
  },
  aba: { flex: 1, paddingVertical: 9, borderRadius: raio.pill, alignItems: 'center' },
  abaAtiva: { backgroundColor: cores.accent },
  abaTexto: { fontSize: 12.5, fontWeight: '700', color: cores.texto3 },
  abaTextoAtivo: { color: '#fff' },
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
  membroCartao: {
    flexDirection: 'row', alignItems: 'center', gap: espacamento.sm, backgroundColor: cores.superficie,
    borderRadius: raio.md, padding: espacamento.md, marginBottom: espacamento.sm, borderWidth: 1, borderColor: cores.borda,
  },
  bolinhaStatus: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.texto4 },
  bolinhaAtiva: { backgroundColor: cores.verde },
  membroNome: { fontSize: 14.5, fontWeight: '700', color: cores.texto1 },
  membroAtividade: { fontSize: 12, color: cores.texto3, marginTop: 2 },
  membroTotal: { fontSize: 14, fontWeight: '700', color: cores.texto1, fontVariant: ['tabular-nums'] },
});

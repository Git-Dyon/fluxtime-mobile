import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api, ApiError, setToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cores, espacamento, raio } from '../theme';

/**
 * Troca obrigatória de senha — primeiro acesso ou reset feito pelo master.
 * Enquanto `precisaTrocarSenha` for true, a API recusa todas as outras rotas.
 */
export function TrocarSenhaScreen() {
  const { user, logout, recarregarPerfil } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const trocar = async () => {
    setErro('');
    if (!senhaAtual || !novaSenha) { setErro('Preencha a senha atual e a nova senha.'); return; }
    if (novaSenha !== confirmacao) { setErro('A confirmação não confere com a nova senha.'); return; }

    setCarregando(true);
    try {
      const r = await api.post<{ token: string }>('/auth/change-password', { senhaAtual, novaSenha });
      // Trocar a senha incrementa tokenVersion e derruba o token antigo — o
      // novo vem nesta resposta e precisa substituir o guardado, senão a
      // próxima chamada usa um token já revogado.
      await setToken(r.token);
      await recarregarPerfil();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível trocar a senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.cartao}>
        <Text style={styles.titulo}>Defina sua senha</Text>
        <Text style={styles.sub}>
          {user?.precisaTrocarSenha ? 'Este é seu primeiro acesso, ou sua senha foi resetada pelo master.' : 'Troque sua senha.'}
        </Text>

        <TextInput
          style={styles.campo}
          placeholder="Senha atual (a provisória)"
          placeholderTextColor={cores.texto4}
          secureTextEntry
          value={senhaAtual}
          onChangeText={setSenhaAtual}
          editable={!carregando}
        />
        <TextInput
          style={styles.campo}
          placeholder="Nova senha"
          placeholderTextColor={cores.texto4}
          secureTextEntry
          value={novaSenha}
          onChangeText={setNovaSenha}
          editable={!carregando}
        />
        <TextInput
          style={styles.campo}
          placeholder="Confirme a nova senha"
          placeholderTextColor={cores.texto4}
          secureTextEntry
          value={confirmacao}
          onChangeText={setConfirmacao}
          onSubmitEditing={trocar}
          editable={!carregando}
        />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Pressable style={[styles.botao, carregando && styles.botaoDesabilitado]} onPress={trocar} disabled={carregando}>
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Salvar e continuar</Text>}
        </Pressable>

        <Pressable onPress={logout} disabled={carregando}>
          <Text style={styles.sair}>Sair</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, justifyContent: 'center', padding: espacamento.xl },
  cartao: {
    backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espacamento.xl,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  titulo: { fontSize: 20, fontWeight: '800', color: cores.texto1, textAlign: 'center' },
  sub: { fontSize: 12.5, color: cores.texto3, textAlign: 'center', marginTop: 6, marginBottom: espacamento.xl },
  campo: {
    height: 48, borderRadius: raio.md, backgroundColor: cores.fundo, paddingHorizontal: espacamento.md,
    fontSize: 15, color: cores.texto1, marginBottom: espacamento.md,
  },
  erro: { color: cores.erro, fontSize: 12.5, textAlign: 'center', marginBottom: espacamento.sm },
  botao: {
    height: 50, borderRadius: raio.pill, backgroundColor: cores.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: espacamento.sm,
  },
  botaoDesabilitado: { opacity: 0.5 },
  botaoTexto: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sair: { textAlign: 'center', color: cores.texto3, fontSize: 12.5, marginTop: espacamento.lg },
});

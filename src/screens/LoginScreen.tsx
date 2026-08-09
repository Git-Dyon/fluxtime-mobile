import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { api, ApiError } from '../lib/api';
import type { AuthResponse } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { cores, espacamento, raio } from '../theme';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const podeEnviar = email.trim().length > 0 && senha.length > 0 && !carregando;

  const entrar = async () => {
    if (!podeEnviar) return;
    setCarregando(true);
    setErro('');
    try {
      const data = await api.post<AuthResponse>('/auth/login', { email: email.trim(), senha });
      login(data.user, data.token);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Não foi possível entrar. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.cartao}>
        <Text style={styles.marca}>FluxTime</Text>
        <Text style={styles.sub}>Controle de horas por equipe</Text>

        <TextInput
          style={styles.campo}
          placeholder="E-mail"
          placeholderTextColor={cores.texto4}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!carregando}
        />
        <TextInput
          style={styles.campo}
          placeholder="Senha"
          placeholderTextColor={cores.texto4}
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
          onSubmitEditing={entrar}
          editable={!carregando}
        />

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Pressable
          style={[styles.botao, !podeEnviar && styles.botaoDesabilitado]}
          onPress={entrar}
          disabled={!podeEnviar}
        >
          {carregando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botaoTexto}>Entrar</Text>}
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
  marca: { fontSize: 28, fontWeight: '800', color: cores.accent, textAlign: 'center' },
  sub: { fontSize: 13, color: cores.texto3, textAlign: 'center', marginTop: 4, marginBottom: espacamento.xl },
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
});

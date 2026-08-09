import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { cores, espacamento, raio } from '../theme';

/**
 * O Manager Master só gerencia usuários — incluir/excluir, promover/rebaixar,
 * vincular a gerentes, resetar senha, além do freezer e das requisições de 3
 * dias (G1/G2). São formulários de administração, não trabalho de campo, e
 * cabem melhor na tela grande do desktop. O celular do master não precisa
 * duplicar essa tela; só confirma a conta e explica onde continuar.
 */
export function MasterAvisoScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.tela}>
      <View style={styles.cartao}>
        <Text style={styles.titulo}>Olá, {user?.nome}</Text>
        <Text style={styles.texto}>
          A administração de usuários do Manager Master — criar contas, promover, mover de equipe,
          freezer e requisições — fica no aplicativo desktop do FluxTime.
        </Text>
        <Text style={styles.texto}>
          O app do celular é voltado para quem está em campo com o cronômetro: gerentes e usuários.
        </Text>
        <Pressable style={styles.botao} onPress={logout}>
          <Text style={styles.botaoTexto}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, justifyContent: 'center', padding: espacamento.xl },
  cartao: { backgroundColor: cores.superficie, borderRadius: raio.lg, padding: espacamento.xl },
  titulo: { fontSize: 19, fontWeight: '800', color: cores.texto1, marginBottom: espacamento.md },
  texto: { fontSize: 13.5, color: cores.texto3, lineHeight: 20, marginBottom: espacamento.md },
  botao: {
    height: 46, borderRadius: raio.pill, backgroundColor: cores.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: espacamento.sm,
  },
  botaoTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

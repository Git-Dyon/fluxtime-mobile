import { useEffect } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee from '@notifee/react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { tratarEventoDeNotificacao } from './src/timer/pausarViaNotificacao';
import { LoginScreen } from './src/screens/LoginScreen';
import { TrocarSenhaScreen } from './src/screens/TrocarSenhaScreen';
import { UserScreen } from './src/screens/UserScreen';
import { ManagerScreen } from './src/screens/ManagerScreen';
import { MasterAvisoScreen } from './src/screens/MasterAvisoScreen';
import { cores } from './src/theme';

function Roteador() {
  const { user, carregando } = useAuth();

  // Complemento do handler de background (index.ts): cobre o caso em que o
  // usuário toca "Pausar" na notificação com o app ainda vivo em primeiro
  // plano, onde é este listener — não o de background — que o Android chama.
  useEffect(() => notifee.onForegroundEvent(tratarEventoDeNotificacao), []);

  if (carregando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={cores.accent} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  // A API recusa toda rota de negócio nesse estado — nenhuma outra tela
  // adiantaria nada além de uma sequência de erros 403 (mesma regra do desktop).
  if (user.precisaTrocarSenha) return <TrocarSenhaScreen />;

  switch (user.perfil) {
    case 'MANAGER_MASTER': return <MasterAvisoScreen />;
    case 'MANAGER': return <ManagerScreen />;
    case 'USER': return <UserScreen />;
    default: return <LoginScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={cores.fundo} />
      <AuthProvider>
        <Roteador />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
});

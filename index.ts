import { registerRootComponent } from 'expo';
import notifee from '@notifee/react-native';
import { registrarTarefaDeForeground } from './src/timer/cronometroService';
import { tratarEventoDeNotificacao } from './src/timer/pausarViaNotificacao';

import App from './App';

// Registro em escopo de módulo, antes do app renderizar: o Android pode acordar
// o processo só para entregar um evento de notificação com a UI ainda não
// montada, e só um handler cadastrado neste ponto tem garantia de recebê-lo
// (ver src/timer/cronometroService.ts).
registrarTarefaDeForeground();
notifee.onBackgroundEvent(tratarEventoDeNotificacao);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

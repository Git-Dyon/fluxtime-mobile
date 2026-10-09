import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3741/api';

const CHAVE_TOKEN = 'fx_token';

let token: string | null = null;

/** Chamado quando a API responde 401: a sessão morreu, o app volta para o login. */
let aoPerderSessao: (() => void) | null = null;
export function onSessaoExpirada(cb: () => void) { aoPerderSessao = cb; }

/**
 * Diferente do desktop, aqui não existe "não persistir": um celular é um
 * dispositivo pessoal, e reabrir o app pedindo login toda vez que Android mata
 * o processo em segundo plano seria pior experiência do que no navegador, onde
 * a aba costuma ficar viva. O token sempre vai para o AsyncStorage.
 */
export async function setToken(t: string): Promise<void> {
  token = t;
  await AsyncStorage.setItem(CHAVE_TOKEN, t);
}

export function getToken() { return token; }

export async function loadStoredToken(): Promise<string | null> {
  const salvo = await AsyncStorage.getItem(CHAVE_TOKEN);
  if (salvo) token = salvo;
  return salvo;
}

export async function clearToken(): Promise<void> {
  token = null;
  await AsyncStorage.removeItem(CHAVE_TOKEN);
}

export class ApiError extends Error {
  status: number;
  data: any;
  /** Presente em toda resposta de erro — é o que liga a falha à linha de log do servidor. */
  requestId?: string;
  constructor(status: number, message: string, data: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.requestId = data?.requestId;
  }
}

/** O backend responde 403 com este código enquanto a senha for a provisória. */
export const CODIGO_SENHA_PROVISORIA = 'SENHA_PROVISORIA';

function cabecalhos(extra: Record<string, string> = {}): Record<string, string> {
  const h = { ...extra };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function interpretar(res: Response): Promise<any> {
  // 204 e respostas vazias não têm corpo JSON.
  const texto = await res.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return { erro: texto };
  }
}

async function lidarComFalha(res: Response): Promise<never> {
  const data = await interpretar(res);
  if (res.status === 401) {
    await clearToken();
    aoPerderSessao?.();
  }
  throw new ApiError(res.status, data?.erro || 'Erro na requisição', data);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: cabecalhos({ 'Content-Type': 'application/json' }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) await lidarComFalha(res);
  return (await interpretar(res)) as T;
}

export const api = {
  get:    <T>(path: string) => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put:    <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

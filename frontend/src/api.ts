const BASE = import.meta.env.VITE_API_URL || '/api';

export type Role = 'ADMIN' | 'RECEPCIONISTA' | 'ENTRENADOR' | 'CLIENTE';
export interface Me { id: number; name: string; role: Role; clientId: number | null }

export const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Administrador', RECEPCIONISTA: 'Recepcionista', ENTRENADOR: 'Entrenador', CLIENTE: 'Cliente' };
export const STATUS_LABEL: Record<string, string> = { ACTIVA: 'Activa', SUSPENDIDA: 'Suspendida', VENCIDA: 'Vencida', SIN_MEMBRESIA: 'Sin membresía' };

export const token = {
  get: () => localStorage.getItem('token'),
  set: (t: string | null) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token')),
};

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const t = token.get();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && t) { token.set(null); location.reload(); }
    throw new Error(Array.isArray(data?.message) ? data.message.join('. ') : data?.message || `El servidor respondió con el error ${res.status}. Revisa los registros del backend.`);
  }
  return data as T;
}

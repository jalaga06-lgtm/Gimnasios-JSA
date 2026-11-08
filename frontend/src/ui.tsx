import { ReactNode, useCallback, useEffect, useState } from 'react';
import { api, STATUS_LABEL } from './api';

/** Carga un recurso del backend y permite recargarlo. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    if (path) api<T>(path).then((d) => { setData(d); setError(''); }).catch((e) => setError(e.message));
  }, [path]);
  useEffect(reload, [reload]);
  return { data, error, reload };
}

/** Ejecuta una acción y muestra el resultado como aviso. */
export function useNotice() {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, okText: string, after?: () => void) => {
    try { await fn(); setNotice({ ok: true, text: okText }); after?.(); } catch (e: any) { setNotice({ ok: false, text: e.message }); }
  };
  const box = notice && <div className={`notice ${notice.ok ? 'ok' : 'bad'}`} role="status">{notice.text}</div>;
  return { box, run, setNotice };
}

export const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="card"><h2>{title}</h2>{children}</section>
);

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>) : <tr><td colSpan={head.length} className="muted">Sin registros todavía.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export const Pill = ({ status }: { status: string }) => (
  <span className={`pill ${status === 'ACTIVA' || status === 'Activo' || status === 'Permitido' ? '' : status === 'SUSPENDIDA' ? 'warn' : 'bad'}`}>{STATUS_LABEL[status] ?? status}</span>
);

export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-CO') : '-');

export interface Field {
  name: string; label: string; type?: string; required?: boolean; num?: boolean;
  options?: { value: string | number; label: string }[];
}

/** Formulario genérico: omite campos vacíos y convierte los numéricos. */
export function Form({ fields, initial, submitLabel, onSubmit, onCancel }: {
  fields: Field[]; initial?: Record<string, any> | null; submitLabel: string; onSubmit: (v: Record<string, any>) => void; onCancel?: () => void;
}) {
  const [v, setV] = useState<Record<string, any>>(initial ?? {});
  useEffect(() => setV(initial ?? {}), [initial]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const out: Record<string, any> = {};
    for (const f of fields) {
      const val = v[f.name];
      if (val === undefined || val === '' || val === null) continue;
      out[f.name] = f.num ? Number(val) : val;
    }
    onSubmit(out);
  };
  return (
    <form onSubmit={submit} className="form">
      {fields.map((f) => (
        <label key={f.name}>{f.label}
          {f.options ? (
            <select value={v[f.name] ?? ''} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} required={f.required}>
              {!f.required && <option value="">Ninguno</option>}
              {f.required && v[f.name] === undefined && <option value="">Elige una opción</option>}
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea rows={3} value={v[f.name] ?? ''} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} required={f.required} />
          ) : (
            <input type={f.type || 'text'} value={v[f.name] ?? ''} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} required={f.required} />
          )}
        </label>
      ))}
      <div className="actions">
        <button className="btn primary">{submitLabel}</button>
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  );
}

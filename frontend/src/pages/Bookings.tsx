import { useState } from 'react';
import { api, Me } from '../api';
import { Card, Table, useApi, useNotice } from '../ui';

export default function Bookings({ me }: { me: Me }) {
  const reception = me.role === 'RECEPCIONISTA';
  const { data: clients } = useApi<any[]>(reception ? '/clients' : null);
  const [picked, setPicked] = useState<number | null>(null);
  const clientId = reception ? picked ?? clients?.[0]?.id ?? null : me.clientId;
  const q = reception && clientId ? `?clientId=${clientId}` : '';
  const { data: classes, reload: reloadClasses } = useApi<any[]>('/classes');
  const { data: mine, reload: reloadMine } = useApi<any[]>(clientId ? `/bookings${q}` : null);
  const { box, run } = useNotice();
  const reload = () => { reloadClasses(); reloadMine(); };
  const booking = (classId: number) => (mine ?? []).find((b) => b.classId === classId);

  return (
    <>
      {box}
      {reception && (
        <Card title="Cliente">
          <label>Reservar para
            <select value={clientId ?? ''} onChange={(e) => setPicked(Number(e.target.value))}>
              {(clients ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </Card>
      )}
      <Card title="Reservar y cancelar">
        <Table head={['Clase', 'Día', 'Hora', 'Cupos libres', '']} rows={(classes ?? []).map((c) => {
          const b = booking(c.id);
          return [c.name, c.weekday, c.startTime, c.available,
            b ? <button className="btn" onClick={() => run(() => api(`/bookings/${b.id}`, { method: 'DELETE' }), 'Reserva cancelada.', reload)}>Cancelar reserva</button>
              : <button className="btn primary" onClick={() => run(() => api('/bookings', { method: 'POST', body: { classId: c.id, ...(reception ? { clientId } : {}) } }), 'Reserva confirmada.', reload)}>Reservar</button>];
        })} />
      </Card>
    </>
  );
}

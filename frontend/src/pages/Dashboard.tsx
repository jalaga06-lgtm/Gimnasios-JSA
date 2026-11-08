import { Me, STATUS_LABEL } from '../api';
import { Card, Pill, fmtDate, useApi } from '../ui';

export default function Dashboard({ me }: { me: Me }) {
  if (me.role === 'CLIENTE') return <MyPanel />;
  return <Summary me={me} />;
}

function MyPanel() {
  const { data } = useApi<any>('/access/me');
  return (
    <Card title="Tu membresía">
      <p><Pill status={data?.status ?? '...'} /> {data?.endDate ? `Vigente hasta ${fmtDate(data.endDate)}.` : ''}</p>
      {data?.status === 'SIN_MEMBRESIA' && <p className="muted">Aún no tienes membresía. Pide a recepción que la active.</p>}
    </Card>
  );
}

function Summary({ me }: { me: Me }) {
  const { data: clients } = useApi<any[]>(me.role === 'ADMIN' || me.role === 'RECEPCIONISTA' ? '/clients' : null);
  const total = clients?.length ?? 0;
  const active = (clients ?? []).filter((c) => c.membershipStatus === 'ACTIVA').length;
  return (
    <>
      {clients && (
        <div className="stats">
          <div><b>{total}</b><span>Clientes</span></div>
          <div><b>{active}</b><span>{STATUS_LABEL.ACTIVA}s</span></div>
          <div><b>{total - active}</b><span>Sin membresía activa</span></div>
        </div>
      )}
      <Card title="Bienvenido"><p>Usa el menú para entrar a los módulos disponibles para tu rol.</p></Card>
    </>
  );
}

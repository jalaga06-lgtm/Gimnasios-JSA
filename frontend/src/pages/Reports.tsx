import { STATUS_LABEL } from '../api';
import { Card, Table, useApi } from '../ui';

export default function Reports() {
  const { data: r } = useApi<any>('/reports/summary');
  if (!r) return <p className="muted">Cargando reportes...</p>;
  return (
    <>
      <Card title="Clientes por estado de membresía">
        <Table head={['Estado', 'Clientes']} rows={Object.entries(r.clientsByStatus).map(([s, n]) => [STATUS_LABEL[s], n as number])} />
      </Card>
      <Card title="Membresías por plan">
        <Table head={['Plan', 'Registradas', 'Activas']} rows={r.membershipsByPlan.map((p: any) => [p.plan, p.total, p.active])} />
      </Card>
      <Card title="Accesos">
        <Table head={['Permitidos', 'Denegados', 'Hoy']} rows={[[r.access.granted, r.access.denied, r.access.today]]} />
      </Card>
      <Card title="Reservas por clase">
        <Table head={['Clase', 'Reservas', 'Cupo']} rows={r.bookingsByClass.map((c: any) => [c.class, c.bookings, c.capacity])} />
      </Card>
    </>
  );
}

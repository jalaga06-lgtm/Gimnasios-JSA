import { api, Me } from '../api';
import { Card, Field, Form, Pill, Table, useApi, useNotice } from '../ui';

export default function Trainers({ me }: { me: Me }) {
  return me.role === 'ADMIN' ? <AdminView /> : <MyClients />;
}

function AdminView() {
  const { data: trainers, reload } = useApi<any[]>('/trainers');
  const { data: clients } = useApi<any[]>('/clients');
  const { box, run } = useNotice();
  const fields: Field[] = [
    { name: 'clientId', label: 'Cliente', num: true, required: true, options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'trainerId', label: 'Entrenador', num: true, required: true, options: (trainers ?? []).map((t) => ({ value: t.id, label: t.name })) },
  ];
  return (
    <>
      {box}
      <Card title="Asignar cliente a entrenador">
        <Form fields={fields} submitLabel="Asignar" onSubmit={(v) => run(() => api('/trainers/assign', { method: 'PATCH', body: v }), 'Asignación guardada.', reload)} />
      </Card>
      <Card title="Entrenadores y clientes asignados">
        <Table head={['Entrenador', 'Clientes asignados']} rows={(trainers ?? []).map((t) => [t.name, t.trainees.map((c: any) => c.name).join(', ') || 'Sin clientes'])} />
      </Card>
    </>
  );
}

function MyClients() {
  const { data } = useApi<any[]>('/trainers/my-clients');
  return (
    <Card title="Mis clientes">
      <Table head={['Cliente', 'Documento', 'Teléfono', 'Membresía']} rows={(data ?? []).map((c) => [c.name, c.document, c.phone ?? '-', <Pill status={c.membershipStatus} />])} />
    </Card>
  );
}

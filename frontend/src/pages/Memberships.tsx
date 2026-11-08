import { useState } from 'react';
import { api, Me } from '../api';
import { Card, Field, Form, Pill, Table, fmtDate, useApi, useNotice } from '../ui';

const money = (n: number) => '$' + n.toLocaleString('es-CO');

export default function Memberships({ me }: { me: Me }) {
  const staff = me.role !== 'CLIENTE';
  const admin = me.role === 'ADMIN';
  const { data: plans, reload: reloadPlans } = useApi<any[]>('/plans');
  const { data: list, reload } = useApi<any[]>(staff ? '/memberships' : '/memberships/me');
  const { data: clients } = useApi<any[]>(staff ? '/clients' : null);
  const [editPlan, setEditPlan] = useState<any>(null);
  const { box, run } = useNotice();

  const planFields: Field[] = [
    { name: 'name', label: 'Nombre', required: true },
    { name: 'durationDays', label: 'Duración (días)', type: 'number', num: true, required: true },
    { name: 'price', label: 'Precio (COP)', type: 'number', num: true, required: true },
    { name: 'conditions', label: 'Condiciones' },
  ];
  const regFields: Field[] = [
    { name: 'clientId', label: 'Cliente', num: true, required: true, options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'planId', label: 'Plan', num: true, required: true, options: (plans ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.durationDays} días)` })) },
  ];
  const act = (id: number, what: string, text: string) => run(() => api(`/memberships/${id}/${what}`, { method: 'PATCH' }), text, reload);

  return (
    <>
      {box}
      {admin && (
        <Card title={editPlan ? 'Modificar plan' : 'Crear plan de membresía'}>
          <Form fields={planFields} initial={editPlan} submitLabel={editPlan ? 'Guardar cambios' : 'Crear plan'} onCancel={editPlan ? () => setEditPlan(null) : undefined}
            onSubmit={(v) => run(() => (editPlan ? api(`/plans/${editPlan.id}`, { method: 'PATCH', body: v }) : api('/plans', { method: 'POST', body: v })), 'Plan guardado.', () => { setEditPlan(null); reloadPlans(); })} />
        </Card>
      )}
      <Card title="Planes">
        <Table head={['Plan', 'Duración', 'Precio', 'Condiciones', ...(admin ? [''] : [])]} rows={(plans ?? []).map((p) => [
          p.name, `${p.durationDays} días`, money(p.price), p.conditions ?? '-', ...(admin ? [<button className="btn" onClick={() => setEditPlan(p)}>Editar</button>] : []),
        ])} />
      </Card>
      {staff && (
        <Card title="Registrar membresía">
          <Form key={(list ?? []).length} fields={regFields} submitLabel="Registrar y activar" onSubmit={(v) => run(() => api('/memberships', { method: 'POST', body: v }), 'Membresía registrada.', reload)} />
        </Card>
      )}
      <Card title={staff ? 'Membresías de clientes' : 'Mis membresías'}>
        <Table head={[...(staff ? ['Cliente'] : []), 'Plan', 'Inicio', 'Vence', 'Estado', ...(staff ? [''] : [])]} rows={(list ?? []).map((m) => [
          ...(staff ? [m.client.name] : []), m.plan.name, fmtDate(m.startDate), fmtDate(m.endDate), <Pill status={m.status} />,
          ...(staff ? [<>
            {m.status === 'ACTIVA' && <button className="btn" onClick={() => act(m.id, 'suspend', 'Membresía suspendida.')}>Suspender</button>}
            {m.status === 'SUSPENDIDA' && <button className="btn" onClick={() => act(m.id, 'activate', 'Membresía reactivada.')}>Reactivar</button>}
            <button className="btn" onClick={() => act(m.id, 'renew', 'Membresía renovada.')}>Renovar</button>
          </>] : []),
        ])} />
      </Card>
    </>
  );
}

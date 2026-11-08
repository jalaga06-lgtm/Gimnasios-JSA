import { useState } from 'react';
import { api, Me } from '../api';
import { Card, Field, Form, Table, useApi, useNotice } from '../ui';

export default function Routines({ me }: { me: Me }) {
  return me.role === 'CLIENTE' ? <MyRoutines /> : <TrainerRoutines />;
}

function MyRoutines() {
  const { data } = useApi<any[]>('/routines/me');
  return <Card title="Mis rutinas"><Table head={['Rutina', 'Detalle', 'Entrenador']} rows={(data ?? []).map((r) => [r.title, r.description, r.trainer.name])} /></Card>;
}

function TrainerRoutines() {
  const { data, reload } = useApi<any[]>('/routines');
  const { data: clients } = useApi<any[]>('/trainers/my-clients');
  const [edit, setEdit] = useState<any>(null);
  const { box, run } = useNotice();
  const fields: Field[] = [
    ...(edit ? [] : [{ name: 'clientId', label: 'Cliente', num: true, required: true, options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })) }]),
    { name: 'title', label: 'Título', required: true },
    { name: 'description', label: 'Detalle', type: 'textarea', required: true },
  ];
  return (
    <>
      {box}
      <Card title={edit ? 'Modificar rutina' : 'Crear rutina'}>
        <Form fields={fields} initial={edit} submitLabel={edit ? 'Guardar cambios' : 'Crear rutina'} onCancel={edit ? () => setEdit(null) : undefined}
          onSubmit={(v) => run(() => (edit ? api(`/routines/${edit.id}`, { method: 'PATCH', body: v }) : api('/routines', { method: 'POST', body: v })), 'Rutina guardada.', () => { setEdit(null); reload(); })} />
      </Card>
      <Card title="Rutinas asignadas">
        <Table head={['Cliente', 'Rutina', 'Detalle', '']} rows={(data ?? []).map((r) => [r.client.name, r.title, r.description, <>
          <button className="btn" onClick={() => setEdit(r)}>Editar</button>
          <button className="btn" onClick={() => run(() => api(`/routines/${r.id}`, { method: 'DELETE' }), 'Rutina eliminada.', reload)}>Eliminar</button>
        </>])} />
      </Card>
    </>
  );
}

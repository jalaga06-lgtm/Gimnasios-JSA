import { useState } from 'react';
import { api, Me } from '../api';
import { Card, Field, Form, Table, useApi, useNotice } from '../ui';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Classes({ me }: { me: Me }) {
  const staff = me.role !== 'CLIENTE';
  const admin = me.role === 'ADMIN';
  const { data, reload } = useApi<any[]>('/classes');
  const { data: trainers } = useApi<any[]>(admin ? '/trainers' : null);
  const [edit, setEdit] = useState<any>(null);
  const { box, run } = useNotice();
  const fields: Field[] = [
    { name: 'name', label: 'Clase', required: true },
    ...(admin ? [{ name: 'trainerId', label: 'Entrenador', num: true, required: true, options: (trainers ?? []).map((t) => ({ value: t.id, label: t.name })) }] : []),
    { name: 'weekday', label: 'Día', required: true, options: DAYS.map((d) => ({ value: d, label: d })) },
    { name: 'startTime', label: 'Hora', type: 'time', required: true },
    { name: 'capacity', label: 'Cupo máximo', type: 'number', num: true, required: true },
  ];
  const own = (c: any) => admin || c.trainerId === me.id;
  return (
    <>
      {box}
      {staff && (
        <Card title={edit ? 'Modificar clase' : 'Programar clase'}>
          <Form fields={fields} initial={edit} submitLabel={edit ? 'Guardar cambios' : 'Programar clase'} onCancel={edit ? () => setEdit(null) : undefined}
            onSubmit={(v) => run(() => (edit ? api(`/classes/${edit.id}`, { method: 'PATCH', body: v }) : api('/classes', { method: 'POST', body: v })), 'Clase guardada.', () => { setEdit(null); reload(); })} />
        </Card>
      )}
      <Card title="Clases y horarios">
        <Table head={['Clase', 'Entrenador', 'Día', 'Hora', 'Cupos libres', ...(staff ? [''] : [])]} rows={(data ?? []).map((c) => [
          c.name, c.trainer.name, c.weekday, c.startTime, `${c.available} de ${c.capacity}`,
          ...(staff ? [own(c) ? <>
            <button className="btn" onClick={() => setEdit(c)}>Editar</button>
            <button className="btn" onClick={() => run(() => api(`/classes/${c.id}`, { method: 'DELETE' }), 'Clase eliminada.', reload)}>Eliminar</button>
          </> : ''] : []),
        ])} />
      </Card>
    </>
  );
}

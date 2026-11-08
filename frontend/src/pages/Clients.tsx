import { useState } from 'react';
import { api } from '../api';
import { Card, Field, Form, Pill, Table, useApi, useNotice } from '../ui';

const fields: Field[] = [
  { name: 'name', label: 'Nombre completo', required: true },
  { name: 'document', label: 'Documento', required: true },
  { name: 'phone', label: 'Teléfono', type: 'tel' },
  { name: 'email', label: 'Correo', type: 'email' },
];

export default function Clients() {
  const { data, reload } = useApi<any[]>('/clients');
  const [edit, setEdit] = useState<any>(null);
  const { box, run } = useNotice();
  return (
    <>
      {box}
      <Card title={edit ? 'Actualizar cliente' : 'Registrar cliente'}>
        <Form fields={fields} initial={edit} submitLabel={edit ? 'Guardar cambios' : 'Registrar cliente'} onCancel={edit ? () => setEdit(null) : undefined}
          onSubmit={(v) => run(() => (edit ? api(`/clients/${edit.id}`, { method: 'PATCH', body: v }) : api('/clients', { method: 'POST', body: v })), 'Cliente guardado.', () => { setEdit(null); reload(); })} />
      </Card>
      <Card title="Clientes">
        <Table head={['Nombre', 'Documento', 'Contacto', 'Membresía', 'Entrenador', '']} rows={(data ?? []).map((c) => [
          c.name, c.document, [c.phone, c.email].filter(Boolean).join(' / ') || '-', <Pill status={c.membershipStatus} />, c.trainer?.name ?? 'Sin asignar',
          <button className="btn" onClick={() => setEdit(c)}>Editar</button>,
        ])} />
      </Card>
    </>
  );
}

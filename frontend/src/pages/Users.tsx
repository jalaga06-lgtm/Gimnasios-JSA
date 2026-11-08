import { useState } from 'react';
import { api, ROLE_LABEL, Role } from '../api';
import { Card, Field, Form, Pill, Table, useApi, useNotice } from '../ui';

export default function Users() {
  const { data: users, reload } = useApi<any[]>('/users');
  const { data: clients } = useApi<any[]>('/clients');
  const [edit, setEdit] = useState<any>(null);
  const { box, run } = useNotice();
  const fields: Field[] = [
    { name: 'name', label: 'Nombre', required: true },
    { name: 'email', label: 'Correo', type: 'email', required: true },
    { name: 'password', label: 'Contraseña (mínimo 8)', type: 'password', required: !edit },
    { name: 'role', label: 'Rol', required: true, options: (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] })) },
    { name: 'clientId', label: 'Cliente vinculado (rol Cliente)', num: true, options: (clients ?? []).map((c) => ({ value: c.id, label: c.name })) },
  ];
  return (
    <>
      {box}
      <Card title={edit ? 'Modificar usuario' : 'Registrar usuario'}>
        <Form fields={fields} initial={edit} submitLabel={edit ? 'Guardar cambios' : 'Registrar usuario'} onCancel={edit ? () => setEdit(null) : undefined}
          onSubmit={(v) => run(() => (edit ? api(`/users/${edit.id}`, { method: 'PATCH', body: v }) : api('/users', { method: 'POST', body: v })), 'Usuario guardado.', () => { setEdit(null); reload(); })} />
      </Card>
      <Card title="Usuarios">
        <Table head={['Nombre', 'Correo', 'Rol', 'Estado', '']} rows={(users ?? []).map((u) => [
          u.name, u.email, ROLE_LABEL[u.role as Role], <Pill status={u.active ? 'Activo' : 'Inactivo'} />,
          <>
            <button className="btn" onClick={() => setEdit({ ...u, password: '' })}>Editar</button>
            <button className="btn" onClick={() => run(() => api(`/users/${u.id}/${u.active ? 'deactivate' : 'activate'}`, { method: 'PATCH' }), 'Usuario actualizado.', reload)}>{u.active ? 'Desactivar' : 'Activar'}</button>
          </>,
        ])} />
      </Card>
    </>
  );
}

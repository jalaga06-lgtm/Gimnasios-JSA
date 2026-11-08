import { ROLE_LABEL, Role } from '../api';
import { Card, Table, useApi } from '../ui';

export default function Audit() {
  const { data } = useApi<any[]>('/audit?limit=200');
  return (
    <Card title="Registro de operaciones">
      <Table head={['Fecha', 'Usuario', 'Rol', 'Operación', 'Detalle']} rows={(data ?? []).map((a) => [
        new Date(a.createdAt).toLocaleString('es-CO'), a.user?.name ?? '-', a.user ? ROLE_LABEL[a.user.role as Role] : '-', `${a.action} ${a.entity}`, a.detail,
      ])} />
    </Card>
  );
}

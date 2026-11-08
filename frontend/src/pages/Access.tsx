import { useState } from 'react';
import { api, Me } from '../api';
import { Card, Field, Form, Pill, Table, useApi, useNotice } from '../ui';

const logRows = (l: any[]) => l.map((a) => [new Date(a.createdAt).toLocaleString('es-CO'), a.client?.name ?? a.document, <Pill status={a.granted ? 'Permitido' : 'Denegado'} />, a.reason]);
const head = ['Fecha', 'Cliente', 'Resultado', 'Motivo'];

export default function Access({ me }: { me: Me }) {
  if (me.role === 'CLIENTE') return <MyAccess />;
  return <Reception />;
}

function MyAccess() {
  const { data } = useApi<any>('/access/me');
  return (
    <>
      <Card title="Mi estado de acceso"><p><Pill status={data?.status ?? '...'} /></p></Card>
      <Card title="Mis ingresos"><Table head={head} rows={logRows(data?.history ?? [])} /></Card>
    </>
  );
}

function Reception() {
  const { data: log, reload } = useApi<any[]>('/access');
  const [result, setResult] = useState<any>(null);
  const { box, run } = useNotice();
  const fields: Field[] = [{ name: 'document', label: 'Documento del cliente', required: true }];
  return (
    <>
      {box}
      <Card title="Validar acceso">
        <Form fields={fields} submitLabel="Validar y registrar ingreso" onSubmit={(v) => run(async () => setResult(await api('/access/validate', { method: 'POST', body: v })), 'Consulta registrada.', reload)} />
        {result && <div className={`result ${result.granted ? 'ok' : 'bad'}`}><b>{result.granted ? 'Acceso permitido' : 'Acceso denegado'}</b><br />{result.clientName ? `${result.clientName}: ` : ''}{result.reason}</div>}
      </Card>
      <Card title="Últimos ingresos"><Table head={head} rows={logRows(log ?? [])} /></Card>
    </>
  );
}

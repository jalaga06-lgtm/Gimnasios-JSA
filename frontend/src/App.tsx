import { ReactElement, useEffect, useState } from 'react';
import { api, Me, Role, ROLE_LABEL, token } from './api';
import { Card, Form, useNotice } from './ui';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Memberships from './pages/Memberships';
import Access from './pages/Access';
import Trainers from './pages/Trainers';
import Routines from './pages/Routines';
import Classes from './pages/Classes';
import Bookings from './pages/Bookings';
import Reports from './pages/Reports';
import Audit from './pages/Audit';

// Un módulo de menú por componente del documento, con los roles que lo usan.
const MODULES: { key: string; label: string; roles: Role[]; render: (me: Me) => ReactElement }[] = [
  { key: 'panel', label: 'Panel', roles: ['ADMIN', 'RECEPCIONISTA', 'ENTRENADOR', 'CLIENTE'], render: (me) => <Dashboard me={me} /> },
  { key: 'users', label: 'Usuarios', roles: ['ADMIN'], render: () => <Users /> },
  { key: 'clients', label: 'Clientes', roles: ['ADMIN', 'RECEPCIONISTA'], render: () => <Clients /> },
  { key: 'memberships', label: 'Membresías', roles: ['ADMIN', 'RECEPCIONISTA', 'CLIENTE'], render: (me) => <Memberships me={me} /> },
  { key: 'access', label: 'Control de acceso', roles: ['RECEPCIONISTA', 'CLIENTE'], render: (me) => <Access me={me} /> },
  { key: 'trainers', label: 'Entrenadores', roles: ['ADMIN', 'ENTRENADOR'], render: (me) => <Trainers me={me} /> },
  { key: 'routines', label: 'Rutinas', roles: ['ENTRENADOR', 'CLIENTE'], render: (me) => <Routines me={me} /> },
  { key: 'classes', label: 'Clases', roles: ['ADMIN', 'ENTRENADOR', 'CLIENTE'], render: (me) => <Classes me={me} /> },
  { key: 'bookings', label: 'Reservas', roles: ['RECEPCIONISTA', 'CLIENTE'], render: (me) => <Bookings me={me} /> },
  { key: 'reports', label: 'Reportes', roles: ['ADMIN'], render: () => <Reports /> },
  { key: 'audit', label: 'Auditoría', roles: ['ADMIN'], render: () => <Audit /> },
];

function Login({ onLogin }: { onLogin: (m: Me) => void }) {
  const { box, run } = useNotice();
  return (
    <div className="login">
      <div>
        <h1>Sistema de Gestión Integral para Gimnasio</h1>
        <p>Clientes, membresías, accesos, rutinas, clases y reservas en un solo lugar.</p>
      </div>
      <Card title="Iniciar sesión">
        {box}
        <Form
          fields={[{ name: 'email', label: 'Correo', type: 'email', required: true }, { name: 'password', label: 'Contraseña', type: 'password', required: true }]}
          submitLabel="Entrar"
          onSubmit={(v) => run(async () => { const r = await api('/auth/login', { method: 'POST', body: v }); token.set(r.token); onLogin(r.user); }, 'Bienvenido.')}
        />
      </Card>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(!token.get());
  const [view, setView] = useState('panel');

  useEffect(() => {
    if (token.get()) api<Me>('/auth/me').then(setMe).catch(() => token.set(null)).finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  if (!me) return <Login onLogin={setMe} />;

  const items = MODULES.filter((m) => m.roles.includes(me.role));
  const current = items.find((m) => m.key === view) ?? items[0];
  return (
    <div className="app">
      <nav>
        <h1>Gimnasio</h1>
        {items.map((m) => <button key={m.key} className={m.key === current.key ? 'on' : ''} onClick={() => setView(m.key)}>{m.label}</button>)}
      </nav>
      <main>
        <header>
          <div><h2>{current.label}</h2><small>{me.name}, {ROLE_LABEL[me.role]}</small></div>
          <button className="btn" onClick={() => { token.set(null); setMe(null); setView('panel'); }}>Salir</button>
        </header>
        {current.render(me)}
      </main>
    </div>
  );
}

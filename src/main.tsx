import { type FormEvent, useEffect, useState } from 'react';
import { type Session, type SupabaseClient } from '@supabase/supabase-js';
import { createRoot } from 'react-dom/client';
import { createSupabaseClient } from './lib/supabase';
import './styles.css';
import './equipment-images.css';

type Equipment = { id: string; name: string; category: string; status: 'available' | 'maintenance' | 'loaned'; imageUrl: string | null };
type Loan = { id: string; equipmentId: string; equipmentName: string; dueAt: string };

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function App() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      const supabase = await createSupabaseClient();
      if (!active) return;

      setClient(supabase);
      setAuthReady(true);
      if (!supabase) return;

      const { data } = await supabase.auth.getSession();
      if (active) setSession(data.session);
      const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
      unsubscribe = () => subscription.subscription.unsubscribe();
    })();

    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => { if (session) void loadData(); }, [session]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
    }
    return response.json() as Promise<T>;
  }

  async function loadData(): Promise<void> {
    try {
      const [catalog, myLoans] = await Promise.all([api<Equipment[]>('/catalog'), api<Loan[]>('/loans')]);
      setEquipment(catalog);
      setLoans(myLoans);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!authReady) return;
    if (!client) return setMessage('Não foi possível carregar a configuração de acesso. Atualize a página e tente novamente.');

    setLoading(true);
    const { error } = await client.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage('E-mail ou senha inválidos.');
  }

  async function requestLoan(item: Equipment): Promise<void> {
    setLoading(true);
    try {
      await api<Loan>(`/loans/${item.id}`, { method: 'POST' });
      await loadData();
      setMessage('Empréstimo solicitado com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar o item.');
    } finally {
      setLoading(false);
    }
  }

  if (!session) {
    return <main className="login-shell">
      <section className="login-showcase" aria-label="Sobre o EMPREST.AI">
        <div className="brand"><span className="brand-mark" aria-hidden="true" /><span>EMPREST<span>.AI</span></span></div>
        <div className="login-copy"><p className="eyebrow">Operações de TI</p><h1>Empréstimos de equipamentos, sem planilha.</h1><p>Consulte o catálogo, solicite o que precisa e acompanhe seus itens em um só lugar.</p></div>
        <dl className="login-stats"><div><dt>5 itens</dt><dd>por pessoa</dd></div><div><dt>14 dias úteis</dt><dd>prazo padrão</dd></div><div><dt>0 planilhas</dt><dd>para preencher</dd></div></dl>
        <small>Operações · TI interno</small>
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={signIn}>
          <p className="eyebrow">Acesso seguro</p><h2>Entrar</h2><p className="form-lead">Use sua conta corporativa para acessar o catálogo.</p>
          <label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="nome@institutojef.org.br" required /></label>
          <label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>
          {message && <div className="notice" role="alert">{message}</div>}
          <button className="btn btn-primary" disabled={loading || !authReady}>{!authReady ? 'Preparando acesso…' : loading ? 'Entrando…' : 'Entrar'}</button>
          <p className="form-note">Cada pessoa vê apenas os próprios empréstimos.</p>
        </form>
      </section>
    </main>;
  }

  return <main className="app"><header><div><p>EMPREST.AI</p><h1>Catálogo de equipamentos</h1></div><button onClick={() => void client?.auth.signOut()}>Sair</button></header>{message && <div className="notice">{message}</div>}<section><h2>{equipment.filter((item) => item.status === 'available').length} equipamentos disponíveis</h2><div className="grid">{equipment.map((item) => <article className="card" key={item.id}><img className="image" src={item.imageUrl ?? ''} alt={item.name} /><small>{item.id}</small><h3>{item.name}</h3><p>{item.category}</p><strong className={item.status}>{item.status === 'available' ? 'Disponível' : item.status === 'maintenance' ? 'Em manutenção' : 'Emprestado'}</strong><button disabled={loading || item.status !== 'available'} onClick={() => void requestLoan(item)}>{item.status === 'available' ? 'Solicitar' : 'Indisponível'}</button></article>)}</div></section><section className="loans"><h2>Meus empréstimos ({loans.length} de 5)</h2>{loans.length === 0 ? <p>Nenhum empréstimo em aberto.</p> : <ul>{loans.map((loan) => <li key={loan.id}>{loan.equipmentName} <span>Devolução: {new Date(`${loan.dueAt}T00:00:00`).toLocaleDateString('pt-BR')}</span></li>)}</ul>}</section></main>;
}

createRoot(document.getElementById('root')!).render(<App />);

import { FormEvent, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';
import './equipment-images.css';

type Equipment = { id: string; name: string; category: string; status: 'available' | 'maintenance' | 'loaned'; imageUrl: string | null };
type Loan = { id: string; equipmentId: string; equipmentName: string; dueAt: string };

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) void loadData(); }, [session]);

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${session?.access_token ?? ''}` } });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? 'Não foi possível concluir a operação.');
    }
    return response.json() as Promise<T>;
  }

  async function loadData(): Promise<void> {
    try {
      const [catalog, myLoans] = await Promise.all([api<Equipment[]>('/catalog'), api<Loan[]>('/loans')]);
      setEquipment(catalog); setLoans(myLoans); setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados.'); }
  }

  async function signIn(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!supabase) return setMessage('Supabase não foi configurado neste ambiente.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMessage('E-mail ou senha inválidos.');
  }

  async function requestLoan(item: Equipment): Promise<void> {
    setLoading(true);
    try { await api<Loan>(`/loans/${item.id}`, { method: 'POST' }); await loadData(); setMessage('Empréstimo solicitado com sucesso.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível solicitar o item.'); }
    finally { setLoading(false); }
  }

  if (!session) return <main className="login"><section><p>EMPREST.AI</p><h1>Empréstimos de TI sem planilha.</h1><span>Até 5 itens por pessoa · prazo de 14 dias úteis</span></section><form onSubmit={signIn}><h2>Entrar</h2><label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required /></label><label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required /></label>{message && <div className="notice">{message}</div>}<button disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button></form></main>;

  return <main className="app"><header><div><p>EMPREST.AI</p><h1>Catálogo de equipamentos</h1></div><button onClick={() => supabase?.auth.signOut()}>Sair</button></header>{message && <div className="notice">{message}</div>}<section><h2>{equipment.filter((item) => item.status === 'available').length} equipamentos disponíveis</h2><div className="grid">{equipment.map((item) => <article className="card" key={item.id}><img className="image" src={item.imageUrl ?? ''} alt={item.name} /><small>{item.id}</small><h3>{item.name}</h3><p>{item.category}</p><strong className={item.status}>{item.status === 'available' ? 'Disponível' : item.status === 'maintenance' ? 'Em manutenção' : 'Emprestado'}</strong><button disabled={loading || item.status !== 'available'} onClick={() => void requestLoan(item)}>{item.status === 'available' ? 'Solicitar' : 'Indisponível'}</button></article>)}</div></section><section className="loans"><h2>Meus empréstimos ({loans.length} de 5)</h2>{loans.length === 0 ? <p>Nenhum empréstimo em aberto.</p> : <ul>{loans.map((loan) => <li key={loan.id}>{loan.equipmentName} <span>Devolução: {new Date(`${loan.dueAt}T00:00:00`).toLocaleDateString('pt-BR')}</span></li>)}</ul>}</section></main>;
}

createRoot(document.getElementById('root')!).render(<App />);

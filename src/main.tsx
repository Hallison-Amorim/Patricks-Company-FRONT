import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './equipment-images.css';

type Equipment = { id: string; name: string; category: string; status: 'available' | 'maintenance' | 'loaned'; imageUrl?: string | null };

const initialEquipment: Equipment[] = [
  ['TI-0001','Notebook 14 polegadas','Notebook','available'], ['TI-0002','Notebook 15 polegadas','Notebook','available'], ['TI-0003','Notebook 13 polegadas','Notebook','available'], ['TI-0004','Notebook 15 polegadas','Notebook','maintenance'],
  ['TI-0005','Monitor 24 polegadas','Monitor','available'], ['TI-0006','Monitor 27 polegadas','Monitor','available'], ['TI-0007','Monitor 22 polegadas','Monitor','maintenance'], ['TI-0008','Cabo HDMI 2 m','Cabo','available'],
  ['TI-0009','Cabo USB-C 1 m','Cabo','available'], ['TI-0010','Cabo de rede 3 m','Cabo','maintenance'], ['TI-0011','Webcam Full HD','Câmera','available'], ['TI-0012','Câmera compacta','Câmera','available'],
].map(([id, name, category, status]) => ({ id, name, category, status: status as Equipment['status'], imageUrl: `/equipment/${id.toLowerCase()}.jpg` }));
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

function dueDate() { const date = new Date(); date.setDate(date.getDate() + 14); return date.toLocaleDateString('pt-BR'); }
function imageSource(item: Equipment) { return item.imageUrl?.startsWith('http') ? item.imageUrl : `/equipment/${item.id.toLowerCase()}.jpg`; }

function App() {
  const [equipment, setEquipment] = useState(initialEquipment);
  const [loans, setLoans] = useState<Equipment[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => { fetch(`${apiUrl}/catalog`).then((response) => response.ok ? response.json() : Promise.reject()).then((items: Equipment[]) => setEquipment(items.map((item) => ({ ...item, imageUrl: imageSource(item) })))).catch(() => setMessage('API indisponível: exibindo catálogo local temporário.')); }, []);
  async function request(item: Equipment) {
    if (loans.length >= 3) return setMessage('Você atingiu o limite de 3 empréstimos em aberto.');
    if (item.status !== 'available') return setMessage('Este equipamento não está disponível para empréstimo.');
    try { const response = await fetch(`${apiUrl}/loans/${item.id}`, { method: 'POST' }); if (!response.ok) throw new Error(); const loan = await response.json(); setLoans((current) => [...current, item]); setEquipment((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'loaned' } : entry)); setMessage(`${item.name} solicitado. Devolução prevista: ${new Date(`${loan.dueAt}T00:00:00`).toLocaleDateString('pt-BR')}.`); } catch { setMessage('Não foi possível registrar o empréstimo na API.'); }
  }
  return <main className="app"><header><p>EMPREST.AI</p><h1>Catálogo de equipamentos</h1><span>Colaborador</span></header>{message && <div className="notice">{message}</div>}<section><h2>Disponíveis e manutenção</h2><div className="grid">{equipment.map((item) => <article className="card" key={item.id}><img className="image" src={imageSource(item)} alt={item.name} /><small>{item.id}</small><h3>{item.name}</h3><p>{item.category}</p><strong className={item.status}>{item.status === 'available' ? 'Disponível' : item.status === 'maintenance' ? 'Em manutenção' : 'Emprestado'}</strong><button disabled={item.status !== 'available' || loans.length >= 3} onClick={() => request(item)}>Solicitar</button></article>)}</div></section><section className="loans"><h2>Meus empréstimos</h2>{loans.length === 0 ? <p>Nenhum empréstimo em aberto.</p> : <ul>{loans.map((item) => <li key={item.id}>{item.name} <span>Devolução: {dueDate()}</span></li>)}</ul>}<a href="https://pixabay.com" target="_blank" rel="noreferrer">Fotos: Pixabay</a></section></main>;
}

createRoot(document.getElementById('root')!).render(<App />);

"use client";

// reúne a merenda por dia e os cardápios de compra dos setores habilitados
import { useState } from "react";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
import { datasEntre, diaDaSemana, formatarDia, hojeNoParana } from "../servicos/calendario";
import { nomesModulos, type ModulosPortal, type ItemCardapio } from "../servicos/tipos";

export default function CantinaPublica({ modulos }: { modulos: ModulosPortal }) {
  const setores = (["merenda", "apmf", "gecep", "robotica"] as const).filter((chave) => modulos[chave]);
  const [setor, setSetor] = useState<string>(setores[0] || "");
  const [data, setData] = useState(hojeNoParana()); const [turno, setTurno] = useState("");
  const { dados, carregando, erro } = useConteudoPublico("cardapios", []);
  const itens = dados.filter((item) => item.categoria === setor && (!turno || item.turno === "todos" || item.turno === turno));
  const segunda = new Date(`${data}T12:00:00Z`); segunda.setUTCDate(segunda.getUTCDate() - (diaDaSemana(data) + 6) % 7);
  const inicio = segunda.toISOString().slice(0, 10); segunda.setUTCDate(segunda.getUTCDate() + 6); const fim = segunda.toISOString().slice(0, 10);
  function mudarSemana(quantidade: number) { const dia = new Date(`${data}T12:00:00Z`); dia.setUTCDate(dia.getUTCDate() + quantidade * 7); setData(dia.toISOString().slice(0, 10)); }
  return <div className="limite pagina-conteudo servicos-portal"><nav className="atalhos-servicos" aria-label="Setores da cantina">{setores.map((chave) => <button type="button" key={chave} aria-pressed={setor === chave} onClick={() => setSetor(chave)}>{nomesModulos[chave]} <span>›</span></button>)}</nav>
    {!setores.length ? <p className="sem-resultados">Nenhum setor disponível no momento.</p> : <section className="servico-bloco"><span className="rotulo-secao">ALIMENTAÇÃO NO COLÉGIO</span><h2>{nomesModulos[setor as keyof ModulosPortal]}</h2><p>{setor === "merenda" ? "Veja o que está previsto para cada dia e turno. O cardápio pode ser atualizado pela equipe." : "Produtos e valores informados pelo setor responsável. Consulte a disponibilidade no local."}</p>
      <div className="form-servico filtros-cantina"><label>Data de referência<input type="date" value={data} required onChange={(evento) => { if (evento.target.value) setData(evento.target.value); }} /></label><label>Turno<select value={turno} onChange={(evento) => setTurno(evento.target.value)}><option value="">Todos os turnos</option><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label></div>
      {erro && <p className="erro-painel" role="alert">{erro}</p>}{carregando && <p role="status">Carregando cardápio…</p>}
      {setor === "merenda" ? <><div className="semana-cantina"><button type="button" className="botao-cinza-pequeno" onClick={() => mudarSemana(-1)}>‹ Semana anterior</button><strong>{formatarDia(inicio)} a {formatarDia(fim)}</strong><button type="button" className="botao-cinza-pequeno" onClick={() => mudarSemana(1)}>Próxima semana ›</button></div><div className="grade-merenda">{datasEntre(inicio, fim).map((dia) => <article key={dia}><header><strong>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${dia}T12:00:00Z`))}</strong><span>{formatarDia(dia)}</span></header>{itens.filter((item) => item.data <= dia && item.dataFim >= dia).map((item) => <ProdutoCantina key={item.id} item={item} />)}{!carregando && !itens.some((item) => item.data <= dia && item.dataFim >= dia) && <p>Cardápio não informado.</p>}</article>)}</div></> : <div className="grade-produtos">{itens.filter((item) => item.data <= data && item.dataFim >= data).map((item) => <ProdutoCantina key={item.id} item={item} />)}{!carregando && !itens.some((item) => item.data <= data && item.dataFim >= data) && <p>Nenhum item disponível nesta data.</p>}</div>}
    </section>}</div>;
}

// mantém os turnos junto dos pratos e dos valores
function ProdutoCantina({ item }: { item: ItemCardapio }) { return <div className="produto-cantina">{item.imagemUrl && <img src={item.imagemUrl} alt={item.titulo} loading="lazy" />}<small>{item.turno === "todos" ? "Todos os turnos" : item.turno === "manha" ? "Manhã" : item.turno === "tarde" ? "Tarde" : "Noite"}</small><h3>{item.titulo}</h3><p>{item.descricao}</p>{item.categoria !== "merenda" && item.preco && <strong className="preco-cantina">{Number(item.preco.replace(",", ".")).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>}</div>; }

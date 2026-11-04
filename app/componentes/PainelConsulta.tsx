"use client";

// oferece a leitura dos registros sem mostrar botões de edição
import { useEffect, useState } from "react";
import { ListaBiblioteca } from "./BibliotecaArquivos";
import { configuracaoPainel } from "../conteudo/campos-painel";
import type { TipoConteudo } from "../conteudo/tipos";
import type { RecursoPainel } from "../lib/cargos";

export default function PainelConsulta({ recurso, publicos = false }: { recurso: RecursoPainel; publicos?: boolean }) {
  const [itens, setItens] = useState<Record<string, unknown>[]>([]);
  const [erro, setErro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [detalhe, setDetalhe] = useState<Record<string, unknown> | null>(null);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    if (["arquivos", "mapa"].includes(recurso)) return;
    const controle = new AbortController();
    const conteudo = ["noticias", "projetos", "documentos", "movimentos"].includes(recurso);
    const url = conteudo ? `/api/conteudo?tipo=${recurso}${publicos ? "" : "&todos=1"}` : `/api/${recurso}?pagina=${pagina}&limite=20${publicos ? "" : "&todos=1"}`;
    fetch(url, { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar os registros.");
      setItens(dados.itens || []); setTotalPaginas(dados.totalPaginas || dados.paginacao?.totalPaginas || 1);
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); }).finally(() => setCarregando(false));
    return () => controle.abort();
  }, [recurso, publicos, pagina]);
  async function abrir(item: Record<string, unknown>) {
    if (item.dados) { setDetalhe(item.dados as Record<string, unknown>); return; }
    if (["reunioes", "representantes", "eventos"].includes(recurso)) {
      try {
        const resposta = await fetch(`/api/${recurso}/${item.id}${publicos ? "" : "?todos=1"}`, { cache: "no-store" });
        const dados = await resposta.json(); if (!resposta.ok) throw new Error(dados.erro); setDetalhe(dados.item);
      } catch { setErro("Não foi possível abrir os detalhes."); }
    } else setDetalhe(item);
  }
  const titulo = configuracaoPainel[recurso as TipoConteudo]?.nome || ({ reunioes: "Reuniões, atas e presenças", representantes: "Representantes", eventos: "Eventos internos", arquivos: "Biblioteca de arquivos" } as Record<string, string>)[recurso] || "Consulta";
  return <section className="consulta-painel"><header className="topo-painel"><div><span className="rotulo-secao">SOMENTE CONSULTA</span><h1>{titulo}</h1><p>Seu cargo permite consultar estes registros. A edição fica com as áreas responsáveis.</p></div></header>{erro && <p role="alert">{erro}</p>}{recurso === "mapa" ? <p><a className="pev-botao" href="/mapa-do-colegio">Consultar mapa e turmas publicadas</a></p> : recurso === "arquivos" ? <ListaBiblioteca /> : <>{carregando && <p>Carregando registros...</p>}<div className="lista-painel">{itens.map((item) => <article key={String(item.id)}><div><h3>{String(item.titulo || item.nome || "Registro")}</h3><p>{String(item.data || item.atualizadoEm || "")}</p></div><button type="button" onClick={() => void abrir(item)}>Consultar detalhes</button></article>)}</div>{!carregando && !itens.length && <p>Nenhum registro disponível.</p>}{totalPaginas > 1 && <div className="acoes-formulario-painel"><button type="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>Página {pagina} de {totalPaginas}</span><button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}>Próxima</button></div>}{detalhe && <div className="detalhes-consulta"><h2>Detalhes do registro</h2><CamposConsulta dados={detalhe} /><button type="button" className="pev-botao" onClick={() => setDetalhe(null)}>Fechar detalhes</button></div>}</>}</section>;
}
function CamposConsulta({ dados }: { dados: Record<string, unknown> }) {
  return <dl>{Object.entries(dados).filter(([chave, valor]) => valor !== "" && valor !== null && valor !== undefined && !["id", "slug", "areaResponsavel"].includes(chave)).map(([chave, valor]) => <div key={chave}><dt>{chave.replace(/([A-Z])/g, " $1").replace(/^./, (letra) => letra.toUpperCase())}</dt><dd>{typeof valor === "object" ? Array.isArray(valor) ? valor.map((item, indice) => <div key={indice}>{typeof item === "object" && item ? <CamposConsulta dados={item} /> : String(item)}</div>) : <CamposConsulta dados={valor as Record<string, unknown>} /> : typeof valor === "boolean" ? valor ? "Sim" : "Não" : typeof valor === "string" && /^(\/(?!\/)|https?:\/\/)/.test(valor) ? <a href={valor} target="_blank" rel="noreferrer">Abrir arquivo ou endereço ↗</a> : String(valor)}</dd></div>)}</dl>;
}

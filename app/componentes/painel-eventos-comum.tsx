"use client";

import { useEffect } from "react";

export type Identificador = number | string;
export type RegistroFlexivel = Record<string, unknown> & { id: Identificador };
export type AoMudarEstadoSujo = (sujo: boolean) => void;

let navegacaoAutorizadaAte = 0;

export const turnosPainel = [
  ["", "Todos os turnos"],
  ["manha", "Manhã"],
  ["tarde", "Tarde"],
  ["noite", "Noite"],
] as const;

export const niveisPainel = [
  ["", "Todos os níveis"],
  ["fundamental", "Ensino Fundamental"],
  ["medio", "Ensino Médio"],
  ["outro", "Outro"],
] as const;

export async function requisitarPainel<T>(url: string, opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch(url, opcoes);
  const tipo = resposta.headers.get("content-type") ?? "";
  const resultado = tipo.includes("application/json")
    ? await resposta.json() as T & { erro?: string; mensagem?: string }
    : {} as T & { erro?: string; mensagem?: string };
  if (!resposta.ok) {
    throw new Error(resultado.erro || resultado.mensagem || "Não foi possível concluir a operação.");
  }
  return resultado;
}

export function corpoJson(valor: unknown): RequestInit {
  return {
    headers: { "content-type": "application/json" },
    body: JSON.stringify(valor),
  };
}

export function extrairLista<T>(resultado: unknown, chaves: string[]): T[] {
  if (Array.isArray(resultado)) return resultado as T[];
  if (!resultado || typeof resultado !== "object") return [];
  const objeto = resultado as Record<string, unknown>;
  for (const chave of ["itens", ...chaves]) {
    if (Array.isArray(objeto[chave])) return objeto[chave] as T[];
  }
  return [];
}

// As coleções administrativas são paginadas no servidor. Os painéis precisam
// percorrer todas as páginas para que registros antigos não desapareçam dos
// filtros e da edição quando a base ultrapassar o primeiro lote.
export async function requisitarTodasPaginasPainel<T>(url: string, chaves: string[], limite = 100): Promise<T[]> {
  const itens: T[] = [];
  let pagina = 1;
  while (pagina <= 10_000) {
    const separador = url.includes("?") ? "&" : "?";
    const resultado = await requisitarPainel<unknown>(`${url}${separador}pagina=${pagina}&limite=${limite}`);
    const lote = extrairLista<T>(resultado, chaves);
    itens.push(...lote);
    const paginacao = resultado && typeof resultado === "object"
      ? (resultado as Record<string, unknown>).paginacao
      : null;
    const totalPaginas = paginacao && typeof paginacao === "object"
      ? Number((paginacao as Record<string, unknown>).totalPaginas)
      : 0;
    if ((Number.isFinite(totalPaginas) && pagina >= totalPaginas) || lote.length < limite) return itens;
    pagina += 1;
  }
  throw new Error("A lista administrativa excedeu o limite seguro de páginas.");
}

export function obterTexto(registro: Record<string, unknown>, ...chaves: string[]) {
  for (const chave of chaves) {
    const valor = registro[chave];
    if (typeof valor === "string" && valor.trim()) return valor;
    if (typeof valor === "number") return String(valor);
  }
  return "";
}

export function obterBooleano(registro: Record<string, unknown>, chave: string, padrao = false) {
  const valor = registro[chave];
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  if (typeof valor === "string") return ["1", "true", "sim", "publicado", "ativo"].includes(valor.toLowerCase());
  return padrao;
}

export function obterNumero(registro: Record<string, unknown>, chave: string) {
  const valor = Number(registro[chave]);
  return Number.isFinite(valor) ? valor : 0;
}

export function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();
}

export function dataLegivel(valor?: string) {
  if (!valor) return "Data não informada";
  const data = new Date(valor.length === 10 ? `${valor}T12:00:00` : valor.replace(" ", "T"));
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function statusLegivel(valor?: string) {
  if (!valor) return "Rascunho";
  const mapa: Record<string, string> = {
    rascunho: "Rascunho", publicado: "Publicado", agendado: "Agendado", futuro: "Próximo",
    em_andamento: "Em andamento", acontecendo: "Acontecendo agora", encerrado: "Encerrado",
    adiado: "Adiado", cancelado: "Cancelado", arquivado: "Arquivado", ativo: "Ativo",
    inativo: "Inativo", agendada: "Agendada", realizada: "Realizada", wo: "W.O.",
    data_a_definir: "Data a definir", ausente_justificado: "Ausência justificada",
    nao_se_aplica: "Não se aplica",
  };
  return mapa[valor] ?? valor.replaceAll("_", " ").replace(/^./, (letra) => letra.toUpperCase());
}

export function classeStatus(valor?: string) {
  return `pev-status pev-status--${(valor || "rascunho").replace(/[^a-z0-9_-]/gi, "-")}`;
}

export function criarSlug(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

export function useAvisoMudancas(mudou: boolean, aoMudarEstadoSujo?: AoMudarEstadoSujo) {
  useEffect(() => {
    aoMudarEstadoSujo?.(mudou);
  }, [aoMudarEstadoSujo, mudou]);

  useEffect(() => () => {
    aoMudarEstadoSujo?.(false);
  }, [aoMudarEstadoSujo]);

  useEffect(() => {
    // Quando existe um contêiner, ele registra um único aviso para todos os
    // painéis. O uso isolado mantém o comportamento anterior do componente.
    if (!mudou || aoMudarEstadoSujo) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      if (Date.now() <= navegacaoAutorizadaAte) return;
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [aoMudarEstadoSujo, mudou]);
}

export function confirmarSaida(mudou: boolean) {
  return !mudou || window.confirm("Há mudanças não salvas. Deseja descartá-las?");
}

// Evita um segundo diálogo nativo logo após a confirmação explícita de um
// link que deixa o painel. A autorização expira rapidamente e não interfere
// em recarregamentos ou fechamentos posteriores.
export function autorizarNavegacaoPainel() {
  navegacaoAutorizadaAte = Date.now() + 1_000;
}

export async function enviarArquivoPainel(arquivo: File, visibilidade: "publica" | "privada" = "publica") {
  const dados = new FormData();
  dados.append("arquivo", arquivo);
  dados.append("visibilidade", visibilidade);
  return requisitarPainel<{ url: string; nome?: string }>("/api/arquivos", { method: "POST", body: dados });
}

export function MensagensPainel({ erro, sucesso }: { erro?: string; sucesso?: string }) {
  return (
    <div className="pev-mensagens" aria-live="polite">
      {erro && <p className="pev-aviso pev-aviso--erro" role="alert">{erro}</p>}
      {sucesso && <p className="pev-aviso pev-aviso--sucesso" role="status">{sucesso}</p>}
    </div>
  );
}

export function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="pev-vazio"><strong>{titulo}</strong><p>{texto}</p></div>;
}

export function CabecalhoPainel({ rotulo, titulo, descricao, acao, nomeAcao }: {
  rotulo: string;
  titulo: string;
  descricao: string;
  acao?: () => void;
  nomeAcao?: string;
}) {
  return (
    <header className="pev-cabecalho">
      <div><span>{rotulo}</span><h1>{titulo}</h1><p>{descricao}</p></div>
      {acao && nomeAcao && <button type="button" className="pev-botao pev-botao--primario" onClick={acao}>{nomeAcao}</button>}
    </header>
  );
}

export function Campo({ rotulo, dica, largo, children }: {
  rotulo: string;
  dica?: string;
  largo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={largo ? "pev-campo pev-campo--largo" : "pev-campo"}>
      <span>{rotulo}</span>
      {children}
      {dica && <small>{dica}</small>}
    </label>
  );
}

export function BotaoPerigoso({ children, onClick, disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return <button type="button" className="pev-botao pev-botao--perigoso" onClick={onClick} disabled={disabled}>{children}</button>;
}

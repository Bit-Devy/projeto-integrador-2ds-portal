"use client";

export function EstadoCarregando({ texto = "Carregando informações publicadas…" }: { texto?: string }) {
  return <div className="estado-consulta estado-carregando" role="status"><span aria-hidden="true" /><p>{texto}</p></div>;
}

export function EstadoErro({ mensagem, tentarNovamente }: { mensagem: string; tentarNovamente: () => void }) {
  return (
    <div className="estado-consulta estado-erro" role="alert">
      <strong>As informações estão temporariamente indisponíveis.</strong>
      <p>{mensagem}</p>
      <button type="button" onClick={tentarNovamente}>Tentar novamente</button>
    </div>
  );
}

export function EstadoVazio({ titulo, texto }: { titulo: string; texto: string }) {
  return <div className="estado-consulta estado-vazio"><strong>{titulo}</strong><p>{texto}</p></div>;
}

export function PaginacaoPublica({ pagina, totalPaginas, aoMudar }: { pagina: number; totalPaginas: number; aoMudar: (pagina: number) => void }) {
  if (totalPaginas <= 1) return null;
  return (
    <nav className="paginacao-eventos" aria-label="Navegação entre páginas de resultados">
      <button type="button" disabled={pagina <= 1} onClick={() => aoMudar(Math.max(1, pagina - 1))}>‹ Página anterior</button>
      <span>Página {pagina} de {totalPaginas}</span>
      <button type="button" disabled={pagina >= totalPaginas} onClick={() => aoMudar(Math.min(totalPaginas, pagina + 1))}>Próxima página ›</button>
    </nav>
  );
}

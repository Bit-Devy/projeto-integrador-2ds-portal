"use client";

// consulta os destinos do botão sem precisar digitar o endereço de cada página
import { useEffect, useState } from "react";

export default function SeletorPagina({ valor, mudar }: { valor: string; mudar: (url: string) => void }) {
  const [paginas, setPaginas] = useState<{ url: string; nome: string }[]>([]);
  const [erro, setErro] = useState("");
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/paginas", { signal: controle.signal, cache: "no-store" }).then(async (resposta) => {
      if (!resposta.ok) throw new Error("Não foi possível carregar as páginas.");
      const dados = await resposta.json(); setPaginas(dados.itens);
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); });
    return () => controle.abort();
  }, []);
  return <><select value={valor} onChange={(evento) => mudar(evento.target.value)} required><option value="">Escolha uma página publicada</option>{valor && !paginas.some((pagina) => pagina.url === valor) && <option value={valor}>{valor}</option>}{paginas.map((pagina) => <option value={pagina.url} key={pagina.url}>{pagina.nome}</option>)}</select>{erro && <small role="alert">{erro}</small>}</>;
}

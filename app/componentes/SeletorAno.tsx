"use client";

// importa os anos disponíveis no histórico
import { anosDisponiveis } from "../conteudo/periodos";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// permite trocar o período sem excluir as publicações anteriores
export default function SeletorAno({ id, ano, datas, alterar, aceitarTodos = true, rotuloTodos = "Todos os anos" }: { id: string; ano: string; datas: string[]; alterar: (ano: string) => void; aceitarTodos?: boolean; rotuloTodos?: string }) {
  const numero = Number(ano);
  const caixa = useRef<HTMLDetailsElement>(null);
  const caminho = usePathname();

  // fecha a escolha ao sair do controle ou navegar para outra página
  useEffect(() => {
    const controle = caixa.current;
    if (!controle) return;
    const fechar = () => { controle.open = false; };
    const clicarFora = (evento: PointerEvent) => {
      if (evento.target instanceof Node && !controle.contains(evento.target)) fechar();
    };
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape" || !controle.open) return;
      fechar();
      if (controle.contains(document.activeElement)) controle.querySelector("summary")?.focus();
    };
    fechar();
    window.addEventListener("pagehide", fechar);
    window.addEventListener("pageshow", fechar);
    window.addEventListener("popstate", fechar);
    document.addEventListener("pointerdown", clicarFora);
    controle.addEventListener("keydown", escapar);
    return () => {
      fechar();
      window.removeEventListener("pagehide", fechar);
      window.removeEventListener("pageshow", fechar);
      window.removeEventListener("popstate", fechar);
      document.removeEventListener("pointerdown", clicarFora);
      controle.removeEventListener("keydown", escapar);
    };
  }, [caminho]);

  function escolher(valor: string) {
    if (caixa.current) caixa.current.open = false;
    caixa.current?.querySelector("summary")?.focus({ preventScroll: true });
    alterar(valor);
  }

  return <details ref={caixa} className="periodo-recolhido">
    <summary><span>Ano: <strong>{ano === "todos" ? "todos" : ano}</strong></span><span className="seta-seletor-ano" aria-hidden="true" /></summary>
    <nav className="seletor-ano" aria-label="Período das publicações">
      <label htmlFor={id}>Escolher ano
        <select id={id} value={ano} onChange={(evento) => escolher(evento.target.value)}>
          {aceitarTodos && <option value="todos">{rotuloTodos}</option>}
          {anosDisponiveis(datas, ano).map((valor) => <option key={valor} value={valor}>{valor}</option>)}
        </select>
      </label>
      <div className="acoes-seletor-ano">
        <button type="button" disabled={ano === "todos" || numero <= 1900} onClick={() => escolher(String(numero - 1))}>‹ Ano anterior</button>
        <button type="button" disabled={ano === "todos" || numero >= 2199} onClick={() => escolher(String(numero + 1))}>Próximo ano ›</button>
      </div>
    </nav>
  </details>;
}

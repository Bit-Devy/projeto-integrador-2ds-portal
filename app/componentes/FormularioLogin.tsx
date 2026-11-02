// ativa os recursos do navegador
"use client";

// importa o controle do envio e os limites do servidor
import { useState } from "react";
import { useLimiteNavegador } from "../lib/useLimiteNavegador";
// importa o aviso de espera
import AvisoLimite from "./AvisoLimite";

// mantém o login desativado durante o bloqueio deste navegador
export default function FormularioLogin({ retorno, erro }: { retorno: string; erro?: string }) {
  const { limite, liberarEm, carregando, erroConsulta, atualizar } = useLimiteNavegador("login");
  const [enviando, setEnviando] = useState(false);
  const desativado = carregando || Boolean(erroConsulta) || Boolean(limite?.bloqueado) || enviando;

  return <>
    {/* explica quando uma nova tentativa será permitida */}
    <AvisoLimite limite={limite} liberarEm={liberarEm} />
    {erroConsulta && <p className="erro-login" role="alert">{erroConsulta} <button type="button" onClick={() => { void atualizar(); }}>Tentar novamente</button></p>}
    {erro === "1" && !limite?.bloqueado && <p className="erro-login" role="alert">Senha incorreta. Confira a senha antes de tentar novamente.</p>}
    {/* envia a senha apenas quando o navegador está liberado */}
    <form action="/api/login" method="post" onSubmit={(evento) => {
      if (desativado) evento.preventDefault();
      else setEnviando(true);
    }}>
      <input type="hidden" name="returnTo" value={retorno} />
      <label>
        <span>Senha administrativa</span>
        <input type="password" name="senha" autoComplete="current-password" required disabled={desativado && !enviando} />
      </label>
      <button type="submit" disabled={desativado}>{enviando ? "Entrando..." : carregando ? "Aguarde..." : "Entrar"}</button>
    </form>
  </>;
}

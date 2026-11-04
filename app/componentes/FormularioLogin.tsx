// ativa os recursos do navegador
"use client";

// importa o controle do envio e os limites do servidor
import { useState } from "react";
import { useLimiteNavegador } from "../lib/useLimiteNavegador";
// importa o aviso de espera
import AvisoLimite from "./AvisoLimite";
import CheckboxComAjuda from "./CheckboxComAjuda";

// mantém o login desativado durante o bloqueio deste navegador
export default function FormularioLogin({ retorno, erro, geralInicial = false }: { retorno: string; erro?: string; geralInicial?: boolean }) {
  const { limite, liberarEm, carregando, erroConsulta, atualizar } = useLimiteNavegador("login");
  const [geral, setGeral] = useState(geralInicial);
  const [enviando, setEnviando] = useState(false);
  const desativado = carregando || Boolean(erroConsulta) || Boolean(limite?.bloqueado) || enviando;

  return <>
    {/* explica quando uma nova tentativa será permitida */}
    <AvisoLimite limite={limite} liberarEm={liberarEm} />
    {erroConsulta && <p className="erro-login" role="alert">{erroConsulta} <button type="button" onClick={() => { void atualizar(); }}>Tentar novamente</button></p>}
    {erro === "1" && !limite?.bloqueado && <p className="erro-login" role="alert">Senha ou modo de acesso incorreto. Para uma senha geral, marque Acesso geral.</p>}
    {/* envia a senha apenas quando o navegador está liberado */}
    <form action="/api/login" method="post" onSubmit={(evento) => {
      if (desativado) evento.preventDefault();
      else setEnviando(true);
    }}>
      <input type="hidden" name="returnTo" value={retorno} />
      <label>
        <span>Senha de acesso</span>
        <input type="password" name="senha" autoComplete="current-password" required disabled={desativado && !enviando} />
      </label>
      <label className="entrada-acesso-geral"><CheckboxComAjuda name="geral" value="1" checked={geral} onChange={(evento) => setGeral(evento.target.checked)} explicacao="Marque para usar uma senha da administração geral e abrir o painel completo, incluindo o registro de senhas. Desmarcado, a senha identifica seu cargo e libera apenas suas áreas." aria-label="Acesso geral" disabled={desativado && !enviando} /><span>Acesso geral</span></label>
      <button type="submit" disabled={desativado}>{enviando ? "Entrando..." : carregando ? "Aguarde..." : "Entrar"}</button>
    </form>
  </>;
}

"use client";

// mantém a revisão e a senha de confirmação apenas enquanto a janela está aberta
import { useEffect, useRef, useState } from "react";
import { cargosPainel, type CargoPainel } from "../lib/cargos";
import { useAvisoMudancas, confirmarSaida, type AoMudarEstadoSujo } from "./painel-eventos-comum";
import { ajudaLogin, ajudaSenha, padraoLogin, padraoSenha } from "../lib/regras-acesso";

type Acesso = { id: number; cargo: string; vaga: number; nome: string; login: string; loginAmbiente: number; atualizadoEm: string };
type Historico = { autor: string; acao: string; cargo: string; criadoEm: string };
type Operacao = { tipo: "POST" | "PUT" | "DELETE"; cargo: CargoPainel; acesso?: Acesso };
export default function PainelSenhas({ aoMudarEstadoSujo }: { aoMudarEstadoSujo: AoMudarEstadoSujo }) {
  const [itens, setItens] = useState<Acesso[]>([]);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [acessoAtual, setAcessoAtual] = useState(0);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [operacao, setOperacao] = useState<Operacao | null>(null);
  const [etapa, setEtapa] = useState<"editar" | "revisar" | "resultado">("editar");
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [senhaGerada, setSenhaGerada] = useState("");
  const [sair, setSair] = useState(false);
  const [proprioAlterado, setProprioAlterado] = useState(false);
  const janela = useRef<HTMLDialogElement>(null);
  const [mudou, setMudou] = useState(false);
  useAvisoMudancas(Boolean(mudou && operacao && etapa !== "resultado"), aoMudarEstadoSujo);
  async function carregar() {
    const resposta = await fetch("/api/acessos", { cache: "no-store" });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar os acessos.");
    setItens(dados.itens); setHistorico(dados.historico); setAcessoAtual(dados.acessoAtual);
  }
  useEffect(() => {
    const controle = new AbortController();
    fetch("/api/acessos", { cache: "no-store", signal: controle.signal }).then(async (resposta) => {
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar os acessos.");
      setItens(dados.itens); setHistorico(dados.historico); setAcessoAtual(dados.acessoAtual);
    }).catch((falha) => { if (falha.name !== "AbortError") setErro(falha.message); });
    return () => controle.abort();
  }, []);
  useEffect(() => { if (operacao) janela.current?.showModal(); }, [operacao]);
  function abrir(tipo: Operacao["tipo"], cargo: CargoPainel, acesso?: Acesso) {
    setMudou(false);
    setErro(""); setNome(acesso?.nome || ""); setLogin(acesso?.login || ""); setSenhaAtual(""); setNovaSenha(""); setSenhaGerada(""); setSair(false); setProprioAlterado(false); setEtapa("editar"); setOperacao({ tipo, cargo, acesso });
  }
  async function fechar() {
    if (ocupado) return;
    if (etapa !== "resultado" && !await confirmarSaida(mudou)) return;
    setMudou(false);
    janela.current?.close(); setOperacao(null); setSenhaAtual(""); setNovaSenha(""); setSenhaGerada("");
    if (sair) window.location.assign("/login");
    else if (proprioAlterado) window.location.assign("/painel");
  }
  async function confirmar() {
    if (!operacao || ocupado) return;
    setOcupado(true); setErro("");
    try {
      const resposta = await fetch("/api/acessos", { method: operacao.tipo, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: operacao.acesso?.id, cargo: operacao.cargo.chave, nome, login, senhaAtual, novaSenha, confirmado: true }) });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível alterar o acesso.");
      setSenhaGerada(dados.senha || ""); setSenhaAtual(""); setNovaSenha(""); setSair(Boolean(dados.sair)); setProprioAlterado(operacao.tipo === "PUT" && operacao.acesso?.id === acessoAtual); setEtapa("resultado");
      if (!dados.sair) await carregar();
    } catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível salvar."); setEtapa("editar"); }
    finally { setOcupado(false); }
  }
  return <section className="painel-senhas">
    <header className="topo-painel"><div><span className="rotulo-secao">ACESSO GERAL</span><h1>Registro de senhas</h1><p>Até duas senhas por cargo e três para a administração geral. Cada alteração passa por revisão e confirmação da sua senha.</p></div></header>
    {erro && !operacao && <p className="erro-painel" role="alert">{erro}</p>}
    <label className="busca-cargos">Localizar cargo<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Ex.: esporte, tesoureiro ou secretário" /></label>
    <div className="grade-senhas">{cargosPainel.filter((cargo) => `${cargo.nome} ${cargo.descricao}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))).map((cargo) => {
      const acessos = itens.filter((item) => item.cargo === cargo.chave);
      const maximo = cargo.chave === "geral" ? 3 : 2;
      return <article key={cargo.chave} className={cargo.chave === "geral" ? "cargo-geral" : ""}>
        <span className="rotulo-secao">{cargo.artigo} · {acessos.length}/{maximo} senhas</span><h2>{cargo.nome}</h2><p>{cargo.descricao}</p>
        {acessos.map((item) => <div className="senha-cadastrada" key={item.id}><strong>{item.nome}{item.id === acessoAtual ? " · seu acesso" : ""}</strong><small>Login: {item.login}{item.loginAmbiente ? " · definido na configuração" : ""}</small><small>Senha {item.vaga} · protegida, não pode ser consultada</small><div><button type="button" onClick={() => abrir("PUT", cargo, item)}>Editar login e senha</button><button type="button" onClick={() => abrir("DELETE", cargo, item)} disabled={cargo.chave === "geral" && acessos.length === 1}>Revogar acesso</button></div></div>)}
        <button type="button" className="pev-botao" disabled={acessos.length >= maximo} onClick={() => abrir("POST", cargo)}>Criar senha</button>
      </article>;
    })}</div>
    <details className="historico-senhas"><summary>Últimas alterações de acesso</summary>{historico.length ? <ul>{historico.map((item, indice) => <li key={indice}>{item.autor} {item.acao} · {cargosPainel.find((cargo) => cargo.chave === item.cargo)?.nome} · {item.criadoEm}</li>)}</ul> : <p>Nenhuma alteração registrada ainda.</p>}</details>
    {operacao && <dialog ref={janela} className="dialogo-anonimato dialogo-senhas" aria-labelledby="titulo-revisao-senha" onCancel={(evento) => { evento.preventDefault(); fechar(); }}>
      <h2 id="titulo-revisao-senha">{etapa === "resultado" ? "Acesso atualizado" : etapa === "revisar" ? "Revisar alteração de acesso" : operacao.tipo === "DELETE" ? "Revogar acesso" : operacao.tipo === "PUT" ? "Trocar senha" : "Criar senha"}</h2>
      {erro && <p role="alert" className="erro-painel">{erro}</p>}
      {etapa === "editar" ? <form onChangeCapture={() => setMudou(true)} onSubmit={(evento) => { evento.preventDefault(); setEtapa("revisar"); }}>
        <p><strong>{operacao.cargo.nome}</strong></p><p>{operacao.cargo.descricao}</p>
        {operacao.tipo !== "DELETE" && <><label>Identificação de quem vai usar<input value={nome} maxLength={100} required autoComplete="off" onChange={(evento) => setNome(evento.target.value)} placeholder="Ex.: nome do integrante" /></label><label>Login<input value={login} maxLength={60} required autoComplete="off" autoCapitalize="none" spellCheck={false} pattern={padraoLogin} title={ajudaLogin} readOnly={Boolean(operacao.acesso?.loginAmbiente)} onChange={(evento) => setLogin(evento.target.value)} /></label><small>{operacao.acesso?.loginAmbiente ? "Este login é definido por ADMIN_LOGIN no arquivo de configuração do servidor." : ajudaLogin}</small><label>Nova senha (opcional)<input type="password" value={novaSenha} minLength={12} maxLength={200} pattern={padraoSenha} title={ajudaSenha} autoComplete="new-password" onChange={(evento) => setNovaSenha(evento.target.value)} /></label><small>{ajudaSenha} Deixe vazia para gerar uma senha automaticamente. Ela será mostrada uma única vez.</small></>}
        {operacao.tipo === "DELETE" && <p>O acesso de {operacao.acesso?.nome} será revogado e suas sessões serão encerradas.</p>}
        <label>Confirme sua senha do acesso geral<input type="password" value={senhaAtual} required maxLength={200} autoComplete="current-password" onChange={(evento) => setSenhaAtual(evento.target.value)} /></label>
        <div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" onClick={fechar}>Cancelar</button><button type="submit" className="botao-primario">Revisar alteração</button></div>
      </form> : etapa === "revisar" ? <><p>{operacao.tipo === "DELETE" ? "Revogar" : operacao.tipo === "PUT" ? "Substituir a senha de" : "Criar acesso para"} <strong>{nome || operacao.acesso?.nome}</strong> no cargo <strong>{operacao.cargo.nome}</strong>?</p>{operacao.tipo !== "DELETE" && <p>Login: <strong>{login}</strong></p>}<p>{operacao.tipo === "PUT" ? "A senha anterior deixará de funcionar e as outras sessões deste acesso serão encerradas." : operacao.tipo === "DELETE" ? "Esta senha deixará de funcionar imediatamente." : "A senha liberará apenas as áreas descritas para este cargo."}</p><div className="acoes-dialogo-anonimato"><button type="button" className="botao-secundario" disabled={ocupado} onClick={() => setEtapa("editar")}>Voltar à edição</button><button type="button" className="botao-primario" disabled={ocupado} onClick={() => void confirmar()}>{ocupado ? "Aguarde..." : "Confirmar alteração"}</button></div></> : <><p>{senhaGerada ? "Guarde e entregue esta senha à pessoa responsável. Ela não ficará disponível para consulta novamente." : "A senha foi revogada e as sessões desse acesso foram encerradas."}</p>{senhaGerada && <><p>Login: <strong>{login}</strong></p><output className="senha-gerada" aria-label="Senha criada">{senhaGerada}</output></>}<div className="acoes-dialogo-anonimato"><button type="button" className="botao-primario" onClick={fechar}>{senhaGerada ? "Guardei a senha, concluir" : "Concluir"}</button></div></>}
    </dialog>}
  </section>;
}

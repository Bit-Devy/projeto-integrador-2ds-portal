// ativa recursos do navegador
"use client";

// importa o componente de link
import Link from "next/link";
// importa tipos e controle de estados
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
// importa dados da rota e navegação
import { usePathname, useRouter } from "next/navigation";
// recebe do servidor quais páginas podem aparecer na navegação
import type { ModulosPortal } from "../servicos/tipos";

// define um item do menu
type ItemMenu = {
  nome: string;
  destino: string;
  subitens?: Array<{ nome: string; destino: string }>;
};

// guarda os links do menu principal
const itensMenu: ItemMenu[] = [
  { nome: "Início", destino: "/" },
  { nome: "Notícias", destino: "/noticias" },
  {
    nome: "O GECEP",
    destino: "/o-gecep",
    subitens: [
      { nome: "Quem somos", destino: "/o-gecep" },
      { nome: "Gestão atual", destino: "/gestao" },
      { nome: "História do grêmio", destino: "/o-gecep#historia" },
      { nome: "Estatuto", destino: "/estatuto" },
    ],
  },
  {
    nome: "Representação",
    destino: "/crt",
    subitens: [
      { nome: "Conselho de Representação de Turma", destino: "/crt" },
      { nome: "Como funciona a representação", destino: "/crt#representantes" },
      { nome: "Assembleias", destino: "/crt#assembleias" },
    ],
  },
  { nome: "Calendário", destino: "/calendario" },
  {
    nome: "Eventos",
    destino: "/eventos",
    subitens: [
      { nome: "Visão geral", destino: "/eventos" },
      { nome: "Eventos internos", destino: "/eventos/internos" },
      { nome: "Interclasses", destino: "/eventos/interclasses" },
      { nome: "Reuniões e atas", destino: "/eventos/reunioes" },
      { nome: "Projetos", destino: "/projetos" },
    ],
  },
  { nome: "Transparência", destino: "/transparencia" },
  {
    nome: "Participe",
    destino: "/sugestoes",
    subitens: [
      { nome: "Enviar sugestão", destino: "/sugestoes" },
      { nome: "Propor um projeto", destino: "/sugestoes#projeto" },
      { nome: "Fale conosco", destino: "/contato" },
    ],
  },
  { nome: "Documentos", destino: "/documentos" },
  {
    nome: "Mais",
    destino: "/mapa-do-colegio",
    subitens: [
      { nome: "Mapa do Colégio", destino: "/mapa-do-colegio" },
      { nome: "Representantes", destino: "/representantes" },
      { nome: "Cantina", destino: "/cantina" },
    ],
  },
];

// cria o identificador de um submenu
function idDoSubmenu(nome: string) {
  // limpa acentos e caracteres especiais
  return `submenu-${nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// monta a estrutura comum do portal
export default function EstruturaPortal({ children, modulosIniciais }: { children: ReactNode; modulosIniciais: ModulosPortal }) {
  const [modulos, setModulos] = useState(modulosIniciais);
  const menuVisivel = itensMenu.filter((item) => item.destino !== "/calendario" || modulos.calendario).map((item) => item.nome === "Mais" ? { ...item, subitens: item.subitens?.filter((subitem) => subitem.destino !== "/cantina" || modulos.cantina) } : item);
  if (modulos.estagios) menuVisivel.splice(menuVisivel.length - 1, 0, { nome: "Central de Estágios", destino: "/estagios" });
  // reflete as chaves salvas no painel sem precisar sair da sessão
  useEffect(() => {
    const controle = new AbortController();
    const atualizar = () => { fetch("/api/modulos", { signal: controle.signal, cache: "no-store" }).then(async (resposta) => { if (resposta.ok) setModulos((await resposta.json()).modulos); }).catch(() => {}); };
    window.addEventListener("gecep-modulos-atualizados", atualizar);
    return () => { controle.abort(); window.removeEventListener("gecep-modulos-atualizados", atualizar); };
  }, []);
  // lê a página atual
  const caminhoAtual = usePathname();
  // prepara a navegação entre páginas
  const navegador = useRouter();
  // controla o menu principal
  const [menuAberto, setMenuAberto] = useState(false);
  // controla o submenu aberto
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null);
  // controla o tamanho do texto
  const [textoMaior, setTextoMaior] = useState(false);
  // guarda o texto da busca
  const [busca, setBusca] = useState("");
  // permite devolver o foco ao botão ao fechar o menu móvel com Escape
  const botaoMenuCelular = useRef<HTMLButtonElement>(null);

  // fecha o menu com escape mesmo quando o foco ainda está no botão do cabeçalho
  useEffect(() => {
    if (!menuAberto) return;
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      evento.preventDefault();
      setMenuAberto(false);
      setSubmenuAberto(null);
      botaoMenuCelular.current?.focus();
    }
    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [menuAberto]);

  // limpa os menus ao mudar entre a navegação de celular e a de computador
  useEffect(() => {
    const telaCelular = window.matchMedia("(max-width: 780px)");
    function limparMenus() {
      setMenuAberto(false);
      setSubmenuAberto(null);
    }
    telaCelular.addEventListener("change", limparMenus);
    return () => telaCelular.removeEventListener("change", limparMenus);
  }, []);

  // envia a busca para a página de notícias
  function enviarBusca(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = busca.trim();
    navegador.push(texto ? `/noticias?busca=${encodeURIComponent(texto)}` : "/noticias");
    fecharMenu();
  }

  // fecha todos os menus
  function fecharMenu() {
    setMenuAberto(false);
    setSubmenuAberto(null);
  }

  // abre ou fecha o menu principal
  function alternarMenuPrincipal() {
    const abrir = !menuAberto;
    setMenuAberto(abrir);
    if (!abrir) setSubmenuAberto(null);
  }

  // aplica as opções de acessibilidade
  return (
    <div id="topo" className={textoMaior ? "texto-maior" : ""}>
      {/* link para pular o cabeçalho */}
      <a className="pular-conteudo" href="#conteudo">
        Ir para o conteúdo
      </a>

      {/* barra de cima */}
      <div className="barra-governo">
        <div className="barra-governo-conteudo">
          <a href="https://www.parana.pr.gov.br/" target="_blank" rel="noreferrer">
            GOVERNO DO PARANÁ <span aria-hidden="true">⌄</span>
          </a>
        </div>
        {/* botões de acessibilidade */}
        <div className="atalhos-acessibilidade" role="group" aria-label="Opções de acessibilidade">
          <button type="button" onClick={() => setTextoMaior(true)} aria-pressed={textoMaior} aria-label="Aumentar o texto" title="Aumentar o texto">
            A+
          </button>
          <button type="button" onClick={() => setTextoMaior(false)} aria-pressed={!textoMaior} aria-label="Diminuir o texto para o tamanho normal" title="Diminuir o texto para o tamanho normal">
            A
          </button>
        </div>
      </div>

      {/* logos e busca */}
      <header className="cabecalho-principal">
        <div className="limite cabecalho-conteudo">
          {/* botão do menu no celular */}
          <button
            ref={botaoMenuCelular}
            className="botao-menu-celular"
            type="button"
            onClick={alternarMenuPrincipal}
            aria-expanded={menuAberto}
            aria-controls="menu-principal"
          >
            <span aria-hidden="true">{menuAberto ? "×" : "☰"}</span>
            <span className="somente-leitor">{menuAberto ? "Fechar menu" : "Abrir menu"}</span>
          </button>

          {/* marca do colégio */}
          <Link className="marca-colegio" href="/" onClick={fecharMenu} aria-label="Página inicial do GECEP">
            <img
              src="https://web.celepar.pr.gov.br/drupal/images/seed/logo-cep-105x105.png"
              alt="Brasão do Colégio Estadual do Paraná"
            />
          </Link>

          <div className="divisor-marcas" aria-hidden="true" />

          {/* marca do grêmio */}
          <Link className="marca-gecep" href="/" onClick={fecharMenu} aria-label="GECEP — página inicial">
            <img src="/logo-gecep-com-texto.png" alt="GECEP — Grêmio Estudantil do Colégio Estadual do Paraná" />
          </Link>

          {/* busca do portal */}
          <form className="caixa-busca" role="search" onSubmit={enviarBusca}>
            <label className="somente-leitor" htmlFor="busca-site">
              Buscar no portal
            </label>
            <input
              id="busca-site"
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Do que você precisa hoje?"
            />
            <button type="submit" aria-label="Buscar">
              ⌕
            </button>
          </form>
        </div>
      </header>

      {/* menu azul */}
      <nav
        id="menu-principal"
        className={`menu-principal ${menuAberto ? "menu-aberto" : ""}`}
        aria-label="Navegação principal"
        onKeyDown={(evento) => {
          if (evento.key === "Escape") {
            evento.preventDefault();
            fecharMenu();
            if (menuAberto) botaoMenuCelular.current?.focus();
          }
        }}
      >
        <ul className="limite lista-menu">
          {/* links e submenus da navegação */}
          {menuVisivel.map((item) => {
            /* reúne todos os caminhos ligados ao item */
            const destinosRelacionados = [
              item.destino,
              ...(item.subitens?.map((subitem) => subitem.destino.split("#")[0]) ?? []),
            ];
            /* verifica se o item representa a página atual */
            const ativo =
              item.destino === "/"
                ? caminhoAtual === "/"
                : destinosRelacionados.some(
                    (destino) => caminhoAtual === destino || caminhoAtual.startsWith(`${destino}/`),
                  );

            /* mostra os estados visuais do item */
            /* responde ao uso do mouse e do teclado */
            return (
              <li
                className={`item-menu ${item.subitens ? "item-menu-tem-submenu" : ""} ${submenuAberto === item.nome ? "submenu-aberto" : ""} ${ativo ? "item-menu-ativo" : ""}`}
                onPointerEnter={(evento) => {
                  // abre ao passar o mouse apenas no menu de computador
                  if (evento.pointerType === "mouse" && window.matchMedia("(min-width: 781px)").matches) {
                    setSubmenuAberto(item.subitens ? item.nome : null);
                  }
                }}
                onPointerLeave={(evento) => {
                  if (evento.pointerType === "mouse" && !evento.currentTarget.contains(document.activeElement)) {
                    setSubmenuAberto((atual) => atual === item.nome ? null : atual);
                  }
                }}
                onBlur={(evento) => {
                  if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) {
                    setSubmenuAberto((atual) => atual === item.nome ? null : atual);
                  }
                }}
                onKeyDown={(evento) => {
                  if (item.subitens && evento.key === "Escape") {
                    evento.preventDefault();
                    evento.stopPropagation();
                    setSubmenuAberto(null);
                    evento.currentTarget.querySelector<HTMLButtonElement>(".botao-submenu")?.focus();
                  }
                }}
                key={item.nome}
              >
                <Link
                  href={item.destino}
                  onClick={fecharMenu}
                  onFocus={() => {
                    // no celular a abertura fica apenas no botão da seta
                    if (item.subitens && window.matchMedia("(min-width: 781px)").matches) {
                      setSubmenuAberto(item.nome);
                    }
                  }}
                  aria-current={!item.subitens && ativo ? "page" : undefined}
                >
                  {item.nome}
                </Link>
                {/* botão e links do submenu */}
                {item.subitens && (
                  <>
                    <button
                      className="botao-submenu"
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={submenuAberto === item.nome}
                      aria-controls={idDoSubmenu(item.nome)}
                      aria-label={`${submenuAberto === item.nome ? "Fechar" : "Abrir"} submenu ${item.nome}`}
                      onClick={() => setSubmenuAberto((atual) => atual === item.nome ? null : item.nome)}
                    >
                      <span aria-hidden="true">▾</span>
                    </button>
                    <ul className="submenu" id={idDoSubmenu(item.nome)}>
                      {item.subitens.map((subitem) => {
                        const destinoSemAncora = subitem.destino.split("#")[0];
                        const paginaAtual = !subitem.destino.includes("#") && (
                          destinoSemAncora === item.destino
                            ? caminhoAtual === destinoSemAncora
                            : caminhoAtual === destinoSemAncora || caminhoAtual.startsWith(`${destinoSemAncora}/`)
                        );
                        return <li key={subitem.nome}>
                          <Link href={subitem.destino} onClick={fecharMenu} aria-current={paginaAtual ? "page" : undefined}>
                            {subitem.nome}
                          </Link>
                        </li>;
                      })}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* conteúdo específico da página */}
      {children}

      {/* rodapé do portal */}
      <footer className="rodape">
        <div className="limite rodape-conteudo">
          {/* identificação do grêmio */}
          <div className="marcas-rodape">
            <img src="/logo-gecep.png" alt="Símbolo do GECEP" />
            <div>
              <strong>GECEP</strong>
              <span>Grêmio Estudantil do Colégio Estadual do Paraná</span>
            </div>
          </div>
          {/* endereço do colégio */}
          <div className="endereco-rodape">
            <strong>Colégio Estadual do Paraná — CEP</strong>
            <span>Av. João Gualberto, 250 — Alto da Glória</span>
            <span>80030-000 — Curitiba — PR</span>
            <a href="https://www.cep.pr.gov.br/" target="_blank" rel="noreferrer">
              Site oficial do colégio ↗
            </a>
          </div>
          {/* links de participação */}
          <div className="redes-rodape">
            <strong>Acompanhe e participe</strong>
            <a href="https://www.instagram.com/gecep_oficial/" target="_blank" rel="noreferrer">
              Instagram · @gecep_oficial
            </a>
            <Link href="/sugestoes">Envie uma sugestão</Link>
            <Link href="/contato">Fale com o GECEP</Link>
            <Link href="/painel">Painel da gestão</Link>
          </div>
        </div>
        <div className="rodape-final">
          <div className="limite">
            <span>Portal do Grêmio Estudantil do Colégio Estadual do Paraná</span>
            <span>Informação, participação e transparência</span>
          </div>
        </div>
      </footer>

      {/* botão de cima */}
      <a className="botao-voltar-topo" href="#topo" aria-label="Voltar ao início da página">
        ↑
      </a>
    </div>
  );
}

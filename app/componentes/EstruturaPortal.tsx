// ativa recursos do navegador
"use client";

// importa o componente de link
import Link from "next/link";
// importa tipos e controle de estados
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
// importa dados da rota e navegação
import { usePathname, useRouter } from "next/navigation";

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
  { nome: "Projetos", destino: "/projetos" },
  {
    nome: "Eventos",
    destino: "/eventos",
    subitens: [
      { nome: "Visão geral", destino: "/eventos" },
      { nome: "Eventos internos", destino: "/eventos/internos" },
      { nome: "Interclasses", destino: "/eventos/interclasses" },
      { nome: "Reuniões e atas", destino: "/eventos/reunioes" },
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
    ],
  },
];

// cria o identificador de um submenu
function idDoSubmenu(nome: string) {
  // limpa acentos e caracteres especiais
  return `submenu-${nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

// monta a estrutura comum do portal
export default function EstruturaPortal({ children }: { children: ReactNode }) {
  // lê a página atual
  const caminhoAtual = usePathname();
  // prepara a navegação entre páginas
  const navegador = useRouter();
  // controla o menu principal
  const [menuAberto, setMenuAberto] = useState(false);
  // controla o submenu aberto
  const [submenuAberto, setSubmenuAberto] = useState<string | null>(null);
  // controla o alto contraste
  const [contraste, setContraste] = useState(false);
  // controla o tamanho do texto
  const [textoMaior, setTextoMaior] = useState(false);
  // guarda o texto da busca
  const [busca, setBusca] = useState("");
  // permite devolver o foco ao botão ao fechar o menu móvel com Escape
  const botaoMenuCelular = useRef<HTMLButtonElement>(null);

  // Escape precisa funcionar mesmo quando o foco ainda está no botão que fica
  // fora do <nav> móvel.
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

  // envia a busca para a página de notícias
  function enviarBusca(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = busca.trim();
    navegador.push(texto ? `/noticias?busca=${encodeURIComponent(texto)}` : "/noticias");
    setMenuAberto(false);
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
    <div id="topo" className={`${contraste ? "alto-contraste" : ""} ${textoMaior ? "texto-maior" : ""}`}>
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
          {/* botões de acessibilidade */}
          <div className="atalhos-acessibilidade" aria-label="Opções de acessibilidade">
            <span>Acessibilidade</span>
            <button
              type="button"
              onClick={() => setContraste((valor) => !valor)}
              aria-pressed={contraste}
              title="Alternar contraste"
            >
              ◐
            </button>
            <button type="button" onClick={() => setTextoMaior(true)} title="Aumentar o texto">
              A+
            </button>
            <button type="button" onClick={() => setTextoMaior(false)} title="Tamanho normal">
              A
            </button>
          </div>
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
            <span aria-hidden="true">☰</span>
            <span className="somente-leitor">{menuAberto ? "Fechar menu" : "Abrir menu"}</span>
          </button>

          {/* marca do colégio */}
          <Link className="marca-colegio" href="/" aria-label="Página inicial do GECEP">
            <img
              src="https://web.celepar.pr.gov.br/drupal/images/seed/logo-cep-105x105.png"
              alt="Brasão do Colégio Estadual do Paraná"
            />
          </Link>

          <div className="divisor-marcas" aria-hidden="true" />

          {/* marca do grêmio */}
          <Link className="marca-gecep" href="/" aria-label="GECEP — página inicial">
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
          {itensMenu.map((item) => {
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
                  if (evento.pointerType === "mouse") setSubmenuAberto(item.subitens ? item.nome : null);
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
                  onFocus={() => item.subitens && setSubmenuAberto(item.nome)}
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

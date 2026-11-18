"use client";

// controla a ficha aberta e usa os membros cadastrados no portal
import { useId, useLayoutEffect, useRef, useState } from "react";
import SeletorAno from "./SeletorAno";
import { anoDoPortal } from "../conteudo/periodos";
import { anoDoRegistro } from "../conteudo/ciclos";
import { membros } from "../dados";
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
// mostra a vaga e o turno que acompanham cada integrante publicado
import { turnosEquipe, vagasDoCargo } from "../lib/equipe";
import type { MembroGecep } from "../conteudo/tipos";
import {
  contatosDoMembro,
  enderecoContatoEquipe,
  tiposContatoEquipe,
  type ContatoEquipe,
} from "../conteudo/contatos-equipe";

type FichaAberta = {
  integrante: MembroGecep;
  contatos: ContatoEquipe[];
  iniciarNosContatos: boolean;
  acionador: HTMLButtonElement;
};

// mostra os integrantes do grêmio
export default function EquipeGecep() {
  // busca os integrantes publicados
  const { dados: dadosEquipe, carregando } = useConteudoPublico("membros", membros);
  const [ficha, setFicha] = useState<FichaAberta | null>(null);

  const [ano, setAno] = useState(String(anoDoPortal()));
  const integrantes = dadosEquipe.filter(
    (item) =>
      ano === "todos" ||
      anoDoRegistro(item as unknown as Record<string, unknown>, item.criadoEm) === Number(ano),
  );
  const seletorAno = (
    <SeletorAno
      id="ano-equipe-publica"
      ano={ano}
      datas={dadosEquipe.map(
        (item) =>
          `${anoDoRegistro(item as unknown as Record<string, unknown>, item.criadoEm)}-01-01`,
      )}
      alterar={setAno}
    />
  );
  // mostra o aviso quando não há integrantes
  if (!integrantes.length) {
    return (
      <>
        {seletorAno}
        <div className="estado-vazio-equipe">
          <span aria-hidden="true">GE</span>
          <div>
            <strong>Composição oficial ainda não publicada</strong>
            <p>Os nomes, cargos, turmas e fotos poderão ser adicionados pelo painel da gestão.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {seletorAno}
      <div className="grade-equipe">
        {/* cartões dos integrantes */}
        {integrantes.map((integrante) => {
          const temFicha = integrante.publicado !== false;
          const contatos = temFicha ? contatosDoMembro(integrante) : [];
          const detalhe = detalheEquipe(integrante);
          return (
            <article
              className="cartao-integrante"
              key={`${integrante.nome}-${integrante.cargo}-${integrante.id ?? "pessoa"}`}
            >
              <FotoIntegrante integrante={integrante} />
              <small>{integrante.diretoria}</small>
              <h3>
                {temFicha ? (
                  <button
                    type="button"
                    className="nome-integrante"
                    aria-haspopup="dialog"
                    onClick={(evento) =>
                      setFicha({
                        integrante,
                        contatos,
                        iniciarNosContatos: false,
                        acionador: evento.currentTarget,
                      })
                    }
                  >
                    {integrante.nome}
                  </button>
                ) : (
                  integrante.nome
                )}
              </h3>
              <strong>{integrante.cargo}</strong>
              {detalhe && <small>{detalhe}</small>}
              {integrante.turma && <b>{integrante.turma}</b>}
              <p>{integrante.biografia}</p>
              {contatos.length > 0 && (
                <button
                  type="button"
                  className="contato-integrante"
                  aria-haspopup="dialog"
                  aria-label={`Contato de ${integrante.nome}`}
                  onClick={(evento) =>
                    setFicha({
                      integrante,
                      contatos,
                      iniciarNosContatos: true,
                      acionador: evento.currentTarget,
                    })
                  }
                >
                  Contato ›
                </button>
              )}
            </article>
          );
        })}
        {/* aviso escondido durante a atualização */}
        {carregando && <p className="somente-leitor">Atualizando integrantes...</p>}
      </div>
      {ficha && <FichaIntegrante ficha={ficha} fechar={() => setFicha(null)} />}
    </>
  );
}

// abre os dados completos da pessoa e pode levar direto aos contatos
function FichaIntegrante({ ficha, fechar }: { ficha: FichaAberta; fechar: () => void }) {
  const { integrante, contatos, iniciarNosContatos, acionador } = ficha;
  const janela = useRef<HTMLDialogElement>(null);
  const primeiroContato = useRef<HTMLAnchorElement>(null);
  const titulo = useId();
  const detalhe = detalheEquipe(integrante);

  // consulta rápida dos links durante o teste da ficha
  // console.table(contatos)

  // abre a ficha e devolve o foco ao nome ou ao botão de contato ao fechar
  useLayoutEffect(() => {
    const elemento = janela.current;
    if (!elemento) return;
    elemento.showModal();
    if (iniciarNosContatos) {
      primeiroContato.current?.focus({ preventScroll: true });
      elemento.scrollTop = elemento.scrollHeight;
    }
    return () => {
      elemento.close();
      acionador.focus({ preventScroll: true });
    };
  }, [acionador, iniciarNosContatos]);

  return (
    <dialog
      ref={janela}
      className="dialogo-integrante"
      aria-labelledby={titulo}
      onCancel={(evento) => {
        evento.preventDefault();
        fechar();
      }}
      onClick={(evento) => {
        if (evento.target !== evento.currentTarget) return;
        const caixa = evento.currentTarget.getBoundingClientRect();
        if (
          evento.clientX < caixa.left ||
          evento.clientX > caixa.right ||
          evento.clientY < caixa.top ||
          evento.clientY > caixa.bottom
        )
          fechar();
      }}
    >
      <header className="topo-ficha-integrante">
        <div>
          <small>{integrante.diretoria}</small>
          <h2 id={titulo}>{integrante.nome}</h2>
        </div>
        <button
          className="botao-secundario"
          type="button"
          aria-label="Fechar ficha do integrante"
          onClick={fechar}
        >
          Fechar
        </button>
      </header>
      <div className="corpo-ficha-integrante">
        {/* a foto fica em retrato e os dados acompanham ao lado */}
        <div className="retrato-ficha-integrante">
          <FotoIntegrante integrante={integrante} />
        </div>
        <div className="dados-ficha-integrante">
          <small>Cargo</small>
          <strong>{integrante.cargo}</strong>
          {detalhe && <span>{detalhe}</span>}
          {integrante.turma && <span>Turma {integrante.turma}</span>}
        </div>
        {integrante.biografia && (
          <section className="apresentacao-ficha-integrante">
            <h3>Apresentação</h3>
            <p>{integrante.biografia}</p>
          </section>
        )}
        {contatos.length > 0 && (
          <section className="contatos-ficha-integrante">
            <h3>Contatos</h3>
            <ul>
              {contatos.map((contato, indice) => (
                <li key={indice}>
                  <a
                    className="botao-secundario"
                    ref={indice === 0 ? primeiroContato : undefined}
                    href={enderecoContatoEquipe(contato)}
                  >
                    <strong>{tiposContatoEquipe[contato.tipo].nome}</strong>
                    <span>{contato.valor}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </dialog>
  );
}

// usa a foto publicada ou mostra as iniciais no lugar dela
function FotoIntegrante({ integrante }: { integrante: MembroGecep }) {
  return integrante.fotoUrl ? (
    <img src={integrante.fotoUrl} alt={`Foto de ${integrante.nome}`} />
  ) : (
    <span className="foto-integrante-vazia" aria-hidden="true">
      {iniciais(integrante.nome)}
    </span>
  );
}

// mantém visíveis as vagas duplas e os turnos da equipe
function detalheEquipe(integrante: MembroGecep) {
  const vagas = vagasDoCargo(integrante.cargoChave || "");
  const vaga = vagas.length > 1 ? vagas.find((item) => item.chave === integrante.vaga)?.nome : "";
  const turno =
    integrante.turno && !integrante.cargoChave?.startsWith("conselho-fiscal-")
      ? turnosEquipe.find((item) => item.chave === integrante.turno)?.nome
      : "";
  return [vaga, turno].filter(Boolean).join(" · ");
}

// cria as iniciais do nome
function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

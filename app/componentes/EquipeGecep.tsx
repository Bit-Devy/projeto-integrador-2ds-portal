// ativa recursos do navegador
"use client";

// importa a equipe de exemplo
import { membros } from "../dados";
// importa a busca de conteúdo público
import { useConteudoPublico } from "../conteudo/useConteudoPublico";
// mostra a vaga e o turno que acompanham cada integrante publicado
import { turnosEquipe, vagasDoCargo } from "../lib/equipe";
import type { MembroGecep } from "../conteudo/tipos";

// mostra os integrantes do grêmio
export default function EquipeGecep() {
  // busca os integrantes publicados
  const { dados: integrantes, carregando } = useConteudoPublico("membros", membros);

  // mostra o aviso quando não há integrantes
  if (!integrantes.length) {
    return (
      <div className="estado-vazio-equipe">
        <span aria-hidden="true">GE</span>
        <div><strong>Composição oficial ainda não publicada</strong><p>Os nomes, cargos, turmas e fotos poderão ser adicionados pelo painel da gestão.</p></div>
      </div>
    );
  }

  return (
    <div className="grade-equipe">
      {/* cartões dos integrantes */}
      {integrantes.map((integrante) => (
        <article className="cartao-integrante" key={`${integrante.nome}-${integrante.cargo}-${integrante.id ?? "pessoa"}`}>
          {integrante.fotoUrl ? <img src={integrante.fotoUrl} alt={`Foto de ${integrante.nome}`} /> : <span className="foto-integrante-vazia" aria-hidden="true">{iniciais(integrante.nome)}</span>}
          <small>{integrante.diretoria}</small>
          <h3>{integrante.nome}</h3>
          <strong>{integrante.cargo}</strong>
          {detalheEquipe(integrante) && <small>{detalheEquipe(integrante)}</small>}
          {integrante.turma && <b>{integrante.turma}</b>}
          <p>{integrante.biografia}</p>
          {integrante.contato && <a href={integrante.contato}>Contato ›</a>}
        </article>
      ))}
      {/* aviso escondido durante a atualização */}
      {carregando && <p className="somente-leitor">Atualizando integrantes...</p>}
    </div>
  );
}

// mantém visíveis as vagas duplas e os turnos da equipe
function detalheEquipe(integrante: MembroGecep) {
  const vagas = vagasDoCargo(integrante.cargoChave || "");
  const vaga = vagas.length > 1 ? vagas.find((item) => item.chave === integrante.vaga)?.nome : "";
  const turno = integrante.turno && !integrante.cargoChave?.startsWith("conselho-fiscal-") ? turnosEquipe.find((item) => item.chave === integrante.turno)?.nome : "";
  return [vaga, turno].filter(Boolean).join(" · ");
}

// cria as iniciais do nome
function iniciais(nome: string) {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
}

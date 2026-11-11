import { anoDoPortal } from "./periodos";

// lê os integrantes publicados sem usar nomes ou dados do registro de senhas
import { getD1 } from "../../db";
import { garantirBanco } from "../../db/inicializar";
import { ErroJsonInvalido } from "../lib/corpo-json";
import { dadosMembroEquipe, obterCargoEquipe, turnoDoCargo, turnosEquipe, vagasDoCargo, type MembroEquipePresenca } from "../lib/equipe";

type LinhaEquipe = { id: number; dados_json: string };

export async function listarMembrosEquipe(ano = anoDoPortal()): Promise<MembroEquipePresenca[]> {
  await garantirBanco();
  const linhas = await getD1().prepare("SELECT id, dados_json FROM conteudos WHERE tipo = 'membros' AND publicado = 1 AND CAST(COALESCE(json_extract(dados_json, '$.ano'), substr(criado_em, 1, 4)) AS INTEGER) = ? ORDER BY id").bind(ano).all<LinhaEquipe>();
  return linhas.results.flatMap((linha) => {
    try { const membro = dadosMembroEquipe(linha.id, JSON.parse(linha.dados_json)); return membro ? [membro] : []; }
    catch { return []; }
  });
}

// confere o cargo e a vaga antes de publicar um integrante da equipe
export async function prepararMembroEquipe(dados: Record<string, unknown>, publicado: boolean, id?: number) {
  const cargo = obterCargoEquipe(dados);
  if (!cargo) throw new ErroJsonInvalido("Escolha um cargo do registro de senhas para este integrante.");
  const vagas = vagasDoCargo(cargo.chave);
  const vaga = vagas.find((item) => item.chave === dados.vaga) || (!dados.vaga && vagas.length === 1 ? vagas[0] : undefined);
  if (!vaga) throw new ErroJsonInvalido("Escolha a vaga deste integrante no cargo.");
  if (!turnosEquipe.some((turno) => turno.chave === String(dados.turno || ""))) throw new ErroJsonInvalido("Escolha um turno válido para este integrante.");
  dados.cargoChave = cargo.chave;
  dados.vaga = vaga.chave;
  dados.cargo = cargo.nome;
  dados.turno = turnoDoCargo(cargo.chave) || String(dados.turno || "");
  if (!publicado || cargo.chave === "apoio") return;
  const ocupante = (await listarMembrosEquipe(Number(dados.ano) || anoDoPortal())).find((membro) => membro.id !== id && membro.cargoChave === cargo.chave && membro.vaga === vaga.chave);
  if (ocupante) throw new ErroJsonInvalido(`A vaga ${vaga.nome} de ${cargo.nome} já está publicada com ${ocupante.nome}. Retire o integrante anterior do público antes de publicar a substituição.`);
}

// evita que dois salvamentos ao mesmo tempo publiquem a mesma vaga
export const condicaoVagaLivre = `(? <> 'membros' OR ? = 0 OR json_extract(?, '$.cargoChave') = 'apoio' OR NOT EXISTS (
  SELECT 1 FROM conteudos AS equipe WHERE equipe.tipo = 'membros' AND equipe.publicado = 1 AND equipe.id <> ?
  AND json_extract(equipe.dados_json, '$.cargoChave') = json_extract(?, '$.cargoChave')
  AND json_extract(equipe.dados_json, '$.vaga') = json_extract(?, '$.vaga')
  AND CAST(COALESCE(json_extract(equipe.dados_json, '$.ano'), substr(equipe.criado_em, 1, 4)) AS INTEGER) = CAST(json_extract(?, '$.ano') AS INTEGER)
))`;

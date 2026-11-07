"use client";

// apresenta os cargos e as vagas previstos para compor a equipe
import { cargosPainel } from "../lib/cargos";
import { obterCargoEquipe, turnoDoCargo, turnosEquipe, vagasDoCargo } from "../lib/equipe";

type Valor = string | number | boolean;
export default function CamposCargoEquipe({ dados, mudar }: { dados: Record<string, Valor>; mudar: (campo: string, valor: Valor) => void }) {
  const cargo = obterCargoEquipe(dados);
  const vagas = vagasDoCargo(cargo?.chave || "");
  const turnoFixo = turnoDoCargo(cargo?.chave || "");

  // troca o cargo junto da vaga para não manter uma combinação antiga
  function escolherCargo(chave: string) {
    const novo = cargosPainel.find((item) => item.chave === chave);
    mudar("cargoChave", chave);
    mudar("cargo", novo?.nome || "");
    mudar("vaga", vagasDoCargo(chave)[0]?.chave || "");
    mudar("turno", turnoDoCargo(chave) || String(dados.turno || ""));
  }

  return <>
    <label><span>Cargo</span><select value={cargo?.chave || ""} required onChange={(evento) => escolherCargo(evento.target.value)}><option value="">Selecione um cargo</option>{cargosPainel.map((item) => <option value={item.chave} key={item.chave}>{item.nome}</option>)}</select><small>Os cargos são os mesmos do registro de senhas. O nome é cadastrado somente aqui, na Equipe.</small></label>
    <label><span>Vaga no cargo</span><select value={String(dados.vaga || (vagas.length === 1 ? vagas[0].chave : ""))} required onChange={(evento) => mudar("vaga", evento.target.value)}><option value="">Selecione a vaga</option>{vagas.map((vaga) => <option value={vaga.chave} key={vaga.chave}>{vaga.nome}</option>)}</select><small>{cargo?.chave === "apoio" ? "O estatuto permite vários apoios voluntários." : cargo?.chave === "geral" ? "Responsáveis técnicos do portal, até três integrantes." : vagas.length > 1 ? "Cada vaga pode ter um integrante publicado. Para substituir alguém, retire o anterior do público." : "Este cargo possui uma vaga na composição da equipe."}</small></label>
    <label><span>Turno do integrante</span><select value={turnoFixo || String(dados.turno || "")} disabled={Boolean(turnoFixo)} onChange={(evento) => mudar("turno", evento.target.value)}>{turnosEquipe.map((turno) => <option value={turno.chave} key={turno.chave}>{turno.nome}</option>)}</select>{turnoFixo && <small>O turno é definido pelo cargo do Conselho Fiscal.</small>}</label>
  </>;
}

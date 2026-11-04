"use client";

// mostra a área fixa do cargo ou permite a escolha pela gestão
import { areaRestrita, areasPainel } from "../lib/cargos";
export default function AreaResponsavel({ cargo, valor, mudar }: { cargo: string; valor: string; mudar: (valor: string) => void }) {
  const area = areaRestrita(cargo);
  return <label className="pev-campo pev-campo--largo"><span>Área responsável</span>{area ? <input value={areasPainel.find((item) => item.chave === area)?.nome || ""} readOnly /> : <select value={valor} onChange={(evento) => mudar(evento.target.value)}>{areasPainel.map((item) => <option value={item.chave} key={item.chave}>{item.nome}</option>)}</select>}<small>Define quem pode editar o registro. Use Colégio e comunidade escolar para assuntos do CEP que afetam os estudantes.</small></label>;
}

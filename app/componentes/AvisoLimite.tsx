// importa o formato do aviso devolvido pelo servidor
import type { EstadoLimite } from "../lib/limites-tipos";

// mostra o motivo da espera e o horário em que o formulário será liberado
export default function AvisoLimite({ limite, liberarEm }: { limite: EstadoLimite | null; liberarEm: number }) {
  if (!limite?.bloqueado) return null;
  return <div className="aviso-limite" role="status">
    <strong>Vamos fazer uma pausa</strong>
    <p>{limite.aviso}</p>
    <p>Você poderá tentar novamente em <time dateTime={new Date(liberarEm).toISOString()}>
      {new Date(liberarEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
    </time>.</p>
  </div>;
}

// identifica janelas locais também quando o portal é aberto por http na rede
let sequencia = 0;
export function identificadorLocal() {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `gecep-${Date.now().toString(36)}-${++sequencia}`;
}

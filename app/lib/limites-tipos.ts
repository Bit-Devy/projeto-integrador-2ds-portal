// separa as duas ações que possuem limite por navegador
export type AcaoLimitada = "mensagens" | "login";

// descreve o aviso e o tempo de espera mostrado na tela
export type EstadoLimite = {
  bloqueado: boolean;
  tentarEm: number;
  restantes: number;
  aviso: string;
};

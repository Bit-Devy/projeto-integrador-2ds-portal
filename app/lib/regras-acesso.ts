// mantém as mesmas regras nos formulários e no servidor
export const padraoLogin = "\\p{Ll}+";
export const padraoSenha = "[^\\s_]+";
export const ajudaLogin = "Use apenas letras minúsculas, com ou sem acento, sem espaços, números ou símbolos.";
export const ajudaSenha = "Use de 12 a 200 caracteres, sem espaços e sem underline (_). Números, pontos e outros símbolos são permitidos.";

// reúne letras acentuadas escritas de formas equivalentes
export function normalizarLogin(valor: string) { return valor.normalize("NFC"); }
export function loginValido(valor: string) { return valor.length > 0 && valor.length <= 60 && /^\p{Ll}+$/u.test(normalizarLogin(valor)); }
export function senhaPermitida(valor: string) { return valor.length > 0 && valor.length <= 200 && !/[\s_]/u.test(valor); }

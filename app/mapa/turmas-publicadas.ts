// usa a mesma regra de turma disponível no mapa e nos representantes
export function condicaoTurmaPublicada(alias = "t") {
  return `${alias}.ativo = 1 AND ${alias}.publicado = 1
    AND (${alias}.inicio_validade = '' OR ${alias}.inicio_validade <= date('now'))
    AND (${alias}.fim_validade = '' OR ${alias}.fim_validade >= date('now'))
    AND EXISTS (SELECT 1 FROM categorias_mapa c WHERE c.grupo = 'atividade'
      AND c.slug = ${alias}.tipo AND c.ativo = 1)`;
}

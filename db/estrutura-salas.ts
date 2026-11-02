// impede duas ocupações publicadas da mesma sala no mesmo turno e período
export const comandosProtecaoSalas = ["INSERT", "UPDATE"].map((operacao) => `
  CREATE TRIGGER IF NOT EXISTS salas_sem_conflito_${operacao.toLowerCase()}
  BEFORE ${operacao} ON ensalamentos
  WHEN NEW.ativo = 1 AND NEW.publicado = 1 AND NEW.local_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'sala_ocupada') WHERE EXISTS (
      SELECT 1 FROM ensalamentos e WHERE e.local_id = NEW.local_id AND e.turno = NEW.turno
        AND e.id <> NEW.id AND e.ativo = 1 AND e.publicado = 1
        AND COALESCE(NULLIF(e.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(NEW.inicio_validade, ''), '0001-01-01')
        AND COALESCE(NULLIF(NEW.fim_validade, ''), '9999-12-31') >= COALESCE(NULLIF(e.inicio_validade, ''), '0001-01-01')
    );
  END
`);

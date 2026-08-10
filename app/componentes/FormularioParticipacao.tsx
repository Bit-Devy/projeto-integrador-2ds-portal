// ativa recursos do navegador
"use client";

// importa eventos e controle de estados
import { FormEvent, useState } from "react";

// guarda os tipos de contato disponíveis
const tiposContato = [
  { valor: "whatsapp", nome: "WhatsApp" },
  { valor: "telefone", nome: "Telefone" },
  { valor: "email", nome: "E-mail" },
  { valor: "instagram", nome: "Instagram" },
  { valor: "outro", nome: "Outro" },
] as const;

// mostra o formulário de participação
export default function FormularioParticipacao({ modo = "sugestao" }: { modo?: "sugestao" | "contato" }) {
  // guarda o protocolo recebido
  const [protocolo, setProtocolo] = useState("");
  // guarda a mensagem de erro
  const [erro, setErro] = useState("");
  // controla o envio do formulário
  const [enviando, setEnviando] = useState(false);
  // guarda o tipo de contato
  const [tipoContato, setTipoContato] = useState("");
  // guarda o contato digitado
  const [contato, setContato] = useState("");

  // envia a mensagem para o banco do portal
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro("");
    setProtocolo("");

    // lê os campos do formulário
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);

    try {
      // envia os campos para a área administrativa
      const resposta = await fetch("/api/mensagens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: dados.get("nome"),
          turma: dados.get("turma"),
          assunto: dados.get("assunto"),
          titulo: dados.get("titulo"),
          mensagem: dados.get("mensagem"),
          tipoContato: dados.get("tipoContato"),
          contato: dados.get("contato"),
          anonimo: dados.get("anonimo") === "on",
          site: dados.get("site"),
        }),
      });
      // lê o protocolo ou o erro da resposta
      const resultado = await resposta.json() as { protocolo?: string; erro?: string };
      if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível enviar agora.");
      setProtocolo(resultado.protocolo ?? "Mensagem recebida");
      formulario.reset();
      setTipoContato("");
      setContato("");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar agora.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-participacao" onSubmit={enviar}>
      {/* identificação do estudante */}
      <div className="duas-colunas-formulario">
        <label>
          Nome
          <input type="text" name="nome" placeholder="Como podemos chamar você?" required />
        </label>
        <label>
          Turma
          <input type="text" name="turma" placeholder="Ex.: 2º DS tarde" required />
        </label>
      </div>
      {/* assunto da participação */}
      <label>
        {modo === "contato" ? "Assunto" : "Tipo de participação"}
        <select name="assunto" defaultValue="" required>
          <option value="" disabled>Escolha uma opção</option>
          <option>Sugestão</option>
          <option>Demanda da turma</option>
          <option>Proposta de projeto</option>
          <option>Dúvida</option>
          <option>Relato ou denúncia</option>
          <option>Outro</option>
        </select>
      </label>
      {/* título da mensagem */}
      <label>
        Título da mensagem
        <input type="text" name="titulo" placeholder="Resuma o assunto em uma frase" required />
      </label>
      {/* texto da mensagem */}
      <label>
        Mensagem
        <textarea name="mensagem" rows={7} placeholder="Explique sua ideia ou demanda com os detalhes importantes" required />
      </label>
      {/* dados opcionais para contato */}
      <div className="duas-colunas-formulario">
        <label>
          Tipo de contato (opcional)
          <select
            name="tipoContato"
            value={tipoContato}
            onChange={(evento) => {
              setTipoContato(evento.target.value);
              setContato("");
            }}
          >
            <option value="">Não informar</option>
            {tiposContato.map((tipo) => <option value={tipo.valor} key={tipo.valor}>{tipo.nome}</option>)}
          </select>
        </label>
        <label>
          Meio de contato (opcional)
          <input
            type={tipoContato === "email" ? "email" : "text"}
            name="contato"
            value={contato}
            onChange={(evento) => setContato(formatarContato(evento.target.value, tipoContato))}
            placeholder={placeholderContato(tipoContato)}
            inputMode={tipoContato === "whatsapp" || tipoContato === "telefone" ? "tel" : tipoContato === "email" ? "email" : "text"}
            autoComplete={tipoContato === "email" ? "email" : tipoContato === "whatsapp" || tipoContato === "telefone" ? "tel" : "off"}
            maxLength={tipoContato === "whatsapp" || tipoContato === "telefone" ? 15 : 200}
            disabled={!tipoContato}
            required={Boolean(tipoContato)}
          />
        </label>
      </div>
      {/* opção de identidade preservada */}
      <label className="opcao-anonima">
        <input type="checkbox" name="anonimo" />
        Quero que minha identidade seja preservada quando esta mensagem for analisada
      </label>
      {/* campo escondido contra envios automáticos */}
      <label className="campo-armadilha" aria-hidden="true">
        Não preencha este campo
        <input type="text" name="site" tabIndex={-1} autoComplete="off" />
      </label>
      {/* botão de envio */}
      <button type="submit" disabled={enviando}>{enviando ? "Enviando..." : modo === "contato" ? "Enviar mensagem" : "Enviar participação"}</button>
      {/* confirmação com protocolo */}
      {protocolo && (
        <p className="confirmacao-formulario" role="status">
          Mensagem enviada. Guarde o protocolo <strong>{protocolo}</strong>.
        </p>
      )}
      {/* mensagem de erro */}
      {erro && <p className="erro-formulario" role="alert">{erro}</p>}
    </form>
  );
}

// escolhe o exemplo do campo de contato
function placeholderContato(tipo: string) {
  if (tipo === "whatsapp" || tipo === "telefone") return "(41) 99999-9999";
  if (tipo === "email") return "nome@exemplo.com";
  if (tipo === "instagram") return "@usuario";
  if (tipo === "outro") return "Informe como entrar em contato";
  return "Escolha o tipo de contato primeiro";
}

// formata o contato conforme o tipo
function formatarContato(valor: string, tipo: string) {
  if (tipo === "whatsapp" || tipo === "telefone") return formatarTelefone(valor);
  if (tipo === "instagram") {
    // limpa e limita o nome do instagram
    const usuario = valor.replace(/\s/g, "").replace(/^@+/, "").slice(0, 30);
    return usuario ? `@${usuario}` : "";
  }
  return valor;
}

// formata um número de telefone
function formatarTelefone(valor: string) {
  // mantém apenas onze números
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;

  // separa o código de área
  const ddd = numeros.slice(0, 2);
  const numero = numeros.slice(2);
  if (numero.length <= 4) return `(${ddd}) ${numero}`;
  if (numeros.length <= 10) return `(${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
  return `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
}

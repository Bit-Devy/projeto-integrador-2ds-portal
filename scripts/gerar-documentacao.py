#!/usr/bin/env python3
"""gera o pdf escolar a partir da documentação em markdown"""

# importa os caminhos do computador
from pathlib import Path
# importa a proteção de textos para o pdf
import html
# importa a busca por padrões de texto
import re

# importa as cores do documento
from reportlab.lib import colors
# importa o alinhamento central
from reportlab.lib.enums import TA_CENTER
# importa o tamanho da página
from reportlab.lib.pagesizes import A4
# importa a criação de estilos de texto
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
# importa a unidade de medida
from reportlab.lib.units import mm
# importa o registro de fontes
from reportlab.pdfbase import pdfmetrics
# importa o uso de fontes do computador
from reportlab.pdfbase.ttfonts import TTFont
# importa os blocos usados para montar o pdf
from reportlab.platypus import (
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# guarda os caminhos dos arquivos usados
RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "docs" / "DOCUMENTACAO-DO-PROJETO.md"
SAIDA = RAIZ / "public" / "documentacao" / "Documentacao-Projeto-GECEP.pdf"
LOGO = RAIZ / "public" / "logo-gecep-com-texto.png"


# escolhe e registra as fontes do documento
def registrar_fontes():
    # procura as fontes instaladas no computador
    normal = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    negrito = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
    # usa as fontes encontradas quando elas existem
    if normal.exists() and negrito.exists():
        pdfmetrics.registerFont(TTFont("Portal", str(normal)))
        pdfmetrics.registerFont(TTFont("Portal-Bold", str(negrito)))
        return "Portal", "Portal-Bold"
    # usa as fontes básicas como alternativa
    return "Helvetica", "Helvetica-Bold"


# registra as fontes uma vez
FONTE, FONTE_NEGRITO = registrar_fontes()


# transforma marcas simples em texto aceito pelo pdf
def texto_formatado(texto: str) -> str:
    # protege sinais que poderiam quebrar o texto
    texto = html.escape(texto.strip())
    # transforma textos entre estrelas em negrito
    texto = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", texto)
    # transforma textos entre crases em código
    texto = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", texto)
    return texto


# cria os estilos visuais do documento
def estilos():
    # usa os estilos básicos como ponto de partida
    base = getSampleStyleSheet()
    # define um estilo para cada tipo de texto
    return {
        "capa": ParagraphStyle("capa", parent=base["Title"], fontName=FONTE_NEGRITO, fontSize=25, leading=31, textColor=colors.HexColor("#064f7b"), alignment=TA_CENTER, spaceAfter=8 * mm),
        "subcapa": ParagraphStyle("subcapa", parent=base["Normal"], fontName=FONTE, fontSize=12, leading=18, textColor=colors.HexColor("#52666e"), alignment=TA_CENTER),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName=FONTE_NEGRITO, fontSize=20, leading=25, textColor=colors.HexColor("#064f7b"), spaceBefore=5 * mm, spaceAfter=4 * mm),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName=FONTE_NEGRITO, fontSize=15, leading=20, textColor=colors.HexColor("#0072bb"), spaceBefore=5 * mm, spaceAfter=3 * mm),
        "h3": ParagraphStyle("h3", parent=base["Heading3"], fontName=FONTE_NEGRITO, fontSize=12, leading=16, textColor=colors.HexColor("#304952"), spaceBefore=4 * mm, spaceAfter=2 * mm),
        "corpo": ParagraphStyle("corpo", parent=base["BodyText"], fontName=FONTE, fontSize=9.3, leading=14, textColor=colors.HexColor("#364c55"), spaceAfter=2.5 * mm),
        "lista": ParagraphStyle("lista", parent=base["BodyText"], fontName=FONTE, fontSize=9.1, leading=13, textColor=colors.HexColor("#40545d")),
        "codigo": ParagraphStyle("codigo", parent=base["Code"], fontName="Courier", fontSize=7.5, leading=10, textColor=colors.HexColor("#33474f"), backColor=colors.HexColor("#eef4f6"), borderPadding=6),
        "rodape": ParagraphStyle("rodape", parent=base["Normal"], fontName=FONTE, fontSize=7, textColor=colors.HexColor("#76858b")),
    }


# cria os estilos uma vez
ESTILOS = estilos()


# desenha o rodapé de cada página
def desenhar_pagina(canvas, documento):
    # guarda o estado antes de desenhar
    canvas.saveState()
    # obtém o tamanho da página
    largura, altura = A4
    # desenha a linha que separa o rodapé
    canvas.setStrokeColor(colors.HexColor("#d6e2e6"))
    canvas.line(18 * mm, 15 * mm, largura - 18 * mm, 15 * mm)
    # escreve o nome e o número da página
    canvas.setFont(FONTE, 7)
    canvas.setFillColor(colors.HexColor("#76858b"))
    canvas.drawString(18 * mm, 10 * mm, "Portal do GECEP - Documentação do Projeto")
    canvas.drawRightString(largura - 18 * mm, 10 * mm, f"Página {documento.page}")
    canvas.restoreState()


# cria os elementos da capa
def criar_capa():
    # começa a capa com um espaço superior
    itens = [Spacer(1, 18 * mm)]
    # adiciona a marca quando o arquivo existe
    if LOGO.exists():
        imagem = Image(str(LOGO), width=145 * mm, height=69 * mm, kind="proportional")
        itens.extend([imagem, Spacer(1, 13 * mm)])
    # adiciona os textos e encerra a capa
    itens.extend([
        Paragraph("Documentação do Projeto", ESTILOS["capa"]),
        Paragraph("Portal institucional, participativo e de transparência do Grêmio Estudantil do Colégio Estadual do Paraná", ESTILOS["subcapa"]),
        Spacer(1, 25 * mm),
        Paragraph("Documento de planejamento, requisitos, protótipo e implementação", ESTILOS["subcapa"]),
        Spacer(1, 8 * mm),
        Paragraph("Curitiba - Paraná", ESTILOS["subcapa"]),
        PageBreak(),
    ])
    return itens


# transforma o texto em blocos do pdf
def converter_markdown(conteudo: str):
    # prepara as linhas e os blocos de saída
    linhas = conteudo.splitlines()
    itens = []
    paragrafo = []
    indice = 0
    primeiro_titulo = True

    # encerra o parágrafo que está sendo montado
    def fechar_paragrafo():
        if paragrafo:
            itens.append(Paragraph(texto_formatado(" ".join(paragrafo)), ESTILOS["corpo"]))
            paragrafo.clear()

    while indice < len(linhas):
        # lê a linha atual em dois formatos
        linha = linhas[indice].rstrip()
        limpa = linha.strip()

        # transforma linhas com barras em tabela
        if limpa.startswith("|"):
            fechar_paragrafo()
            tabela = []
            # reúne todas as linhas da tabela
            while indice < len(linhas) and linhas[indice].strip().startswith("|"):
                # separa cada célula da linha
                celulas = [celula.strip() for celula in linhas[indice].strip().strip("|").split("|")]
                # ignora a linha que separa o cabeçalho
                if not all(re.fullmatch(r":?-{3,}:?", celula) for celula in celulas):
                    tabela.append([Paragraph(texto_formatado(celula), ESTILOS["lista"]) for celula in celulas])
                indice += 1
            # monta a tabela quando há conteúdo
            if tabela:
                largura_util = A4[0] - 36 * mm
                larguras = [largura_util / len(tabela[0])] * len(tabela[0])
                objeto = Table(tabela, colWidths=larguras, repeatRows=1, hAlign="LEFT")
                objeto.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#064f7b")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), FONTE_NEGRITO),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f6f8f9")),
                    ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#c7d5da")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ]))
                itens.extend([objeto, Spacer(1, 4 * mm)])
            continue

        # transforma blocos marcados em código
        if limpa.startswith("```"):
            fechar_paragrafo()
            indice += 1
            codigo = []
            # reúne as linhas até o fim do bloco
            while indice < len(linhas) and not linhas[indice].strip().startswith("```"):
                codigo.append(linhas[indice])
                indice += 1
            itens.append(Paragraph("<br/>".join(html.escape(linha) for linha in codigo), ESTILOS["codigo"]))
            indice += 1
            continue

        # transforma um título principal
        if limpa.startswith("# "):
            fechar_paragrafo()
            if primeiro_titulo:
                primeiro_titulo = False
            else:
                itens.append(PageBreak())
            itens.append(Paragraph(texto_formatado(limpa[2:]), ESTILOS["h1"]))
        # transforma um título de segundo nível
        elif limpa.startswith("## "):
            fechar_paragrafo()
            itens.append(Paragraph(texto_formatado(limpa[3:]), ESTILOS["h2"]))
        # transforma um título de terceiro nível
        elif limpa.startswith("### "):
            fechar_paragrafo()
            itens.append(Paragraph(texto_formatado(limpa[4:]), ESTILOS["h3"]))
        # transforma linhas numeradas ou com marcador em lista
        elif re.match(r"^(- |\d+\. )", limpa):
            fechar_paragrafo()
            lista = []
            # reúne todos os itens seguidos
            while indice < len(linhas) and re.match(r"^\s*(- |\d+\. )", linhas[indice]):
                item = re.sub(r"^\s*(- |\d+\. )", "", linhas[indice]).strip()
                lista.append(ListItem(Paragraph(texto_formatado(item), ESTILOS["lista"]), leftIndent=10))
                indice += 1
            itens.append(ListFlowable(lista, bulletType="bullet", leftIndent=14, bulletFontName=FONTE, bulletFontSize=6, spaceAfter=3 * mm))
            continue
        # encerra o parágrafo em uma linha vazia
        elif not limpa:
            fechar_paragrafo()
        # acumula uma linha de texto comum
        else:
            paragrafo.append(limpa.replace("  ", " "))
        indice += 1

    fechar_paragrafo()
    return itens


# gera o arquivo final
def main():
    # cria a pasta de saída
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    # define o tamanho e as margens do documento
    documento = SimpleDocTemplate(
        str(SAIDA),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title="Documentação do Projeto - Portal do GECEP",
        author="GECEP",
    )
    # lê o texto da documentação
    conteudo = ENTRADA.read_text(encoding="utf-8")
    # junta a capa com o restante do conteúdo
    historia = criar_capa() + converter_markdown(conteudo)
    # cria o pdf com o rodapé
    documento.build(historia, onFirstPage=desenhar_pagina, onLaterPages=desenhar_pagina)
    print(SAIDA)


# executa a geração somente quando o arquivo é iniciado
if __name__ == "__main__":
    main()

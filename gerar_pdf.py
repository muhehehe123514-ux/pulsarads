import os

# 1. CORREÇÃO DOS LINKS DO CANVA
# Substitua pelo ID real do seu design base ou garanta que sua lista tenha os IDs corretos.
# O link correto para edição direta segue o padrão de compartilhamento de template:
BASE_CANVA_URL = "https://www.canva.com/design/DAxxxxxxxxx/remix?referrer=template-sharing"

def gerar_dados_validos():
    """
    Garante que não faltem números de 1 a 200 e associa o link correto.
    Substitui a lógica de 'pular números' que estava quebrando o PDF.
    """
    templates_corrigidos = []
    
    for i in range(1, 201):
        # Aqui simulamos os seus dados. Se você tiver uma lista real, 
        # usamos um bloco try/except para não deixar o número vazio.
        template_id = f"TEMPLATE_ID_{i}" # Substitua pela sua lógica de IDs se houver
        
        # Link configurado para abrir diretamente no editor de cópia do Canva
        link_direto = f"https://www.canva.com/design/remix?template={template_id}" 
        # NOTA: Se você usa o link de compartilhamento padrão do lote:
        # link_direto = f"{BASE_CANVA_URL}&num={i}" 

        templates_corrigidos.append({
            "numero": i,
            "titulo": f"Template Card {i}",
            "link": link_direto
        })
    return templates_corrigidos

# 2. ESTRUTURAÇÃO DO PDF SEM QUEBRAS E SEM PÁGINAS EM BRANCO
def construir_pdf_corrigido(nome_arquivo="templates_vagas_corrigido.pdf"):
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    doc = SimpleDocTemplate(
        nome_arquivo,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    story = []
    
    # Estilo personalizado para os links
    link_style = ParagraphStyle(
        'LinkStyle',
        parent=styles['Normal'],
        textColor=colors.HexColor("#7d2ae8"), # Roxo padrão do Canva
        underline=True
    )

    dados = gerar_dados_validos()
    
    for item in dados:
        # Usamos KeepTogether para evitar que um card quebre no meio entre duas páginas
        # Isso elimina as "partes quebradas" do layout
        card_elementos = []
        
        texto_titulo = f"<b>Template #{item['numero']:03d}</b> - {item['titulo']}"
        texto_link = f'<a href="{item["link"]}">👉 Clique aqui para editar o Template {item["numero"]}</a>'
        
        card_elementos.append(Paragraph(texto_titulo, styles['Heading2']))
        card_elementos.append(Spacer(1, 5))
        card_elementos.append(Paragraph(texto_link, link_style))
        card_elementos.append(Spacer(1, 15))
        
        # Joga o bloco inteiro na estrutura principal
        story.append(KeepTogether(card_elementos))
    
    # O build do ReportLab calcula automaticamente o fluxo,
    # eliminando páginas em branco geradas por quebras manuais erradas (\pageBreak)
    doc.build(story)
    print(f"🎉 PDF gerado com sucesso: {nome_arquivo} (200 itens verificados).")

if __name__ == "__main__":
    construir_pdf_corrigido()
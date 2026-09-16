from fpdf import FPDF
import tempfile
import os
import datetime
from urllib.request import urlopen

def download_logo(url: str) -> str:
    """Baixa o logo para um arquivo temporário se for uma URL HTTP."""
    if not url or not url.startswith('http'):
        return None
    try:
        response = urlopen(url)
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        temp_file.write(response.read())
        temp_file.close()
        return temp_file.name
    except Exception as e:
        print(f"Erro ao baixar logo: {e}")
        return None

def format_currency(value):
    try:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "R$ 0,00"

def generate_dashboard_pdf(empresa_data: dict, kpis: dict, top_produtos: list, contas_resumo: dict, periodo: str) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    
    # Cores da empresa (Vermelho A7SYSTEM ou default)
    cor_primaria = empresa_data.get("corPrimaria", "#DC2626")
    try:
        r = int(cor_primaria[1:3], 16)
        g = int(cor_primaria[3:5], 16)
        b = int(cor_primaria[5:7], 16)
    except:
        r, g, b = 220, 38, 38  # DC2626

    # ==== CABEÇALHO ====
    logo_url = empresa_data.get("logoUrl")
    logo_path = download_logo(logo_url) if logo_url else None

    if logo_path and os.path.exists(logo_path):
        try:
            pdf.image(logo_path, 10, 10, 30)
        except Exception:
            pass
        finally:
            if logo_path:
                os.unlink(logo_path)
    
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(r, g, b)
    pdf.cell(40) # Pula a imagem
    nome_empresa = empresa_data.get("nomeFantasia", "A7SYSTEM")
    pdf.cell(100, 10, nome_empresa.encode('latin-1', 'replace').decode('latin-1'), ln=1)
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(40)
    cnpj = empresa_data.get("cnpj", "00.000.000/0000-00")
    pdf.cell(100, 5, f"CNPJ: {cnpj}", ln=1)
    
    pdf.ln(10)
    
    # ==== TÍTULO ====
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, "RELATÓRIO FINANCEIRO", ln=1, align="C")
    
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, f"Período: {periodo}", ln=1, align="C")
    pdf.ln(10)
    
    # ==== SEÇÃO KPIs ====
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 10, "RESUMO GERAL", ln=1)
    pdf.set_text_color(0, 0, 0)
    
    # Tabela 2 colunas para KPIs
    pdf.set_font("helvetica", "", 11)
    col_width = 95
    row_height = 8
    
    kpi_lines = [
        (f"Total de Vendas: {format_currency(kpis.get('total_vendas', 0))}", f"Qtd Vendas: {kpis.get('qtd_vendas', 0)}"),
        (f"Total de Compras: {format_currency(kpis.get('total_compras', 0))}", f"Qtd Compras: {kpis.get('qtd_compras', 0)}"),
        (f"Saldo Período: {format_currency(kpis.get('saldo', 0))}", f"Lucro Estimado: {format_currency(kpis.get('lucro_estimado', 0))}"),
        (f"Contas a Pagar (Aberto): {format_currency(contas_resumo.get('em_aberto', 0))}", f"Recebimentos: {format_currency(kpis.get('total_recebimentos', 0))}"),
        (f"Contas Atrasadas: {format_currency(contas_resumo.get('atrasadas', 0))}", f"Estoque Crítico: {kpis.get('produtos_estoque_critico', 0)} produtos")
    ]
    
    for l1, l2 in kpi_lines:
        pdf.cell(col_width, row_height, l1.encode('latin-1', 'replace').decode('latin-1'), border=1)
        pdf.cell(col_width, row_height, l2.encode('latin-1', 'replace').decode('latin-1'), border=1, ln=1)
        
    pdf.ln(10)
    
    # ==== TOP PRODUTOS ====
    pdf.set_font("helvetica", "B", 14)
    pdf.set_text_color(r, g, b)
    pdf.cell(0, 10, "TOP 10 PRODUTOS MAIS VENDIDOS", ln=1)
    pdf.set_text_color(0, 0, 0)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(20, 8, "Pos.", border=1, fill=True, align="C")
    pdf.cell(100, 8, "Produto", border=1, fill=True)
    pdf.cell(30, 8, "Qtd", border=1, fill=True, align="C")
    pdf.cell(40, 8, "Valor Total", border=1, fill=True, align="C")
    pdf.ln()
    
    pdf.set_font("helvetica", "", 10)
    for idx, prod in enumerate(top_produtos[:10]):
        nome = str(prod.get('nome', ''))[:45]
        pdf.cell(20, 8, str(idx+1), border=1, align="C")
        pdf.cell(100, 8, nome.encode('latin-1', 'replace').decode('latin-1'), border=1)
        pdf.cell(30, 8, str(prod.get('qtd', 0)), border=1, align="C")
        pdf.cell(40, 8, format_currency(prod.get('valor', 0)), border=1, align="C")
        pdf.ln()
        
    pdf.ln(10)
    
    # ==== RODAPÉ ====
    pdf.set_y(-15)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    data_hora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    pdf.cell(0, 10, f"A7SYSTEM - Gerado em {data_hora}", 0, 0, 'C')
    
    return bytes(pdf.output(dest='S'))

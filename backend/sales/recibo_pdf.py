import io
from datetime import datetime
from fpdf import FPDF
import urllib.request
import tempfile
import os

class ReciboPDF(FPDF):
    def __init__(self, empresa_data, cor_primaria=(220, 38, 38), *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.empresa_data = empresa_data
        self.cor_primaria = cor_primaria
        self.logo_path = None

    def header(self):
        # Cabeçalho
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                self.image(self.logo_path, 10, 8, 33)
            except Exception:
                pass
        
        self.set_font("helvetica", "B", 15)
        self.set_text_color(*self.cor_primaria)
        # Título da Empresa
        nome_empresa = self.empresa_data.get('nomeFantasia', 'Empresa')
        self.cell(40) # Pula o logo
        self.cell(0, 10, nome_empresa, border=0, ln=1, align="L")
        
        self.set_font("helvetica", "", 10)
        self.set_text_color(0, 0, 0)
        cnpj = self.empresa_data.get('cnpj', '')
        self.cell(40)
        self.cell(0, 5, f"CNPJ: {cnpj}", border=0, ln=1, align="L")
        self.ln(10)

    def footer(self):
        # Rodapé
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        agora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        self.cell(0, 10, f"Documento gerado automaticamente pelo A7SYSTEM - {agora}", border=0, ln=0, align="C")

def download_logo(logo_url: str) -> str:
    """
    Tenta baixar o logo da URL e retorna o caminho do arquivo temporário.
    """
    if not logo_url:
        return None
        
    try:
        # Cria um arquivo temporário
        fd, path = tempfile.mkstemp(suffix=".png")
        os.close(fd)
        
        # Baixa a imagem
        req = urllib.request.Request(logo_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(path, 'wb') as f:
                f.write(response.read())
        return path
    except Exception as e:
        print(f"Erro ao baixar logo: {e}")
        return None

def hex_to_rgb(hex_color: str):
    """Converte cor em hexa para tuple RGB."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    return (220, 38, 38) # Default vermelho A7SYSTEM

def generate_recibo_pdf(venda_data: dict, empresa_data: dict, cliente_data: dict, recebimentos: list) -> bytes:
    """
    Gera o recibo PDF da venda usando FPDF2 e retorna os bytes do documento.
    """
    # Determinar cor primária
    tema = empresa_data.get('tema', {})
    cor_hex = tema.get('corPrimaria', '#DC2626')
    cor_primaria = hex_to_rgb(cor_hex)
    
    pdf = ReciboPDF(empresa_data=empresa_data, cor_primaria=cor_primaria, format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Baixar logo se existir
    logo_url = empresa_data.get('logoUrl')
    if logo_url:
        pdf.logo_path = download_logo(logo_url)
        
    pdf.add_page()
    
    # Título do Recibo
    pdf.set_font("helvetica", "B", 16)
    pdf.set_text_color(*cor_primaria)
    pdf.cell(0, 10, "RECIBO DE VENDA", ln=1, align="C")
    pdf.ln(5)
    
    # Informações do Pedido e Cliente
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(30, 6, "Nº do Pedido:", ln=0)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(60, 6, venda_data.get("numeroPedido", ""), ln=0)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(20, 6, "Data:", ln=0)
    pdf.set_font("helvetica", "", 10)
    data_venda = venda_data.get("dataVenda", "")
    if isinstance(data_venda, str):
        data_str = data_venda[:10] # YYYY-MM-DD
    elif hasattr(data_venda, "timestamp"): # datetime object
        data_str = data_venda.strftime("%d/%m/%Y %H:%M")
    else:
        data_str = str(data_venda)
    pdf.cell(0, 6, data_str, ln=1)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "Cliente:", ln=0)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 6, cliente_data.get("nome", "Cliente não identificado"), ln=1)
    
    doc_cliente = cliente_data.get("cpf") or cliente_data.get("cnpj") or "Não informado"
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(30, 6, "CPF/CNPJ:", ln=0)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 6, doc_cliente, ln=1)
    pdf.ln(5)
    
    # Tabela de Itens
    pdf.set_fill_color(*cor_primaria)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 9)
    
    # Cabeçalho da tabela (Larguras: 90, 20, 25, 25, 30) = 190
    pdf.cell(90, 8, " Descrição", border=1, fill=True, align="L")
    pdf.cell(20, 8, "Qtd", border=1, fill=True, align="C")
    pdf.cell(25, 8, "V. Unit.", border=1, fill=True, align="R")
    pdf.cell(25, 8, "Desc.", border=1, fill=True, align="R")
    pdf.cell(30, 8, "Total", border=1, fill=True, align="R", ln=1)
    
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "", 9)
    
    itens = venda_data.get("itens", [])
    subtotal = 0
    total_descontos = 0
    
    for item in itens:
        desc = item.get("descricao", "")[:45] # Truncar se muito longo
        qtd = item.get("quantidade", 0)
        v_unit = item.get("valorUnitario", 0)
        desc_item = item.get("desconto", 0)
        t_item = item.get("valorTotal", 0)
        
        pdf.cell(90, 8, f" {desc}", border=1, align="L")
        pdf.cell(20, 8, str(qtd), border=1, align="C")
        pdf.cell(25, 8, f"R$ {v_unit:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), border=1, align="R")
        pdf.cell(25, 8, f"R$ {desc_item:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), border=1, align="R")
        pdf.cell(30, 8, f"R$ {t_item:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), border=1, align="R", ln=1)
        
        subtotal += (qtd * v_unit)
        total_descontos += desc_item
        
    pdf.ln(5)
    
    # Totais
    total_geral = venda_data.get("valorTotal", 0)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(140, 6, "Subtotal:", align="R")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(50, 6, f"R$ {subtotal:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), align="R", ln=1)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(140, 6, "Total de Descontos:", align="R")
    pdf.set_font("helvetica", "", 10)
    pdf.cell(50, 6, f"R$ {total_descontos:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), align="R", ln=1)
    
    pdf.set_font("helvetica", "B", 14)
    pdf.cell(140, 8, "TOTAL GERAL:", align="R")
    pdf.cell(50, 8, f"R$ {total_geral:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), align="R", ln=1)
    pdf.ln(10)
    
    # Recebimentos (se houver)
    if recebimentos:
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(*cor_primaria)
        pdf.cell(0, 8, "RECEBIMENTOS", ln=1)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "B", 9)
        pdf.cell(40, 6, "Data", border=1, fill=True)
        pdf.cell(50, 6, "Forma de Pagto", border=1, fill=True)
        pdf.cell(50, 6, "Valor", border=1, fill=True, ln=1)
        
        pdf.set_font("helvetica", "", 9)
        for rec in recebimentos:
            data_rec = rec.get("data", "")
            if isinstance(data_rec, str):
                d_str = data_rec[:10]
            elif hasattr(data_rec, "timestamp"):
                d_str = data_rec.strftime("%d/%m/%Y")
            else:
                d_str = str(data_rec)
                
            forma = rec.get("forma", "")
            valor_rec = rec.get("valor", 0)
            
            pdf.cell(40, 6, d_str, border=1)
            pdf.cell(50, 6, forma, border=1)
            pdf.cell(50, 6, f"R$ {valor_rec:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."), border=1, ln=1)
    
    # Retorna o arquivo PDF em bytes
    pdf_bytes = pdf.output(dest="S")
    
    # Cleanup logo temp file
    if pdf.logo_path and os.path.exists(pdf.logo_path):
        try:
            os.remove(pdf.logo_path)
        except Exception:
            pass
            
    return pdf_bytes

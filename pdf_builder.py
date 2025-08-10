# pdf_builder.py
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import math
import os

# Türkçe karakterleri destekleyen fontu kaydet
def register_turkish_font():
    try:
        # Önce sisteminizdeki uygun bir fontu deneyin
        font_path = None
        
        # Windows için
        if os.name == 'nt':
            font_paths = [
                "C:/Windows/Fonts/calibri.ttf",
                "C:/Windows/Fonts/arial.ttf",
                "C:/Windows/Fonts/tahoma.ttf"
            ]
            for path in font_paths:
                if os.path.exists(path):
                    font_path = path
                    break
        
        # macOS için
        elif os.name == 'posix' and 'darwin' in os.uname().sysname.lower():
            font_paths = [
                "/System/Library/Fonts/Arial.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf"
            ]
            for path in font_paths:
                if os.path.exists(path):
                    font_path = path
                    break
        
        # Linux için
        elif os.name == 'posix':
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/liberation/LiberationSans-Regular.ttf"
            ]
            for path in font_paths:
                if os.path.exists(path):
                    font_path = path
                    break
        
        # Font bulunduysa kaydet
        if font_path:
            pdfmetrics.registerFont(TTFont('TurkishFont', font_path))
            return 'TurkishFont'
        else:
            # Font bulunamazsa varsayılan fontu kullan ama encoding'i ayarla
            return 'Helvetica'
    except Exception as e:
        print(f"Font kaydetme hatası: {e}")
        return 'Helvetica'

# Türkçe fontu kaydet
turkish_font_name = register_turkish_font()

def create_seo_pdf(domain, keywords_data):
    """
    Gelişmiş SEO raporu PDF'i oluşturur.
    
    Args:
        domain (str): Raporun oluşturulacağı domain
        keywords_data (list): Anahtar kelime verileri listesi
        
    Returns:
        BytesIO: PDF içeren buffer
    """
    buffer = BytesIO()
    
    # PDF dokümanı oluştur
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
        encoding='utf-8'  # <-- ENCODING AYARI
    )
    
    # Stilleri al
    styles = getSampleStyleSheet()
    
    # Türkçe fontlu özel stiller oluştur
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=HexColor('#2c3e50'),
        alignment=TA_CENTER,
        fontName=turkish_font_name  # <-- TÜRKÇE FONT
    ))
    
    styles.add(ParagraphStyle(
        name='CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        spaceAfter=12,
        textColor=HexColor('#34495e'),
        borderWidth=1,
        borderColor=HexColor('#3498db'),
        borderPadding=5,
        fontName=turkish_font_name  # <-- TÜRKÇE FONT
    ))
    
    styles.add(ParagraphStyle(
        name='CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=10,
        textColor=HexColor('#34495e'),
        fontName=turkish_font_name  # <-- TÜRKÇE FONT
    ))
    
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        textColor=HexColor('#2c3e50'),
        fontName=turkish_font_name  # <-- TÜRKÇE FONT
    ))
    
    # İçerik elemanları listesi
    elements = []
    
    # Başlık
    elements.append(Paragraph(f"<b>SEO Performans Raporu</b>", styles['CustomTitle']))
    elements.append(Spacer(1, 12))
    
    # Domain bilgisi
    elements.append(Paragraph(f"<b>Domain:</b> {domain}", styles['CustomSubheading']))
    
    # Tarih bilgisi
    report_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    elements.append(Paragraph(f"<b>Rapor Tarihi:</b> {report_date}", styles['CustomSubheading']))
    elements.append(Spacer(1, 20))
    
    # Hesaplamalar
    total_clicks = sum(kw.get('clicks', 0) for kw in keywords_data)
    total_impressions = sum(kw.get('impressions', 0) for kw in keywords_data)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_position = sum(kw.get('position', 0) for kw in keywords_data) / len(keywords_data) if keywords_data else 0
    
    # Özet bölümü
    elements.append(Paragraph("<b>Performans Özeti</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 12))
    
    # Özet tablosu
    summary_data = [
        ['Metrik', 'Değer', 'Performans Değerlendirmesi'],
        ['Toplam Tıklama', str(total_clicks), get_performance_rating(total_clicks, 'clicks')],
        ['Toplam Gösterim', str(total_impressions), get_performance_rating(total_impressions, 'impressions')],
        ['Ortalama CTR', f"{avg_ctr:.2f}%", get_performance_rating(avg_ctr, 'ctr')],
        ['Ortalama Pozisyon', f"{avg_position:.2f}", get_position_rating(avg_position)]
    ]
    
    summary_table = Table(summary_data, colWidths=[2*inch, 1.5*inch, 2.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),  # <-- TÜRKÇE FONT
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#ecf0f1')),
        ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),  # <-- TÜRKÇE FONT
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Anahtar kelime analizi bölümü
    elements.append(Paragraph("<b>Anahtar Kelime Performansı</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 12))
    
    # Anahtar kelime verilerini hazırla
    if keywords_data:
        # En iyi performanslı 5 anahtar kelimeyi belirle
        top_keywords = sorted(keywords_data, key=lambda x: x.get('clicks', 0), reverse=True)[:5]
        
        # En iyi performanslı anahtar kelimeler
        elements.append(Paragraph("<b>En İyi Performanslı Anahtar Kelimeler</b>", styles['CustomSubheading']))
        elements.append(Spacer(1, 6))
        
        for i, kw in enumerate(top_keywords):
            keys = kw.get('keys', [''])[0]
            clicks = kw.get('clicks', 0)
            impressions = kw.get('impressions', 0)
            ctr = kw.get('ctr', 0) * 100
            position = kw.get('position', 0)
            
            elements.append(Paragraph(
                f"<b>{i+1}. {keys}</b> - {clicks} tıklama, {impressions} gösterim, CTR: {ctr:.2f}%, Pozisyon: {position:.2f}", 
                styles['CustomBody']
            ))
        
        elements.append(Spacer(1, 20))
        
        # Tüm anahtar kelimeler tablosu
        elements.append(Paragraph("<b>Tüm Anahtar Kelimeler</b>", styles['CustomSubheading']))
        elements.append(Spacer(1, 6))
        
        # Tablo verilerini hazırla
        table_data = [['Anahtar Kelime', 'Tıklama', 'Gösterim', 'CTR', 'Pozisyon', 'Performans']]
        
        for kw in keywords_data:
            keys = kw.get('keys', [''])[0]
            clicks = kw.get('clicks', 0)
            impressions = kw.get('impressions', 0)
            ctr = kw.get('ctr', 0) * 100
            position = kw.get('position', 0)
            
            # Performans değerlendirmesi
            performance = get_keyword_performance(clicks, impressions, ctr, position)
            
            table_data.append([
                keys[:25] if len(keys) > 25 else keys,
                str(clicks),
                str(impressions),
                f"{ctr:.2f}%",
                f"{position:.2f}",
                performance
            ])
        
        # Tabloyu oluştur
        keyword_table = Table(table_data, colWidths=[2.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1.2*inch])
        keyword_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),  # <-- TÜRKÇE FONT
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),  # <-- TÜRKÇE FONT
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        elements.append(keyword_table)
    else:
        elements.append(Paragraph("Anahtar kelime verisi bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # Öneriler bölümü
    elements.append(Paragraph("<b>SEO Önerileri</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 12))
    
    # Dinamik öneriler oluştur
    recommendations = generate_recommendations(keywords_data, avg_ctr, avg_position)
    
    for rec in recommendations:
        elements.append(Paragraph(f"• {rec}", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # Alt bilgi
    elements.append(Paragraph(
        "Bu rapor Google Search Console verilerine dayanmaktadır. Rapor otomatik olarak oluşturulmuştur.", 
        styles['CustomBody']
    ))
    
    # PDF'i oluştur
    doc.build(elements)
    buffer.seek(0)
    return buffer

def get_performance_rating(value, metric_type):
    """Performans değerlendirmesi için metin döndürür"""
    if metric_type == 'clicks':
        if value > 100:
            return "Mükemmel"
        elif value > 50:
            return "İyi"
        elif value > 20:
            return "Orta"
        else:
            return "Geliştirilebilir"
    elif metric_type == 'impressions':
        if value > 1000:
            return "Mükemmel"
        elif value > 500:
            return "İyi"
        elif value > 200:
            return "Orta"
        else:
            return "Geliştirilebilir"
    elif metric_type == 'ctr':
        if value > 5:
            return "Mükemmel"
        elif value > 3:
            return "İyi"
        elif value > 1:
            return "Orta"
        else:
            return "Geliştirilebilir"
    return "Belirsiz"

def get_position_rating(position):
    """Pozisyon değerlendirmesi için metin döndürür"""
    if position <= 3:
        return "Mükemmel"
    elif position <= 10:
        return "İyi"
    elif position <= 20:
        return "Orta"
    else:
        return "Geliştirilebilir"

def get_keyword_performance(clicks, impressions, ctr, position):
    """Anahtar kelime performansını değerlendirir"""
    # Basit bir puanlama sistemi
    score = 0
    
    # Tıklama puanı
    if clicks > 50:
        score += 25
    elif clicks > 20:
        score += 15
    elif clicks > 5:
        score += 5
    
    # CTR puanı
    if ctr > 5:
        score += 25
    elif ctr > 3:
        score += 15
    elif ctr > 1:
        score += 5
    
    # Pozisyon puanı
    if position <= 3:
        score += 50
    elif position <= 10:
        score += 30
    elif position <= 20:
        score += 15
    
    # Sonucu döndür
    if score >= 80:
        return "Mükemmel"
    elif score >= 60:
        return "İyi"
    elif score >= 40:
        return "Orta"
    else:
        return "Geliştirilebilir"

def generate_recommendations(keywords_data, avg_ctr, avg_position):
    """Dinamik SEO önerileri oluşturur"""
    recommendations = []
    
    # Ortalama CTR düşükse
    if avg_ctr < 2:
        recommendations.append("Meta başlıklarınızı ve açıklamalarınızı optimize ederek tıklama oranını (CTR) artırın.")
    
    # Ortalama pozisyon düşükse
    if avg_position > 15:
        recommendations.append("İçerik kalitenizi artırın ve ilgili anahtar kelimeler için daha optimize edin.")
    
    # En az tıklanan anahtar kelimeler için
    if keywords_data:
        low_click_keywords = [kw for kw in keywords_data if kw.get('clicks', 0) < 5]
        if low_click_keywords:
            recommendations.append("Düşük tıklama alan anahtar kelimeler için içeriklerinizi gözden geçirin.")
    
    # En yüksek gösterimli anahtar kelimeler için
    if keywords_data:
        high_imp_keywords = sorted(keywords_data, key=lambda x: x.get('impressions', 0), reverse=True)[:3]
        if high_imp_keywords:
            top_keyword = high_imp_keywords[0].get('keys', [''])[0]
            recommendations.append(f"'{top_keyword}' anahtar kelimesi için daha fazla içerik oluşturun.")
    
    # Genel öneriler
    recommendations.append("Düzenli olarak yeni ve kaliteli içerik yayınlayın.")
    recommendations.append("Teknik SEO aspectlerinizi (site hızı, mobil uyumluluk vb.) düzenli olarak kontrol edin.")
    
    return recommendations # Bu satır doğru.

# --- Hata veren kod parçası aşağıdan başlıyor ---
# Bu blok, generate_recommendations fonksiyonunun dışına taşındı
def create_page_analysis_pdf(domain, pageData, selectedPage):
    """
    Sayfa analizi raporu PDF'i oluşturur.
    
    Args:
        domain (str): Raporun oluşturulacağı domain
        pageData (dict): Sayfa analizi verileri
        selectedPage (str): Analiz edilen sayfa
        
    Returns:
        BytesIO: PDF içeren buffer
    """
    buffer = BytesIO()
    
    # PDF dokümanı oluştur
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
        encoding='utf-8'
    )
    
    # Stilleri al
    styles = getSampleStyleSheet()
    
    # Türkçe fontlu özel stiller oluştur
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        spaceAfter=30,
        textColor=HexColor('#2c3e50'),
        alignment=TA_CENTER,
        fontName=turkish_font_name
    ))
    
    styles.add(ParagraphStyle(
        name='CustomHeading',
        parent=styles['Heading2'],
        fontSize=18,
        spaceAfter=12,
        textColor=HexColor('#34495e'),
        borderWidth=1,
        borderColor=HexColor('#3498db'),
        borderPadding=5,
        fontName=turkish_font_name
    ))
    
    styles.add(ParagraphStyle(
        name='CustomSubheading',
        parent=styles['Heading3'],
        fontSize=14,
        spaceAfter=10,
        textColor=HexColor('#34495e'),
        fontName=turkish_font_name
    ))
    
    styles.add(ParagraphStyle(
        name='CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        textColor=HexColor('#2c3e50'),
        fontName=turkish_font_name
    ))
    
    styles.add(ParagraphStyle(
        name='CustomSmall',
        parent=styles['Normal'],
        fontSize=9,
        spaceAfter=4,
        textColor=HexColor('#7f8c8d'),
        fontName=turkish_font_name
    ))
    
    # İçerik elemanları listesi
    elements = []
    
    # Başlık
    elements.append(Paragraph(f"<b>Sayfa Analizi Raporu</b>", styles['CustomTitle']))
    elements.append(Spacer(1, 12))
    
    # Domain bilgisi
    elements.append(Paragraph(f"<b>Domain:</b> {domain}", styles['CustomSubheading']))
    
    # Sayfa bilgisi
    elements.append(Paragraph(f"<b>Analiz Edilen Sayfa:</b> {selectedPage}", styles['CustomSubheading']))
    
    # Tarih bilgisi
    report_date = datetime.now().strftime("%d/%m/%Y %H:%M")
    elements.append(Paragraph(f"<b>Rapor Tarihi:</b> {report_date}", styles['CustomSubheading']))
    elements.append(Spacer(1, 20))
    
    # Genel skor kartı
    overall_score = pageData.get('overallScore', 0)
    
    elements.append(Paragraph("<b>Genel SEO Skoru</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    # Skor tablosu
    score_data = [
        ['Kategori', 'Skor', 'Değerlendirme'],
        ['Performans', f"{pageData.get('performance', {}).get('score', 0)}/100", get_performance_rating(pageData.get('performance', {}).get('score', 0))],
        ['SEO', f"{pageData.get('seo', {}).get('score', 0)}/100", get_performance_rating(pageData.get('seo', {}).get('score', 0))],
        ['Erişilebilirlik', f"{pageData.get('accessibility', {}).get('score', 0)}/100", get_performance_rating(pageData.get('accessibility', {}).get('score', 0))],
        ['En İyi Uygulamalar', f"{pageData.get('bestPractices', {}).get('score', 0)}/100", get_performance_rating(pageData.get('bestPractices', {}).get('score', 0))]
    ]
    
    score_table = Table(score_data, colWidths=[2.5*inch, 1*inch, 2*inch])
    score_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
        ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
    ]))
    
    elements.append(score_table)
    elements.append(Spacer(1, 20))
    
    # Performans detayları
    elements.append(Paragraph("<b>Performans Detayları</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    performance_metrics = pageData.get('performance', {}).get('metrics', {})
    if performance_metrics:
        metrics_data = [['Metrik', 'Değer', 'Durum']]
        
        for metric_id, metric_data in list(performance_metrics.items())[:5]:
            if 'displayValue' in metric_data:
                metric_name = metric_data.get('title', metric_id)
                metric_value = metric_data.get('displayValue', 'N/A')
                metric_score = metric_data.get('score', 0)
                status = get_metric_status(metric_score)
                
                metrics_data.append([metric_name, metric_value, status])
        
        metrics_table = Table(metrics_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(metrics_table)
    else:
        elements.append(Paragraph("Performans metrikleri bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # SEO sorunları
    elements.append(PageBreak())
    elements.append(Paragraph("<b>SEO Sorunları</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    seo_issues = pageData.get('seo', {}).get('issues', [])
    if seo_issues:
        issues_data = [['Sorun', 'Tür']]
        
        for issue in seo_issues[:10]:  # İlk 10 soru
            issue_title = issue.get('title', 'Belirsiz')
            issue_type = issue.get('type', 'warning')
            type_text = 'Hata' if issue_type == 'error' else 'Uyarı'
            
            issues_data.append([issue_title, type_text])
        
        issues_table = Table(issues_data, colWidths=[4*inch, 1.5*inch])
        issues_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(issues_table)
    else:
        elements.append(Paragraph("SEO sorunu bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # Erişilebilirlik sorunları
    elements.append(Paragraph("<b>Erişilebilirlik Sorunları</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    accessibility_issues = pageData.get('accessibility', {}).get('issues', [])
    if accessibility_issues:
        accessibility_data = [['Sorun', 'Sayı']]
        
        for issue in accessibility_issues[:10]:  # İlk 10 soru
            issue_title = issue.get('title', 'Belirsiz')
            issue_count = issue.get('count', 1)
            
            accessibility_data.append([issue_title, str(issue_count)])
        
        accessibility_table = Table(accessibility_data, colWidths=[4*inch, 1*inch])
        accessibility_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(accessibility_table)
    else:
        elements.append(Paragraph("Erişilebilirlik sorunu bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # En iyi uygulamalar
    elements.append(Paragraph("<b>En İyi Uygulamalar</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    best_practices = pageData.get('bestPractices', {}).get('items', [])
    if best_practices:
        practices_data = [['Uygulama', 'Durum']]
        
        for practice in best_practices[:10]:  # İlk 10 uygulama
            practice_title = practice.get('title', 'Belirsiz')
            practice_status = practice.get('status', 'warning')
            status_text = 'Başarılı' if practice_status == 'pass' else ('Başarısız' if practice_status == 'fail' else 'Uyarı')
            
            practices_data.append([practice_title, status_text])
        
        practices_table = Table(practices_data, colWidths=[4*inch, 1.5*inch])
        practices_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        
        elements.append(practices_table)
    else:
        elements.append(Paragraph("En iyi uygulama verisi bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # Sayfa performansı
    page_details = pageData.get('pageDetails', [])
    if page_details:
        elements.append(Paragraph("<b>Sayfa Performansı</b>", styles['CustomHeading']))
        elements.append(Spacer(1, 10))
        
        details_data = [['Sayfa', 'Tıklama', 'Gösterim', 'CTR', 'Pozisyon']]
        
        for page in page_details:
            path = page.get('path', '/')
            clicks = page.get('clicks', 0)
            impressions = page.get('impressions', 0)
            ctr = page.get('ctr', 0) * 100
            position = page.get('position', 0)
            
            details_data.append([
                path[:30] + '...' if len(path) > 30 else path,
                str(clicks),
                str(impressions),
                f"{ctr:.2f}%",
                f"{position:.2f}"
            ])
        
        details_table = Table(details_data, colWidths=[1.5*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), turkish_font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#bdc3c7')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 1), (-1, -1), turkish_font_name),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        elements.append(details_table)
        elements.append(Spacer(1, 20))
    
    # Öneriler
    elements.append(Paragraph("<b>SEO Önerileri</b>", styles['CustomHeading']))
    elements.append(Spacer(1, 10))
    
    recommendations = pageData.get('recommendations', [])
    if recommendations:
        for rec in recommendations:
            elements.append(Paragraph(f"• {rec}", styles['CustomBody']))
    else:
        elements.append(Paragraph("Öneri bulunamadı.", styles['CustomBody']))
    
    elements.append(Spacer(1, 20))
    
    # Alt bilgi
    elements.append(Paragraph(
        "Bu rapor Google PageSpeed Insights ve Google Search Console verilerine dayanmaktadır. Rapor otomatik olarak oluşturulmuştur.", 
        styles['CustomSmall']
    ))
    
    # PDF'i oluştur
    doc.build(elements)
    buffer.seek(0)
    return buffer

def get_score_color(score):
    """Skora göre renk döndürür"""
    if score >= 90:
        return HexColor('#27ae60')  # Yeşil
    elif score >= 70:
        return HexColor('#f39c12')  # Turuncu
    else:
        return HexColor('#e74c3c')  # Kırmızı

def get_performance_rating(score):
    """Performans değerlendirmesi için metin döndürür"""
    if score >= 90:
        return "Mükemmel"
    elif score >= 70:
        return "İyi"
    elif score >= 50:
        return "Orta"
    else:
        return "Geliştirilebilir"

def get_metric_status(score):
    """Metrik durumunu döndürür"""
    if score == 1:
        return "Geçti"
    elif score == 0.5:
        return "Kısmen Geçti"
    else:
        return "Başarısız"
    
    return recommendations
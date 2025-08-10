import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CRow,
  CCol,
  CButton,
  CSpinner,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CProgress,
  CProgressBar,
  CFormSelect
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import * as icons from '@coreui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PageAnalysis = () => {
  const { site } = useParams();
  const navigate = useNavigate();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState('');
  const [pages, setPages] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Sayfaları çekme fonksiyonu
  const fetchPages = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/sites/${site}/pages`, {
        withCredentials: true
      });
      setPages(response.data.pages || []);

      // İlk sayfayı varsayılan olarak seç
      if (response.data.pages && response.data.pages.length > 0) {
        setSelectedPage(response.data.pages[0].url);
      }
    } catch (err) {
      console.error("Sayfaları çekme hatası:", err);
      setError("Sayfalar alınamadı.");
    }
  };

  // Sayfa analizi verilerini çekme fonksiyonu
  const fetchPageAnalysis = async (pageUrl) => {
    if (!pageUrl) return;

    setAnalysisLoading(true);
    setError(null);

    try {
      // Önce site ayarlarını çek
      const settingsResponse = await axios.get(`http://localhost:5000/sites/${site}/settings`, {
        withCredentials: true
      });

      const { apiKey, apiKeyStatus } = settingsResponse.data;

      if (apiKeyStatus !== 'valid' || !apiKey) {
        setError("Sayfa analizi için geçerli bir Google API Key gereklidir. Lütfen site ayarlarından API key'i yapılandırın.");
        return;
      }

      // Sayfa için tam URL oluştur
      let fullUrl;
      if (pageUrl.startsWith('http://') || pageUrl.startsWith('https://')) {
        fullUrl = pageUrl;
      } else {
        const cleanPageUrl = pageUrl.startsWith('/') ? pageUrl.substring(1) : pageUrl;
        fullUrl = `https://${site}/${cleanPageUrl}`;
      }

      console.log(`Oluşturulan tam URL: ${fullUrl}`);

      const encodedUrl = encodeURIComponent(fullUrl);

      // Lighthouse verilerini çek
      console.log("Lighthouse verileri çekiliyor...");
      const lighthouseResponse = await axios.get(`http://localhost:5000/sites/${site}/lighthouse?url=${encodedUrl}`, {
        withCredentials: true
      });
      console.log("Lighthouse verileri alındı");

      // Search Console verilerini çek
      console.log("Search Console verileri çekiliyor...");
      const searchConsoleResponse = await axios.get(`http://localhost:5000/sites/${site}/search-console?url=${encodedUrl}`, {
        withCredentials: true
      });
      console.log("Search Console verileri alındı");

      // Lighthouse verilerinin yapısını kontrol et
      const lighthouseData = lighthouseResponse.data;
      console.log("Lighthouse veri yapısı:", {
        performance: lighthouseData.performance ? "var" : "yok",
        seo: lighthouseData.seo ? "var" : "yok",
        accessibility: lighthouseData.accessibility ? "var" : "yok",
        bestPractices: lighthouseData.bestPractices ? "var" : "yok"
      });

      // Audits'i güvenli bir şekilde al
      const getAudits = (category) => {
        if (!category || !category.audits) {
          console.warn(`${category} audits bulunamadı`);
          return [];
        }
        return Object.values(category.audits);
      };

      // Verileri birleştir
      const combinedData = {
        overallScore: Math.round(
          (lighthouseData.performance?.score || 0) * 0.4 +
          (lighthouseData.seo?.score || 0) * 0.3 +
          (lighthouseData.accessibility?.score || 0) * 0.2 +
          (lighthouseData.bestPractices?.score || 0) * 0.1
        ),
        performance: {
          score: Math.round((lighthouseData.performance?.score || 0) * 100),
          metrics: lighthouseData.performance?.audits || {}
        },
        seo: {
          score: Math.round((lighthouseData.seo?.score || 0) * 100),
          issues: getAudits(lighthouseData.seo)
            .filter(audit => audit.score !== 1)
            .map(audit => ({
              type: audit.score === 0 ? 'error' : 'warning',
              title: audit.title,
              description: audit.description
            }))
        },
        accessibility: {
          score: Math.round((lighthouseData.accessibility?.score || 0) * 100),
          issues: getAudits(lighthouseData.accessibility)
            .filter(audit => audit.score !== 1)
            .map(audit => ({
              type: audit.score === 0 ? 'error' : 'warning',
              title: audit.title,
              count: audit.details?.items?.length || 1
            }))
        },
        bestPractices: {
          score: Math.round((lighthouseData.bestPractices?.score || 0) * 100),
          items: getAudits(lighthouseData.bestPractices)
            .filter(audit => audit.score !== 1)
            .map(audit => ({
              title: audit.title,
              status: audit.score === 0 ? 'fail' : 'warning'
            }))
        },
        pageDetails: searchConsoleResponse.data.pageDetails || [],
        recommendations: generateRecommendations(lighthouseData)
      };

      console.log("Birleştirilmiş veriler oluşturuldu");
      setPageData(combinedData);
    } catch (err) {
      console.error("Sayfa analizi hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);

        let errorMessage = "Sayfa analizi yapılamadı.";
        if (err.response.data && err.response.data.detail) {
          errorMessage += ` ${err.response.data.detail}`;
        }

        // Özel hata mesajları
        if (err.response.status === 400) {
          errorMessage = "Geçersiz istek. Lütfen URL'yi kontrol edin.";
        } else if (err.response.status === 401) {
          errorMessage = "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.";
        } else if (err.response.status === 403) {
          errorMessage = "Bu işlem için yetkiniz yok.";
        } else if (err.response.status === 404) {
          errorMessage = "Sayfa bulunamadı.";
        } else if (err.response.status === 429) {
          errorMessage = "Çok fazla istek yapıldı. Lütfen daha sonra tekrar deneyin.";
        } else if (err.response.status === 500) {
          errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
        } else if (err.response.status === 504) {
          errorMessage = "İstek zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.";
        }

        setError(errorMessage);
      } else if (err.request) {
        console.error("İstek hatası:", err.request);
        setError("Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError("Bilinmeyen bir hata oluştu.");
      }
    } finally {
      setAnalysisLoading(false);
    }
  };

  // PDF oluşturma fonksiyonu
const generatePDF = async () => {
  if (!pageData) return;

  setPdfLoading(true);

  try {
    // PDF oluşturma için verileri hazırla
    const pdfData = {
      domain: site,
      selectedPage: selectedPage,
      pageData: pageData
    };

    // Backend'e PDF oluşturma isteği gönder
    const response = await axios.post(
      `http://localhost:5000/sites/${site}/generate-page-analysis-pdf`,
      pdfData,
      {
        responseType: 'blob',
        withCredentials: true
      }
    );

    // Dosyayı indirme işlemi
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${site}_sayfa_analizi_raporu.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);

    // Başarı mesajı göster
    alert("PDF raporu başarıyla oluşturuldu!");
  } catch (error) {
    console.error("PDF oluşturma hatası:", error);
    alert("PDF oluşturulurken bir hata oluştu.");
  } finally {
    setPdfLoading(false);
  }
};

  // Öneriler oluştur
  const generateRecommendations = (data) => {
    const recommendations = [];

    // Güvenli bir şekilde audits al
    const getAudit = (category, auditId) => {
      if (!category || !category.audits) return null;
      return category.audits[auditId];
    };

    // Performans önerileri
    if (data.performance?.score < 0.9) {
      const largeImages = getAudit(data.performance, 'uses-responsive-images');
      if (largeImages && largeImages.score < 1) {
        recommendations.push("Resimleri responsive hale getirin ve modern formatlar (WebP) kullanın");
      }

      const renderBlockingResources = getAudit(data.performance, 'render-blocking-resources');
      if (renderBlockingResources && renderBlockingResources.score < 1) {
        recommendations.push("Sayfa yüklemesini engelleyen kaynakları ertelein");
      }
    }

    // SEO önerileri
    if (data.seo?.score < 0.9) {
      const missingMeta = getAudit(data.seo, 'meta-description');
      if (missingMeta && missingMeta.score < 1) {
        recommendations.push("Sayfa için meta description ekleyin");
      }

      const missingTitle = getAudit(data.seo, 'document-title');
      if (missingTitle && missingTitle.score < 1) {
        recommendations.push("Sayfa başlığını optimize edin");
      }
    }

    // Erişilebilirlik önerileri
    if (data.accessibility?.score < 0.9) {
      const colorContrast = getAudit(data.accessibility, 'color-contrast');
      if (colorContrast && colorContrast.score < 1) {
        recommendations.push("Metin ve arka plan renkleri arasında yeterli kontrast sağlayın");
      }

      const missingAltText = getAudit(data.accessibility, 'image-alt');
      if (missingAltText && missingAltText.score < 1) {
        recommendations.push("Tüm resimler için açıklayıcı alt text ekleyin");
      }
    }

    // Genel öneriler
    recommendations.push("HTTPS kullanımından emin olun");
    recommendations.push("Mobil uyumluluğu test edin");
    recommendations.push("Sayfa hızını düzenli olarak kontrol edin");

    return recommendations;
  };

  useEffect(() => {
    if (site) {
      fetchPages();
    }
  }, [site]);

  useEffect(() => {
    if (selectedPage) {
      fetchPageAnalysis(selectedPage);
    }
  }, [selectedPage]);

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'good': return <CBadge color="success">İyi</CBadge>;
      case 'average': return <CBadge color="warning">Orta</CBadge>;
      case 'poor': return <CBadge color="danger">Kötü</CBadge>;
      default: return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case 'error': return <CIcon icon={icons.cilXCircle} className="text-danger" />;
      case 'warning': return <CIcon icon={icons.cilWarning} className="text-warning" />;
      case 'success': return <CIcon icon={icons.cilCheckCircle} className="text-success" />;
      default: return <CIcon icon={icons.cilWarning} className="text-secondary" />;
    }
  };

  const ScoreCard = ({ title, score, icon, children }) => (
    <CCard className="mb-4">
      <CCardHeader>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <CIcon icon={icon} className="me-2" />
            <h6 className="mb-0">{title}</h6>
          </div>
          <CBadge color={getScoreColor(score)} size="lg">
            {score}/100
          </CBadge>
        </div>
      </CCardHeader>
      <CCardBody>
        <CProgress className="mb-3">
          <CProgressBar color={getScoreColor(score)} value={score} />
        </CProgress>
        {children}
      </CCardBody>
    </CCard>
  );

  return (
    <CContainer fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CButton
            color="light"
            onClick={() => navigate(-1)}
            className="me-3"
          >
            <CIcon icon={icons.cilArrowLeft} className="me-2" />
            Geri Dön
          </CButton>
          <h2 className="mb-0">Sayfa Analizi</h2>
          <p className="text-muted mb-0">Site: <strong>{site}</strong></p>
        </div>

        {/* PDF Butonu */}
        {pageData && (
          <CButton
            color="primary"
            onClick={generatePDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <>
                <CSpinner component="span" size="sm" aria-hidden="true" />
                <span className="ms-2">Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <CIcon icon={icons.cilFilePdf} className="me-2" />
                PDF Raporu İndir
              </>
            )}
          </CButton>
        )}
      </div>

      {/* Sayfa Seçimi */}
      <CCard className="mb-4">
        <CCardHeader>
          <h5 className="mb-0">Analiz Edilecek Sayfayı Seçin</h5>
        </CCardHeader>
        <CCardBody>
          <CFormSelect
            value={selectedPage}
            onChange={(e) => setSelectedPage(e.target.value)}
            disabled={pages.length === 0}
          >
            {pages.length === 0 ? (
              <option value="">Sayfa bulunamadı</option>
            ) : (
              pages.map((page, index) => (
                <option key={index} value={page.url}>
                  {page.title} - {page.url}
                </option>
              ))
            )}
          </CFormSelect>
        </CCardBody>
      </CCard>

      {error && <CAlert color="danger">{error}</CAlert>}

      {analysisLoading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" size="lg" />
          <p className="mt-3">Sayfa analizi yapılıyor...</p>
          <p className="mt-3">Bu işlem birkaç dakika sürebilir.</p>
        </div>
      ) : pageData ? (
        <>
          {/* Genel Skor */}
          <CRow className="mb-4">
            <CCol xs={12}>
              <CCard className={`text-white bg-${getScoreColor(pageData.overallScore)}`}>
                <CCardBody>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="text-white">Genel SEO Skoru</h4>
                      <p className="text-white-75 mb-0">Sitenizin genel performans değerlendirmesi</p>
                    </div>
                    <div className="text-end">
                      <h1 className="display-3 fw-bold text-white">{pageData.overallScore}</h1>
                      <p className="text-white-75 mb-0">/ 100</p>
                    </div>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          <CRow>
            {/* Performans */}
            <CCol lg={6}>
              <ScoreCard title="Performans" score={pageData.performance.score} icon={icons.cilSpeedometer}>
                {Object.entries(pageData.performance.metrics)
                  .filter(([_, audit]) => audit.displayValue !== undefined)
                  .slice(0, 5)
                  .map(([metric, data]) => (
                  <div key={metric} className="d-flex justify-content-between mb-2">
                    <span>{data.title}</span>
                    <span className={`fw-bold ${
                      data.score === 1 ? 'text-success' :
                      data.score === 0.5 ? 'text-warning' : 'text-danger'
                    }`}>
                      {data.displayValue}
                    </span>
                  </div>
                ))}
              </ScoreCard>
            </CCol>

            {/* SEO */}
            <CCol lg={6}>
              <ScoreCard title="SEO Optimizasyonu" score={pageData.seo.score} icon={icons.cilShield}>
                {pageData.seo.issues.slice(0, 5).map((issue, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    {getIssueIcon(issue.type)}
                    <span className="ms-2">{issue.title}</span>
                  </div>
                ))}
              </ScoreCard>
            </CCol>

            {/* Erişilebilirlik */}
            <CCol lg={6}>
              <ScoreCard title="Erişilebilirlik" score={pageData.accessibility.score} icon={icons.cilMobile}>
                {pageData.accessibility.issues.slice(0, 5).map((issue, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    {getIssueIcon(issue.type)}
                    <span className="ms-2">{issue.title}</span>
                    <CBadge color="secondary" className="ms-auto">
                      {issue.count}
                    </CBadge>
                  </div>
                ))}
              </ScoreCard>
            </CCol>

            {/* En İyi Uygulamalar */}
            <CCol lg={6}>
              <ScoreCard title="En İyi Uygulamalar" score={pageData.bestPractices.score} icon={icons.cilDesktop}>
                {pageData.bestPractices.items.slice(0, 5).map((item, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    {getIssueIcon(item.status === 'pass' ? 'success' : item.status === 'fail' ? 'error' : 'warning')}
                    <span className="ms-2">{item.title}</span>
                    <CBadge
                      color={item.status === 'pass' ? 'success' : item.status === 'fail' ? 'danger' : 'warning'}
                      className="ms-auto"
                    >
                      {item.status === 'pass' ? 'Başarılı' : item.status === 'fail' ? 'Başarısız' : 'Uyarı'}
                    </CBadge>
                  </div>
                ))}
              </ScoreCard>
            </CCol>
          </CRow>

          {/* Sayfa Detayları */}
          {pageData.pageDetails.length > 0 && (
            <CRow>
              <CCol xs={12}>
                <CCard>
                  <CCardHeader>
                    <h5 className="mb-0">Sayfa Performansı</h5>
                  </CCardHeader>
                  <CCardBody>
                    <CTable hover responsive>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Sayfa</CTableHeaderCell>
                          <CTableHeaderCell>Tıklamalar</CTableHeaderCell>
                          <CTableHeaderCell>Gösterimler</CTableHeaderCell>
                          <CTableHeaderCell>CTR</CTableHeaderCell>
                          <CTableHeaderCell>Pozisyon</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {pageData.pageDetails.map((page, index) => (
                          <CTableRow key={index}>
                            <CTableDataCell>
                              <code>{page.path}</code>
                            </CTableDataCell>
                            <CTableDataCell>{page.clicks}</CTableDataCell>
                            <CTableDataCell>{page.impressions}</CTableDataCell>
                            <CTableDataCell>{(page.ctr * 100).toFixed(2)}%</CTableDataCell>
                            <CTableDataCell>{page.position.toFixed(2)}</CTableDataCell>
                          </CTableRow>
                        ))}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}

          {/* Öneriler */}
          <CRow>
            <CCol xs={12}>
              <CCard>
                <CCardHeader>
                  <h5 className="mb-0">Öneriler</h5>
                </CCardHeader>
                <CCardBody>
                  <ul>
                    {pageData.recommendations.map((rec, index) => (
                      <li key={index} className="mb-2">{rec}</li>
                    ))}
                  </ul>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      ) : (
        !analysisLoading && (
          <CAlert color="info">
            Lütfen analiz etmek için bir sayfa seçin.
          </CAlert>
        )
      )}
    </CContainer>
  );
};

export default PageAnalysis;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CInputGroup,
  CFormInput,
  CButton,
  CSpinner,
  CAlert,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormSelect,
} from '@coreui/react';

const HomePage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Kullanıcının sitelerini çekme fonksiyonu
  const fetchSites = async () => {
    setSitesLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:5000/sites", {
        withCredentials: true
      });
      console.log("Tam API Yanıtı:", JSON.stringify(response.data, null, 2));
      let entries = response.data;
      // Yanıtın yapısını kontrol et
      if (!Array.isArray(entries)) {
        console.log("Yanıt bir dizi değil, nesne özelliklerini kontrol et");
        if (entries.sites) {
          console.log("sites özelliği bulundu");
          entries = entries.sites;
        } else if (entries.data) {
          console.log("data özelliği bulundu");
          entries = entries.data;
        } else {
          console.log("Beklenen özellik bulunamadı");
          entries = [];
        }
      }
      console.log("İşlenecek veri:", entries);
      // Veri yapısını kontrol et
      if (!Array.isArray(entries)) {
        console.error("Hata: İşlenecek veri hala bir dizi değil!");
        entries = [];
      }
      // Filtreleme öncesi tüm veriyi logla
      console.log("Filtreleme öncesi tüm siteler:", entries);
      // Filtreleme sonrası logla
      const filteredSites = entries.filter(site => {
        const isValid = site.permissionLevel === "siteOwner" || site.permissionLevel === "siteFullUser";
        if (!isValid) {
          console.log(`Atlanan site: ${site.siteUrl}, permissionLevel: ${site.permissionLevel}`);
        }
        return isValid;
      });
      console.log("Filtrelenmiş siteler:", filteredSites);
      const verifiedSites = filteredSites.map(site => {
        const cleanUrl = site.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return cleanUrl;
      });
      console.log("Temizlenmiş siteler:", verifiedSites);
      setSites(verifiedSites);
      if (verifiedSites.length > 0) {
        setSelectedSite(verifiedSites[0]);
      } else {
        setError("Kullanılabilir site bulunamadı. API yanıtını kontrol edin.");
      }
    } catch (err) {
      console.error("Siteleri alma hatası:", err);
      setError("Siteler alınamadı. Lütfen giriş yaptığınızdan emin olun.");
    } finally {
      setSitesLoading(false);
    }
  };

  // Anahtar kelime verilerini çekme fonksiyonu
  const fetchKeywords = async (domain) => {
    if (!domain) {
      setError('Geçerli bir site belirtilmedi.');
      return;
    }
    setKeywordsLoading(true);
    setError(null);
    setKeywords([]);
    try {
      console.log(`Anahtar kelimeler çekiliyor: http://localhost:5000/sites/${domain}/keywords`);
      const response = await axios.get(`http://localhost:5000/sites/${domain}/keywords`, {
        withCredentials: true
      });
      console.log("Anahtar kelime yanıtı:", response.data);
      // API yanıtını kontrol et
      const keywordsData = response.data.keywords || [];
      console.log("İşlenen anahtar kelime verileri:", keywordsData);
      // Veri var mı kontrol et
      if (keywordsData && Array.isArray(keywordsData) && keywordsData.length > 0) {
        setKeywords(keywordsData);
        console.log(`${keywordsData.length} anahtar kelime bulundu`);
      } else {
        console.log("Anahtar kelime verisi bulunamadı veya boş");
        setKeywords([]);
      }
    } catch (err) {
      console.error("Anahtar kelime verileri çekme hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);
      }
      setError('Anahtar kelimeler alınamadı. Lütfen giriş yapın ve tekrar deneyin.');
    } finally {
      setKeywordsLoading(false);
    }
  };

  // PDF raporu oluşturma fonksiyonu
  const generatePdf = async () => {
    if (!selectedSite) {
      setError('Lütfen önce bir site seçin.');
      return;
    }
    setPdfLoading(true);
    setError(null);
    try {
      console.log(`PDF oluşturuluyor: http://localhost:5000/sites/${selectedSite}/pdf`);
      const response = await axios.get(`http://localhost:5000/sites/${selectedSite}/pdf`, {
        responseType: 'blob',
        withCredentials: true
      });
      // Dosyayı indirme işlemi
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedSite}_seo_raporu.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("PDF oluşturma hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);
      }
      setError('PDF raporu oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSite && !error) {
      fetchKeywords(selectedSite);
    }
  }, [selectedSite, error]);

  return (
    <CRow>
      <CCol xs={12}>
        <h3 className="mb-4">SEO Veri Paneli</h3>
        <CCard className="mb-4">
          <CCardHeader>
            <h5>Sitenizi Seçin ve Verileri Görüntüleyin</h5>
          </CCardHeader>
          <CCardBody>
            <CInputGroup className="mb-3">
              <CFormSelect
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                disabled={sitesLoading}
              >
                {sitesLoading ? (
                  <option value="">Siteler yükleniyor...</option>
                ) : sites.length > 0 ? (
                  sites.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))
                ) : (
                  <option value="">Kullanılabilir site bulunamadı</option>
                )}
              </CFormSelect>
              <CButton color="info" onClick={generatePdf} disabled={pdfLoading || !selectedSite}>
                {pdfLoading ? <CSpinner component="span" size="sm" aria-hidden="true" /> : 'PDF Raporu Oluştur'}
              </CButton>
            </CInputGroup>
            {error && <CAlert color="danger">{error}</CAlert>}
          </CCardBody>
        </CCard>
      </CCol>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <h5>En Çok Aranan Anahtar Kelimeler ({selectedSite || 'Seçili site yok'})</h5>
          </CCardHeader>
          <CCardBody>
            {keywordsLoading ? (
              <div className="text-center">
                <CSpinner />
                <p>Veriler yükleniyor...</p>
              </div>
            ) : keywords.length > 0 ? (
              <CTable striped hover>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell scope="col">Anahtar Kelime</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Tıklamalar</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Gösterimler</CTableHeaderCell>
                    <CTableHeaderCell scope="col">TO (CTR)</CTableHeaderCell>
                    <CTableHeaderCell scope="col">Ort. Pozisyon</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {keywords.map((item, index) => (
                    <CTableRow key={index}>
                      <CTableDataCell>{item.keys && item.keys.length > 0 ? item.keys[0] : 'N/A'}</CTableDataCell>
                      <CTableDataCell>{item.clicks || 0}</CTableDataCell>
                      <CTableDataCell>{item.impressions || 0}</CTableDataCell>
                      <CTableDataCell>{item.ctr ? (item.ctr * 100).toFixed(2) + '%' : '0%'}</CTableDataCell>
                      <CTableDataCell>{item.position ? item.position.toFixed(2) : '0'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            ) : (
              <CAlert color="info" className="text-center">
                {selectedSite ?
                  `Seçili "${selectedSite}" sitesi için anahtar kelime verisi bulunamadı.` :
                  'Lütfen bir site seçin.'
                }
              </CAlert>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  );
};

// Ana uygulama bileşeni - sadece HomePage'i gösteriyor
const App = () => {
  return (
    <div className="p-3">
      <HomePage />
    </div>
  );
};

export default App;

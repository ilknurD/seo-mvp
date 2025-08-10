import React, { useState, useEffect, useCallback } from 'react';
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
  CFormInput,
  CFormLabel,
  CForm,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import * as icons from '@coreui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SiteSettings = () => {
  const { site } = useParams();
  const navigate = useNavigate();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [siteSettings, setSiteSettings] = useState({
    apiKey: '',
    apiKeyStatus: 'not_set', // not_set, valid, invalid
    lastTested: null
  });

  // Google Analytics state'leri
  const [analyticsPropertyId, setAnalyticsPropertyId] = useState('');
  const [measurementId, setMeasurementId] = useState('');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsProperty, setAnalyticsProperty] = useState(null);

  // Site adını temizleme fonksiyonu
  const getCleanSite = useCallback(() => {
    return site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }, [site]);

  // Site ayarlarını çekme
  const fetchSiteSettings = useCallback(async () => {
    setSettingsLoading(true);
    setError(null);
    try {
      console.log(`Site ayarları çekiliyor: ${site}`);
      const cleanSite = getCleanSite();
      console.log(`Temizlenmiş site: ${cleanSite}`);
      const response = await axios.get(`http://localhost:5000/sites/${cleanSite}/settings`, {
        withCredentials: true
      });
      console.log("Site ayarları yanıtı:", response.data);
      setSiteSettings(response.data);
      setApiKey(response.data.apiKey || '');
    } catch (err) {
      console.error("Site ayarları çekme hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);
        setError(`Site ayarları alınamadı: ${err.response.data.detail || 'Bilinmeyen hata'}`);
      } else if (err.request) {
        console.error("İstek hatası:", err.request);
        setError("Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError("Bilinmeyen bir hata oluştu.");
      }
    } finally {
      setSettingsLoading(false);
    }
  }, [site, getCleanSite]);

  // Google Analytics Property'yi çekme
  const fetchAnalyticsProperty = useCallback(async () => {
    try {
      const cleanSite = getCleanSite();
      console.log(`Analytics property çekiliyor: ${cleanSite}`);
      const response = await axios.get(`http://localhost:5000/sites/${cleanSite}/analytics-property`, {
        withCredentials: true
      });
      console.log("Analytics property yanıtı:", response.data);

      if (response.data.success) {
        setAnalyticsProperty(response.data);
        setAnalyticsPropertyId(response.data.property_id || '');
        setMeasurementId(response.data.measurement_id || '');
      } else {
        // Analytics property bulunamadı, state'leri sıfırla
        setAnalyticsProperty(null);
        setAnalyticsPropertyId('');
        setMeasurementId('');
      }
    } catch (err) {
      console.error("Analytics property çekme hatası:", err);
      // Hata gösterme, bu özellik opsiyonel
      setAnalyticsProperty(null);
      setAnalyticsPropertyId('');
      setMeasurementId('');
    }
  }, [site, getCleanSite]);

  // API Key'i kaydetme
  const saveApiKey = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const cleanSite = getCleanSite();
      console.log(`API Key kaydedilecek site: ${cleanSite}`);
      const response = await axios.post(
        `http://localhost:5000/sites/${cleanSite}/settings/api-key`,
        { apiKey },
        { withCredentials: true }
      );
      setSiteSettings(response.data);
      setSuccess("API Key başarıyla kaydedildi.");
      setShowApiKeyModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("API Key kaydetme hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);
        setError(`API Key kaydedilemedi: ${err.response.data.detail || 'Bilinmeyen hata'}`);
      } else if (err.request) {
        console.error("İstek hatası:", err.request);
        setError("Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError("Bilinmeyen bir hata oluştu.");
      }
    } finally {
      setTestLoading(false);
    }
  };

  // API Key'i test etme
  const testApiKey = async () => {
    if (!apiKey.trim()) {
      setError("Lütfen bir API Key girin.");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const cleanSite = getCleanSite();
      console.log(`API Key test edilecek site: ${cleanSite}`);
      const response = await axios.post(
        `http://localhost:5000/sites/${cleanSite}/settings/test-api-key`,
        { apiKey },
        { withCredentials: true }
      );
      setTestResult({
        success: true,
        message: "API Key geçerli ve çalışıyor."
      });
    } catch (err) {
      console.error("API Key test hatası:", err);
      setTestResult({
        success: false,
        message: "API Key geçersiz veya çalışmıyor."
      });
    } finally {
      setTestLoading(false);
    }
  };

  // API Key'i kaldırma
  const removeApiKey = async () => {
    if (!window.confirm("API Key'i kaldırmak istediğinizden emin misiniz? Bu işlem, sayfa analizi özelliğini devre dışı bırakacaktır.")) {
      return;
    }
    try {
      const cleanSite = getCleanSite();
      console.log(`API Key kaldırılacak site: ${cleanSite}`);
      await axios.delete(
        `http://localhost:5000/sites/${cleanSite}/settings/api-key`,
        { withCredentials: true }
      );
      setApiKey('');
      setSiteSettings({
        ...siteSettings,
        apiKey: '',
        apiKeyStatus: 'not_set'
      });
      setSuccess("API Key başarıyla kaldırıldı.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("API Key kaldırma hatası:", err);
      setError("API Key kaldırılamadı.");
    }
  };

  // Google Analytics kurulum sayfasına yönlendirme
  const navigateToGoogleAnalytics = () => {
    window.open('https://analytics.google.com/', '_blank');
  };

  // Trafik analizi sayfasına yönlendirme
  const navigateToTrafficAnalysis = () => {
    navigate(`/traffic-analysis/${getCleanSite()}`);
  };

  // Sayfa analizi sayfasına yönlendirme
  const navigateToPageAnalysis = () => {
    navigate(`/page-analysis/${site}`);
  };

  // Analytics property kaydetme fonksiyonu
  const saveAnalyticsProperty = async (propertyId, measurementId) => {
    setAnalyticsLoading(true);
    try {
      const cleanSite = getCleanSite();
      console.log(`Analytics property kaydedilecek site: ${cleanSite}`);

      // Gerekli alanların kontrolü
      if (!propertyId || !propertyId.trim()) {
        throw new Error("Property ID boş olamaz");
      }

      const response = await axios.post(
        `http://localhost:5000/sites/${cleanSite}/save-analytics-property`,
        {
          propertyId: propertyId.trim(),
          measurementId: measurementId ? measurementId.trim() : null
        },
        { withCredentials: true }
      );

      console.log("Analytics property yanıtı:", response.data);
      setAnalyticsProperty({
        property_id: propertyId,
        measurement_id: measurementId,
        is_active: true
      });
      setSuccess("Google Analytics property başarıyla kaydedildi.");
      setShowAnalyticsModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Analytics property kaydetme hatası:", err);
      if (err.response) {
        console.error("Hata durumu:", err.response.status);
        console.error("Hata verisi:", err.response.data);

        let errorMessage = "Analytics property kaydedilemedi.";
        if (err.response.data && err.response.data.detail) {
          // Veritabanı bütünlük hatası için özel mesaj
          if (err.response.data.detail.includes("unique constraint") ||
              err.response.data.detail.includes("duplicate key") ||
              err.response.data.detail.includes("zaten bir kayıt var")) {
            errorMessage = "Bu site için zaten bir analytics property kaydı var. Lütfen mevcut kaydı güncelleyin.";
          } else if (err.response.data.detail.includes("foreign key constraint")) {
            errorMessage = "Geçersiz site bilgisi. Lütfen site kaydınızın olduğunu doğrulayın.";
          } else if (err.response.data.detail.includes("not-null constraint")) {
            errorMessage = "Zorunlu alanlar eksik. Lütfen tüm alanları doldurun.";
          } else {
            errorMessage = err.response.data.detail;
          }
        }

        setError(errorMessage);
      } else if (err.request) {
        setError("Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.");
      } else {
        setError(err.message || "Bilinmeyen bir hata oluştu.");
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Analytics modalını açtığımızda mevcut bilgileri göstermek için
  const openAnalyticsModal = () => {
    // Eğer daha önce analytics property varsa, modalda göster
    if (analyticsProperty) {
      setAnalyticsPropertyId(analyticsProperty.property_id || '');
      setMeasurementId(analyticsProperty.measurement_id || '');
    } else {
      // Yoksa boş bırak
      setAnalyticsPropertyId('');
      setMeasurementId('');
    }
    setShowAnalyticsModal(true);
  };

  useEffect(() => {
    if (site) {
      console.log(`useEffect çalıştı, site: ${site}`);
      fetchSiteSettings();
      fetchAnalyticsProperty();
    } else {
      console.log("Site parametresi boş, ayarlar çekilmeyecek");
    }
  }, [site, fetchSiteSettings, fetchAnalyticsProperty]);

  const getApiKeyStatusBadge = () => {
    switch (siteSettings.apiKeyStatus) {
      case 'valid':
        return <CBadge color="success">Geçerli</CBadge>;
      case 'invalid':
        return <CBadge color="danger">Geçersiz</CBadge>;
      case 'not_set':
      default:
        return <CBadge color="secondary">Ayarlanmamış</CBadge>;
    }
  };

  const getAnalyticsStatusBadge = () => {
    if (!analyticsProperty) {
      return <CBadge color="secondary">Ayarlanmamış</CBadge>;
    }
    return analyticsProperty.is_active ?
      <CBadge color="success">Aktif</CBadge> :
      <CBadge color="danger">Pasif</CBadge>;
  };

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
          <h2 className="mb-0">Site Ayarları</h2>
          <p className="text-muted mb-0">Site: <strong>{site}</strong></p>
        </div>
      </div>

      {error && <CAlert color="danger">{error}</CAlert>}
      {success && <CAlert color="success">{success}</CAlert>}

      {settingsLoading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" size="lg" />
          <p className="mt-3">Ayarlar yükleniyor...</p>
        </div>
      ) : (
        <CRow>
          <CCol lg={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <h5 className="mb-0">Google API Ayarları</h5>
              </CCardHeader>
              <CCardBody>
                <div className="mb-4">
                  <CFormLabel>Google API Key Durumu</CFormLabel>
                  <div className="d-flex align-items-center">
                    {getApiKeyStatusBadge()}
                    {siteSettings.lastTested && (
                      <span className="ms-2 text-muted">
                        Son test: {new Date(siteSettings.lastTested).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-muted">
                    Sayfa analizi özelliğini kullanmak için Google PageSpeed Insights API key'i gereklidir.
                    API key'iniz yoksa, aşağıdaki adımları izleyerek oluşturabilirsiniz:
                  </p>
                  <ol className="text-muted">
                    <li><a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>'a gidin</li>
                    <li>Yeni bir proje oluşturun veya mevcut bir projeyi seçin</li>
                    <li>"API'ler ve Hizmetler" &gt; "Kütüphane" bölümüne gidin</li>
                    <li>"PageSpeed Insights API"yı aratıp etkinleştirin</li>
                    <li>"Kimlik bilgileri" bölümünden yeni bir API key oluşturun</li>
                    <li>Oluşturduğunuz key'i aşağıdaki alana yapıştırın</li>
                  </ol>
                </div>
                <div className="d-flex gap-2 mb-3">
                  <CButton
                    color="primary"
                    onClick={() => setShowApiKeyModal(true)}
                  >
                    <CIcon icon={icons.cilPencil} className="me-2" />
                    {siteSettings.apiKey ? "API Key'i Güncelle" : "API Key Ekle"}
                  </CButton>
                  {siteSettings.apiKey && (
                    <CButton
                      color="danger"
                      variant="outline"
                      onClick={removeApiKey}
                    >
                      <CIcon icon={icons.cilX} className="me-2" />
                      Kaldır
                    </CButton>
                  )}
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol lg={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <h5 className="mb-0">Google Analytics Ayarları</h5>
              </CCardHeader>
              <CCardBody>
                <div className="mb-4">
                  <CFormLabel>Google Analytics Property Durumu</CFormLabel>
                  <div className="d-flex align-items-center">
                    {getAnalyticsStatusBadge()}
                    {analyticsProperty && (
                      <span className="ms-2 text-muted">
                        Property ID: {analyticsProperty.property_id}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-muted">
                    Trafik analizi özelliğini kullanmak için Google Analytics mülkünüzü bağlamanız gereklidir.
                    Mülkünüzü Google Analytics'e eklediyseniz, aşağıdaki Property ID'yi girin.
                  </p>
                  <ol className="text-muted">
                    <li><a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Google Analytics</a>'a gidin</li>
                    <li>Sol menüden "Admin" seçeneğine tıklayın</li>
                    <li>"Property Settings" seçeneğine gidin</li>
                    <li>"Property ID" alanındaki değeri kopyalayın (Örn: properties/123456789)</li>
                    <li>Aşağıdaki alana yapıştırın</li>
                  </ol>
                </div>
                <div className="d-flex gap-2 mb-3">
                  <CButton
                    color="info"
                    onClick={openAnalyticsModal}
                  >
                    <CIcon icon={icons.cilPencil} className="me-2" />
                    {analyticsProperty ? "Analytics Ayarlarını Güncelle" : "Analytics Property Ekle"}
                  </CButton>
                  {analyticsProperty && (
                    <CButton
                      color="success"
                      variant="outline"
                      onClick={navigateToTrafficAnalysis}
                    >
                      <CIcon icon={icons.cilChartLine} className="me-2" />
                      Trafik Analizini Görüntüle
                    </CButton>
                  )}
                </div>
                <div className="d-flex gap-2">
                  <CButton
                    color="info"
                    variant="outline"
                    onClick={navigateToGoogleAnalytics}
                  >
                    <CIcon icon={icons.cilExternalLink} className="me-2" />
                    Google Analytics Kurulumu
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>

          <CCol lg={6}>
            <CCard className="mb-4">
              <CCardHeader>
                <h5 className="mb-0">Sayfa Analizi Testi</h5>
              </CCardHeader>
              <CCardBody>
                {siteSettings.apiKeyStatus === 'valid' ? (
                  <div>
                    <p className="text-muted">
                      Sayfa analizi özelliği çalışır durumda. Herhangi bir sayfanın analizini görüntülemek için
                      "Sayfa Analizi" menüsüne gidin.
                    </p>
                    <CButton
                      color="success"
                      variant="outline"
                      onClick={navigateToPageAnalysis}
                    >
                      <CIcon icon={icons.cilSpeedometer} className="me-2" />
                      Sayfa Analizine Git
                    </CButton>
                  </div>
                ) : (
                  <div>
                    <p className="text-muted">
                      Sayfa analizi özelliğini kullanabilmek için geçerli bir Google API Key'e ihtiyacınız var.
                    </p>
                    <CAlert color="warning">
                      <CIcon icon={icons.cilWarning} className="me-2" />
                      API Key ayarlanmadığı için sayfa analizi özelliği devre dışı.
                    </CAlert>
                  </div>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      {/* API Key Modal */}
      <CModal
        visible={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        size="lg"
      >
        <CModalHeader>
          Google API Key Ayarla
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormLabel>Google API Key</CFormLabel>
              <CFormInput
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSyC..."
              />
              <div className="form-text">
                Google Cloud Console'dan aldığınız API key'i buraya yapıştırın.
              </div>
            </div>
            {testResult && (
              <CAlert color={testResult.success ? "success" : "danger"}>
                {testResult.message}
              </CAlert>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setShowApiKeyModal(false)}
          >
            İptal
          </CButton>
          <CButton
            color="info"
            variant="outline"
            onClick={testApiKey}
            disabled={testLoading || !apiKey.trim()}
          >
            {testLoading ? <CSpinner size="sm" /> : "Test Et"}
          </CButton>
          <CButton
            color="primary"
            onClick={saveApiKey}
            disabled={testLoading || !apiKey.trim() || (testResult && !testResult.success)}
          >
            {testLoading ? <CSpinner size="sm" /> : "Kaydet"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Google Analytics Property Modal */}
      <CModal
        visible={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        size="lg"
      >
        <CModalHeader>
          Google Analytics Property Ayarla
        </CModalHeader>
        <CModalBody>
          <CForm>
            <div className="mb-3">
              <CFormLabel>Google Analytics Property ID</CFormLabel>
              <CFormInput
                type="text"
                value={analyticsPropertyId}
                onChange={(e) => setAnalyticsPropertyId(e.target.value)}
                placeholder="properties/123456789"
              />
              <div className="form-text">
                Google Analytics'ten aldığınız Property ID'yi buraya yapıştırın.
              </div>
            </div>
            <div className="mb-3">
              <CFormLabel>Measurement ID (İsteğe Bağlı)</CFormLabel>
              <CFormInput
                type="text"
                value={measurementId}
                onChange={(e) => setMeasurementId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
              />
              <div className="form-text">
                Web sitenize eklediğiniz Google Analytics kodundaki Measurement ID (isteğe bağlı).
              </div>
            </div>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => setShowAnalyticsModal(false)}
          >
            İptal
          </CButton>
          <CButton
            color="primary"
            onClick={() => saveAnalyticsProperty(analyticsPropertyId, measurementId)}
            disabled={analyticsLoading || !analyticsPropertyId.trim()}
          >
            {analyticsLoading ? <CSpinner size="sm" /> : "Kaydet"}
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default SiteSettings;

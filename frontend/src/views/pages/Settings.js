// Settings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard, CCardBody, CCardHeader, CContainer, CRow, CCol, CButton,
  CFormInput, CFormLabel, CFormSelect, CFormSwitch, CSpinner, CAlert,
  CTabs, CTabList, CTab, CTabContent, CTabPanel, CModal,
  CModalHeader, CModalTitle, CModalBody, CModalFooter
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { freeSet } from '@coreui/icons';          // <-- yeni import

const handleSaveSettings = async () => {
    setSaving(true);
    setShowAlert(false);
    try {
      await new Promise(r => setTimeout(r, 1500));
      console.log('Ayarlar kaydediliyor:', settings);
      setAlertMessage('Ayarlar başarıyla kaydedildi!');
      setAlertColor('success');
      setShowAlert(true);
    } catch (e) {
      setAlertMessage('Ayarlar kaydedilirken bir hata oluştu.');
      setAlertColor('danger');
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
  try {
    // API çağrısını simüle et
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Hesap siliniyor');
    setAlertMessage('Hesap başarıyla silindi!');
    setAlertColor('success');
    setShowAlert(true);
    // 2 sn sonra login sayfasına yönlendir
    setTimeout(() => navigate('/login'), 2000);
  } catch (error) {
    console.error('Hesap silinirken hata oluştu:', error);
    setAlertMessage('Hesap silinirken bir hata oluştu.');
    setAlertColor('danger');
    setShowAlert(true);
  } finally {
    setShowDeleteModal(false);
  }
};

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertColor, setAlertColor] = useState('success');

  // … mockSettings, useEffect, handleSaveSettings, handleDeleteAccount, updateSettings, generateNewApiKey …
  // (bu bölümler aynen kalabilir)

  const mockSettings = {
    profile: {
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      email: 'ahmet@example.com',
      company: 'ABC Digital',
      phone: '+90 555 123 4567',
      timezone: 'Europe/Istanbul',
      language: 'tr'
    },
    notifications: {
      emailReports: true,
      rankingAlerts: true,
      weeklyDigest: false,
      competitorAlerts: true,
      technicalIssues: true,
      newFeatures: false,
      marketing: false
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      apiAccess: true,
      allowedIPs: ''
    },
    appearance: {
      theme: 'light',
      sidebarStyle: 'sidebar-fixed',
      colorScheme: 'default'
    },
    api: {
      apiKey: 'sk-1234567890abcdef',
      rateLimitPerDay: 1000,
      webhookUrl: ''
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        await new Promise(r => setTimeout(r, 1000));
        setSettings(mockSettings);
      } catch (err) {
        setAlertMessage('Ayarlar yüklenirken bir hata oluştu.');
        setAlertColor('danger');
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  /* … handleSaveSettings, handleDeleteAccount, updateSettings, generateNewApiKey … */

  if (loading) {
    return (
      <CContainer fluid>
        <div className="text-center py-5">
          <CSpinner color="primary" size="lg" />
          <p className="mt-3">Ayarlar yükleniyor...</p>
        </div>
      </CContainer>
    );
  }

  return (
    <CContainer fluid className="py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CButton color="light" onClick={() => navigate(-1)} className="me-3">
            <CIcon content={freeSet.cilArrowLeft} className="me-2" />
            Geri Dön
          </CButton>
          <h2 className="mb-0">Genel Ayarlar</h2>
          <p className="text-muted mb-0">Hesap ve uygulama ayarlarınızı yönetin</p>
        </div>
        <CButton color="success" onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <CIcon content={freeSet.cilCheckCircle} className="me-2" />
              Kaydet
            </>
          )}
        </CButton>
      </div>

      {showAlert && (
        <CAlert color={alertColor} dismissible onClose={() => setShowAlert(false)}>
          {alertMessage}
        </CAlert>
      )}

      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody>
              <CTabs activeItemKey={activeTab} onActiveItemChange={setActiveTab}>
                <CTabList variant="tabs">
                  <CTab itemKey="profile">
                    <CIcon content={freeSet.cilUser} className="me-2" />
                    Profil
                  </CTab>
                  <CTab itemKey="notifications">
                    <CIcon content={freeSet.cilBell} className="me-2" />
                    Bildirimler
                  </CTab>
                  <CTab itemKey="security">
                    <CIcon content={freeSet.cilShield} className="me-2" />
                    Güvenlik
                  </CTab>
                  <CTab itemKey="appearance">
                    <CIcon content={freeSet.cilPalette} className="me-2" />
                    Görünüm
                  </CTab>
                  <CTab itemKey="api">
                    <CIcon content={freeSet.cilGlobeAlt} className="me-2" />
                    API
                  </CTab>
                </CTabList>

                {/* Tab içerikleri aynen korunur … */}
              </CTabs>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Hesap Silme Alanı */}
      <CRow className="mt-4">
        <CCol xs={12}>
          <CCard className="border-danger">
            <CCardHeader className="bg-danger text-white">
              <h5 className="mb-0">
                <CIcon content={freeSet.cilTrash} className="me-2" />
                Tehlikeli Bölge
              </h5>
            </CCardHeader>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-danger">Hesabı Sil</h6>
                  <p className="text-muted mb-0">
                    Hesabınızı ve tüm verilerinizi kalıcı olarak silin. Bu işlem geri alınamaz.
                  </p>
                </div>
                <CButton color="danger" variant="outline" onClick={() => setShowDeleteModal(true)}>
                  <CIcon content={freeSet.cilTrash} className="me-2" />
                  Hesabı Sil
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Silme Modal */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Hesap Silme Onayı</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="danger">
            <CIcon content={freeSet.cilWarning} className="me-2" />
            <strong>Bu işlem geri alınamaz!</strong>
          </CAlert>
          <p>Hesabınızı silmek istediğinizden emin misiniz?</p>
          <ul className="text-muted">
            <li>Tüm site verileriniz silinecek</li>
            <li>Anahtar kelime takip verileri silinecek</li>
            <li>Geçmiş raporlar silinecek</li>
            <li>API erişiminiz iptal edilecek</li>
            <li>Faturalandırma durdurulacak</li>
          </ul>
          <p className="text-danger fw-bold">Bu verileri kurtarmanın bir yolu yoktur.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowDeleteModal(false)}>İptal</CButton>
          <CButton color="danger" onClick={handleDeleteAccount}>Evet, Hesabımı Sil</CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Settings;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CRow,
  CCol,
  CButton,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CFormSelect,
  CFormCheck,
  CSpinner,
  CAlert,
  CInputGroup,
  CInputGroupText,
  CProgress,
  CProgressBar
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilArrowLeft,
  cilPlus,
  cilGlobeAlt,
  cilCheckCircle,
  cilWarning,
  cilShieldAlt // 'cilShield' yerine 'cilShieldAlt' kullanıldı
} from '@coreui/icons';

const AddSite = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({
    siteUrl: '',
    siteName: '',
    description: '',
    category: 'business',
    language: 'tr',
    competitors: ['', '', ''],
    keywordsToTrack: '',
    verificationMethod: 'html',
    agreedToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [verificationStatus, setVerificationStatus] = useState(null);

  const totalSteps = 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const categories = [
    { value: 'business', label: 'İş/Ticaret' },
    { value: 'blog', label: 'Blog' },
    { value: 'ecommerce', label: 'E-ticaret' },
    { value: 'portfolio', label: 'Portföy' },
    { value: 'news', label: 'Haber' },
    { value: 'education', label: 'Eğitim' },
    { value: 'healthcare', label: 'Sağlık' },
    { value: 'other', label: 'Diğer' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCompetitorChange = (index, value) => {
    const newCompetitors = [...formData.competitors];
    newCompetitors[index] = value;
    setFormData(prev => ({
      ...prev,
      competitors: newCompetitors
    }));
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.siteUrl.trim()) {
          newErrors.siteUrl = 'Site URL gereklidir';
        } else if (!isValidUrl(formData.siteUrl)) {
          newErrors.siteUrl = 'Geçerli bir URL giriniz';
        }

        if (!formData.siteName.trim()) {
          newErrors.siteName = 'Site adı gereklidir';
        }
        break;

      case 2:
        // Optional step, no required fields
        break;

      case 3:
        if (!formData.keywordsToTrack.trim()) {
          newErrors.keywordsToTrack = 'En az bir anahtar kelime giriniz';
        }
        break;

      case 4:
        if (!formData.agreedToTerms) {
          newErrors.agreedToTerms = 'Kullanım şartlarını kabul etmelisiniz';
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string.startsWith('http') ? string : `https://${string}`);
      return true;
    } catch (_) {
      return false;
    }
  };

  const normalizeUrl = (url) => {
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    return url.replace(/\/$/, ''); // Remove trailing slash
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleVerifySite = async () => {
    setVerifying(true);
    try {
      // Simulate site verification
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock verification result
      const isVerified = Math.random() > 0.3; // 70% success rate

      if (isVerified) {
        setVerificationStatus('success');
      } else {
        setVerificationStatus('failed');
      }
    } catch (error) {
      setVerificationStatus('failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      // Simulate API call to add site
      await new Promise(resolve => setTimeout(resolve, 2000));

      const siteData = {
        ...formData,
        siteUrl: normalizeUrl(formData.siteUrl),
        competitors: formData.competitors.filter(c => c.trim()),
        keywords: formData.keywordsToTrack.split(',').map(k => k.trim()).filter(k => k)
      };

      console.log('Adding site:', siteData);

      // Redirect to dashboard with success message
      navigate('/dashboard', {
        state: {
          message: `${formData.siteName} başarıyla eklendi!`,
          type: 'success'
        }
      });

    } catch (error) {
      console.error('Site add error:', error);
      setErrors({ submit: 'Site eklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h5 className="mb-4">Site Bilgileri</h5>

            <div className="mb-3">
              <CFormLabel>Site URL <span className="text-danger">*</span></CFormLabel>
              <CInputGroup>
                <CInputGroupText>
                  <CIcon icon={cilGlobeAlt} />
                </CInputGroupText>
                <CFormInput
                  placeholder="example.com veya https://example.com"
                  value={formData.siteUrl}
                  onChange={(e) => handleInputChange('siteUrl', e.target.value)}
                  invalid={!!errors.siteUrl}
                />
              </CInputGroup>
              {errors.siteUrl && <div className="text-danger small mt-1">{errors.siteUrl}</div>}
            </div>

            <div className="mb-3">
              <CFormLabel>Site Adı <span className="text-danger">*</span></CFormLabel>
              <CFormInput
                placeholder="Sitenizin adını giriniz"
                value={formData.siteName}
                onChange={(e) => handleInputChange('siteName', e.target.value)}
                invalid={!!errors.siteName}
              />
              {errors.siteName && <div className="text-danger small mt-1">{errors.siteName}</div>}
            </div>

            <div className="mb-3">
              <CFormLabel>Açıklama</CFormLabel>
              <CFormTextarea
                rows={3}
                placeholder="Siteniz hakkında kısa bir açıklama (opsiyonel)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>

            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Kategori</CFormLabel>
                  <CFormSelect
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel>Dil</CFormLabel>
                  <CFormSelect
                    value={formData.language}
                    onChange={(e) => handleInputChange('language', e.target.value)}
                  >
                    <option value="tr">Türkçe</option>
                    <option value="en">İngilizce</option>
                    <option value="de">Almanca</option>
                    <option value="fr">Fransızca</option>
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
          </div>
        );

      case 2:
        return (
          <div>
            <h5 className="mb-4">Rakip Siteleri (Opsiyonel)</h5>
            <p className="text-muted mb-4">
              Ana rakiplerinizi ekleyerek karşılaştırmalı analizler yapabilirsiniz.
            </p>

            {formData.competitors.map((competitor, index) => (
              <div key={index} className="mb-3">
                <CFormLabel>Rakip {index + 1}</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilGlobeAlt} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="competitor.com"
                    value={competitor}
                    onChange={(e) => handleCompetitorChange(index, e.target.value)}
                  />
                </CInputGroup>
              </div>
            ))}

            <CAlert color="info">
              <strong>💡 İpucu:</strong> Rakip analizi için Google'da ana anahtar kelimelerinizle arama yapın ve
              ilk 10 sonuçta çıkan benzer siteleri rakip olarak ekleyebilirsiniz.
            </CAlert>
          </div>
        );

      case 3:
        return (
          <div>
            <h5 className="mb-4">Takip Edilecek Anahtar Kelimeler</h5>

            <div className="mb-3">
              <CFormLabel>Anahtar Kelimeler <span className="text-danger">*</span></CFormLabel>
              <CFormTextarea
                rows={4}
                placeholder="seo, dijital pazarlama, web tasarım, sosyal medya (virgülle ayırın)"
                value={formData.keywordsToTrack}
                onChange={(e) => handleInputChange('keywordsToTrack', e.target.value)}
                invalid={!!errors.keywordsToTrack}
              />
              {errors.keywordsToTrack && (
                <div className="text-danger small mt-1">{errors.keywordsToTrack}</div>
              )}
              <div className="text-muted small mt-1">
                Her anahtar kelimeyi virgülle ayırarak giriniz. (Minimum 1, maksimum 50 kelime)
              </div>
            </div>

            <CAlert color="warning">
              <strong>📈 Öneri:</strong> İlk başta 10-20 ana anahtar kelime ile başlayın.
              Sonrasında analiz sonuçlarına göre yeni kelimeler ekleyebilirsiniz.
            </CAlert>

            {formData.keywordsToTrack && (
              <div className="mt-3">
                <small className="text-muted">Girdiğiniz kelimeler:</small>
                <div className="mt-2">
                  {formData.keywordsToTrack.split(',').map((keyword, index) => {
                    const trimmedKeyword = keyword.trim();
                    return trimmedKeyword ? (
                      <span key={index} className="badge bg-primary me-2 mb-2">
                        {trimmedKeyword}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h5 className="mb-4">Site Doğrulama</h5>

            <div className="mb-4">
              <CFormLabel>Doğrulama Yöntemi</CFormLabel>
              <CFormSelect
                value={formData.verificationMethod}
                onChange={(e) => handleInputChange('verificationMethod', e.target.value)}
              >
                <option value="html">HTML Dosyası</option>
                <option value="meta">Meta Tag</option>
                <option value="analytics">Google Analytics</option>
                <option value="console">Google Search Console</option>
              </CFormSelect>
              <div className="text-muted small mt-1">
                Site sahipliğini doğrulamak için tercih ettiğiniz yöntemi seçin
              </div>
            </div>

            {verificationStatus === null && (
              <CAlert color="info">
                <CIcon icon={cilShieldAlt} className="me-2" />
                <strong>Doğrulama Gerekli:</strong> Site ekleme işlemini tamamlamak için
                site sahipliğinizi doğrulamanız gerekmektedir.
              </CAlert>
            )}

            {verificationStatus === 'success' && (
              <CAlert color="success">
                <CIcon icon={cilCheckCircle} className="me-2" />
                <strong>Doğrulama Başarılı!</strong> Site sahipliğiniz doğrulandı.
              </CAlert>
            )}

            {verificationStatus === 'failed' && (
              <CAlert color="danger">
                <CIcon icon={cilWarning} className="me-2" />
                <strong>Doğrulama Başarısız!</strong> Site sahipliği doğrulanamadı.
                Lütfen doğrulama kodunu doğru yerleştirdiğinizden emin olun.
              </CAlert>
            )}

            <div className="mb-4">
              <CButton
                color="primary"
                onClick={handleVerifySite}
                disabled={verifying}
                className="me-3"
              >
                {verifying ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Doğrulanıyor...
                  </>
                ) : (
                  <>
                    <CIcon icon={cilShieldAlt} className="me-2" />
                    Siteyi Doğrula
                  </>
                )}
              </CButton>

              {verificationStatus === 'failed' && (
                <CButton color="outline-primary" size="sm">
                  Doğrulama Yardımı
                </CButton>
              )}
            </div>

            <div className="mb-4">
              <CFormCheck
                id="agreedToTerms"
                label="Kullanım şartlarını ve gizlilik politikasını okudum ve kabul ediyorum"
                checked={formData.agreedToTerms}
                onChange={(e) => handleInputChange('agreedToTerms', e.target.checked)}
                invalid={!!errors.agreedToTerms}
              />
              {errors.agreedToTerms && (
                <div className="text-danger small mt-1">{errors.agreedToTerms}</div>
              )}
            </div>

            {errors.submit && (
              <CAlert color="danger">{errors.submit}</CAlert>
            )}
          </div>
        );

      default:
        return null;
    }
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
            <CIcon icon={cilArrowLeft} className="me-2" />
            Geri Dön
          </CButton>
          <h2 className="mb-0">Yeni Site Ekle</h2>
          <p className="text-muted mb-0">SEO analizine başlamak için sitenizi ekleyin</p>
        </div>
      </div>

      <CRow className="justify-content-center">
        <CCol lg={8}>
          {/* Progress Bar */}
          <CCard className="mb-4">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small text-muted">Adım {currentStep} / {totalSteps}</span>
                <span className="small text-muted">{Math.round(progressPercentage)}% Tamamlandı</span>
              </div>
              <CProgress>
                <CProgressBar color="primary" value={progressPercentage} />
              </CProgress>

              <div className="d-flex justify-content-between mt-3">
                <small className={currentStep >= 1 ? 'text-primary fw-bold' : 'text-muted'}>
                  Site Bilgileri
                </small>
                <small className={currentStep >= 2 ? 'text-primary fw-bold' : 'text-muted'}>
                  Rakipler
                </small>
                <small className={currentStep >= 3 ? 'text-primary fw-bold' : 'text-muted'}>
                  Anahtar Kelimeler
                </small>
                <small className={currentStep >= 4 ? 'text-primary fw-bold' : 'text-muted'}>
                  Doğrulama
                </small>
              </div>
            </CCardBody>
          </CCard>

          {/* Main Form */}
          <CCard>
            <CCardHeader>
              <div className="d-flex align-items-center">
                <CIcon icon={cilPlus} className="me-2" />
                <h5 className="mb-0">Site Ekleme Sihirbazı</h5>
              </div>
            </CCardHeader>
            <CCardBody>
              <CForm>
                {renderStep()}

                <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                  <CButton
                    color="outline-secondary"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    Önceki
                  </CButton>

                  <div>
                    {currentStep < totalSteps ? (
                      <CButton color="primary" onClick={handleNext}>
                        Sonraki
                      </CButton>
                    ) : (
                      <CButton
                        color="success"
                        onClick={handleSubmit}
                        disabled={loading || verificationStatus !== 'success'}
                      >
                        {loading ? (
                          <>
                            <CSpinner size="sm" className="me-2" />
                            Site Ekleniyor...
                          </>
                        ) : (
                          <>
                            <CIcon icon={cilCheckCircle} className="me-2" />
                            Siteyi Ekle
                          </>
                        )}
                      </CButton>
                    )}
                  </div>
                </div>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default AddSite;

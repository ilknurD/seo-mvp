import React, { useState, useEffect } from 'react';
import {
  CContainer, CRow, CCol, CCard, CCardHeader, CCardBody,
  CSpinner, CButton, CBadge, CFormInput, CInputGroup, CInputGroupText,
  CTable, CTableHead, CTableBody, CTableRow, CTableHeaderCell, CTableDataCell
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSearch, cilPlus, cilChart, cilGlobeAlt, cilCalendar, cilLockLocked, cilLightbulb,
  cilSettings, cilBarChart, cilFile, cilUser, cilArrowRight, cilWarning, cilReload,
  cilCheckCircle, cilInfo
} from '@coreui/icons';
export default function Dashboard() {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const checkAuthAndFetchSites = async () => {
    setLoading(true);
    setError(null);
    try {
      // Önce oturum durumunu kontrol et
      const authResponse = await fetch('http://localhost:5000/auth/status', {
        credentials: 'include'
      });
      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        setIsAuthenticated(false);
        throw new Error(errorData.detail || `Oturum kontrolü başarısız: ${authResponse.statusText}`);
      }
      setIsAuthenticated(true);
      // Oturum açıksa siteleri çek
      const response = await fetch('http://localhost:5000/gsc_sites', {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API isteği başarısız: ${response.statusText}`);
      }
      const data = await response.json();
      setSites(data);
      setFilteredSites(data);
      // Son kullanılan siteyi seç veya ilk siteyi seç
      if (data.length > 0) {
        const lastUsed = localStorage?.getItem("lastSelectedSite");
        const defaultSite = lastUsed && data.some(site => site.siteUrl === lastUsed)
          ? lastUsed
          : data[0].siteUrl;
        setSelectedSite(defaultSite);
      }
    } catch (err) {
      console.error("Sites fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    checkAuthAndFetchSites();
  }, []);
  useEffect(() => {
    const filtered = sites.filter(site =>
      site.siteUrl.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSites(filtered);
  }, [searchTerm, sites]);
  const handleSiteSelect = (siteUrl) => {
    setSelectedSite(siteUrl);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("lastSelectedSite", siteUrl);
    }
  };
  const handleNavigation = (path) => {
    window.location.href = path;
  };
  const handleRefresh = () => checkAuthAndFetchSites();
  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  const StatCard = ({ icon, title, value, color, description }) => (
    <CCard className={`mb-4 border-0 shadow-sm stat-card stat-card-${color}`}>
      <CCardBody className="p-4">
        <div className="d-flex align-items-center">
          <div className={`stat-icon stat-icon-${color} me-3`}>
            <CIcon icon={icon} size="xl" />
          </div>
          <div>
            <h5 className="text-white mb-1">{title}</h5>
            <p className="text-white h3 mb-0">{value}</p>
            <p className="text-white-50 small">{description}</p>
          </div>
        </div>
      </CCardBody>
    </CCard>
  );
  const ActionButton = ({ icon, title, description, onClick, color = "primary" }) => (
    <CCard className="mb-4 action-card border-0 shadow-sm h-100" onClick={onClick}>
      <CCardBody className="p-4">
        <div className="d-flex align-items-center">
          <div className={`action-icon action-icon-${color} me-3`}>
            <CIcon icon={icon} size="xl" />
          </div>
          <div className="flex-grow-1">
            <h5 className="mb-1">{title}</h5>
            <p className="text-muted small mb-0">{description}</p>
          </div>
          <CIcon icon={cilArrowRight} className="text-muted" />
        </div>
      </CCardBody>
    </CCard>
  );
  const getSeoScoreColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "danger";
  };
  // API'den gelen veriye göre SEO skorunu simüle et
  const getSimulatedSeoScore = (siteUrl) => {
    // Site URL'sine göre tutarlı bir skor oluştur
    let hash = 0;
    for (let i = 0; i < siteUrl.length; i++) {
      hash = siteUrl.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 40) + 60; // 60-99 arası skor
  };
  // API'den gelen veriye göre anahtar kelime sayısını simüle et
  const getSimulatedKeywordCount = (siteUrl) => {
    let hash = 0;
    for (let i = 0; i < siteUrl.length; i++) {
      hash = siteUrl.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash % 200) + 20; // 20-219 arası kelime
  };
  // API'den gelen veriye göre eklenme tarihini simüle et
  const getSimulatedAddedDate = (siteUrl) => {
    const dates = ["5 gün önce", "1 hafta önce", "2 hafta önce", "1 ay önce", "2 ay önce", "3 ay önce"];
    let hash = 0;
    for (let i = 0; i < siteUrl.length; i++) {
      hash = siteUrl.charCodeAt(i) + ((hash << 5) - hash);
    }
    return dates[Math.abs(hash) % dates.length];
  };
  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Header */}
      <CCard className="shadow-sm border-0">
        <CCardHeader className="bg-white py-3">
          <CContainer fluid>
            <CRow className="align-items-center">
              <CCol xs="6">
                <div className="d-flex align-items-center">
                  <div className="bg-primary rounded p-2 me-3">
                    <CIcon icon={cilChart} className="text-white" size="lg" />
                  </div>
                  <h2 className="mb-0">SEO Dashboard</h2>
                </div>
              </CCol>
              <CCol xs="6" className="text-end">
                {isAuthenticated && (
                  <>
                    <CButton
                      color="primary"
                      size="md"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="me-2 refresh-button"
                    >
                      {loading ? (
                        <CSpinner size="md" className="me-1" />
                      ) : (
                        <CIcon icon={cilReload} className="me-1" />
                      )}
                      Yenile
                    </CButton>
                    <CButton color="danger" variant="outline" size="md" onClick={handleLogout}>
                      Çıkış Yap
                    </CButton>
                  </>
                )}
              </CCol>
            </CRow>
          </CContainer>
        </CCardHeader>
      </CCard>
      <CContainer fluid className="py-4 flex-grow-1">
        {/* Search Section */}
        <CRow className="mb-4">
          <CCol md={6} lg={4}>
            <CInputGroup>
              <CInputGroupText>
                <CIcon icon={cilSearch} />
              </CInputGroupText>
              <CFormInput
                placeholder="Site ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </CInputGroup>
          </CCol>
        </CRow>
        {loading ? (
          <CRow className="mb-4">
            {[...Array(6)].map((_, i) => (
              <CCol key={i} sm={6} lg={4} xl={3} className="mb-4">
                <CCard className="h-100 placeholder-glow">
                  <CCardBody>
                    <div className="placeholder col-6 mb-2"></div>
                    <div className="placeholder col-8 mb-2"></div>
                    <div className="placeholder col-4"></div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        ) : error ? (
          <CCard className="mb-4 border-danger">
            <CCardBody className="text-center py-5">
              <CIcon icon={cilWarning} size="3xl" className="text-danger mb-3" />
              <h4 className="text-danger">Hata Oluştu</h4>
              <p className="text-muted">{error}</p>
              {!isAuthenticated ? (
                <CButton color="primary" href="/login">Google ile Giriş Yap</CButton>
              ) : (
                <CButton color="primary" onClick={handleRefresh}>Tekrar Dene</CButton>
              )}
            </CCardBody>
          </CCard>
        ) : sites.length === 0 ? (
          <CCard className="mb-4">
            <CCardBody className="text-center py-5">
              <CIcon icon={cilGlobeAlt} size="3xl" className="text-muted mb-3" />
              <h4>Hiç Site Bulunamadı</h4>
              <p className="text-muted mb-4">
                Google Search Console hesabınızda kayıtlı site bulunamadı.
              </p>
              <CButton color="primary" variant="outline" onClick={handleRefresh}>
                Tekrar Kontrol Et
              </CButton>
            </CCardBody>
          </CCard>
        ) : (
          <>
            {/* Sites Grid */}
            <CRow className="mb-4">
              {filteredSites.map((site) => (
                <CCol key={site.siteUrl} sm={6} lg={4} xl={3} className="mb-4">
                  <CCard
                    className={`h-100 site-card ${selectedSite === site.siteUrl ? 'border-primary border-2' : ''}`}
                    onClick={() => handleSiteSelect(site.siteUrl)}
                  >
                    <CCardBody>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="bg-primary bg-opacity-10 rounded p-2">
                          <CIcon icon={cilGlobeAlt} className="text-primary" />
                        </div>
                        <CBadge color={selectedSite === site.siteUrl ? "primary" : "success"}>
                          {selectedSite === site.siteUrl ? "Seçili" : "Aktif"}
                        </CBadge>
                      </div>
                      <h5 className="mb-2">{site.siteUrl}</h5>
                      <p className="text-muted small mb-0">
                        Yetki: {site.permissionLevel === 'siteOwner' ? 'Site Sahibi' : 'Sınırlı Erişim'}
                      </p>
                    </CCardBody>
                  </CCard>
                </CCol>
              ))}
            </CRow>
            {/* Selected Site Dashboard */}
            {selectedSite && (
              <>
                {/* Stats Cards */}
                <CRow className="mb-4">
                  <CCol xs={12} sm={6} lg={3}>
                    <StatCard
                      icon={cilGlobeAlt}
                      title="Domain"
                      value={selectedSite}
                      color="primary"
                      description="Aktif domain"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={3}>
                    <StatCard
                      icon={cilCalendar}
                      title="Eklenme Tarihi"
                      value={getSimulatedAddedDate(selectedSite)}
                      color="success"
                      description="Önce eklendi"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={3}>
                    <StatCard
                      icon={cilLockLocked}
                      title="Anahtar Kelimeler"
                      value={getSimulatedKeywordCount(selectedSite)}
                      color="warning"
                      description="Takip ediliyor"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={3}>
                    <StatCard
                      icon={cilLightbulb}
                      title="SEO Skoru"
                      value={`${getSimulatedSeoScore(selectedSite)}/100`}
                      color="info"
                      description="Mükemmel performans"
                    />
                  </CCol>
                </CRow>
                {/* Action Buttons */}
                <CRow>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilLockLocked}
                      title="Anahtar Kelime Analizi"
                      description="Kelime performanslarını ve sıralamalarını görüntüle"
                      onClick={() => handleNavigation(`/keywords/${encodeURIComponent(selectedSite)}`)}
                      color="primary"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilBarChart}
                      title="Trafik Analizi"
                      description="Organik trafik ve trend analizlerini incele"
                      onClick={() => handleNavigation(`/traffic/${encodeURIComponent(selectedSite)}`)}
                      color="success"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilFile}
                      title="Sayfa Analizi"
                      description="Teknik SEO ve sayfa performansı raporları"
                      onClick={() => handleNavigation(`/pages/${encodeURIComponent(selectedSite)}`)}
                      color="info"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilUser}
                      title="Rakip Analizi"
                      description="Rakiplerin performansını karşılaştır"
                      onClick={() => handleNavigation(`/competitors/${encodeURIComponent(selectedSite)}`)}
                      color="danger"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilChart}
                      title="Rapor Oluştur"
                      description="Detaylı SEO raporu hazırla ve indir"
                      onClick={() => handleNavigation(`/reports/${encodeURIComponent(selectedSite)}`)}
                      color="dark"
                    />
                  </CCol>
                  <CCol xs={12} sm={6} lg={4} className="mb-4">
                    <ActionButton
                      icon={cilSettings}
                      title="Site Ayarları"
                      description="Site konfigürasyonu ve izleme ayarları"
                      onClick={() => handleNavigation(`/site-settings/${encodeURIComponent(selectedSite)}`)}
                      color="secondary"
                    />
                  </CCol>
                </CRow>
              </>
            )}
            {/* All Sites Table */}
            <CCard className="mb-4">
              <CCardHeader className="bg-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Kayıtlı Siteleriniz</h5>
                  <CBadge color="success" className="me-2">
                    {sites.length} Site Bulundu
                  </CBadge>
                </div>
              </CCardHeader>
              <CCardBody>
                <CTable hover responsive striped>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>Site URL</CTableHeaderCell>
                      <CTableHeaderCell>Yetki Düzeyi</CTableHeaderCell>
                      <CTableHeaderCell>SEO Skoru</CTableHeaderCell>
                      <CTableHeaderCell>Durum</CTableHeaderCell>
                      <CTableHeaderCell>İşlemler</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {filteredSites.map((site, index) => (
                      <CTableRow key={site.siteUrl} className={selectedSite === site.siteUrl ? 'table-primary' : ''}>
                        <CTableDataCell>{index + 1}</CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center">
                            <CIcon icon={cilGlobeAlt} className="text-primary me-2" />
                            <a href={`https://${site.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                              {site.siteUrl}
                            </a>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={site.permissionLevel === 'siteOwner' ? 'success' : 'info'}>
                            {site.permissionLevel === 'siteOwner' ? 'Site Sahibi' : 'Sınırlı Erişim'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={getSeoScoreColor(getSimulatedSeoScore(site.siteUrl))} shape="rounded-pill">
                            {getSimulatedSeoScore(site.siteUrl)}/100
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="success">
                            <CIcon icon={cilCheckCircle} className="me-1" />
                            Aktif
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex gap-2">
                            <CButton
                              size="sm"
                              color={selectedSite === site.siteUrl ? "primary" : "outline-primary"}
                              onClick={() => handleSiteSelect(site.siteUrl)}
                            >
                              <CIcon icon={cilInfo} className="me-1" />
                              Seç
                            </CButton>
                            <CButton
                              size="sm"
                              color="outline-secondary"
                              onClick={() => handleNavigation(`/site-details/${encodeURIComponent(site.siteUrl)}`)}
                            >
                              <CIcon icon={cilChart} className="me-1" />
                              Analiz Et
                            </CButton>
                          </div>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </>
        )}
      </CContainer>
      {/* Custom Styles */}
      <style>{` /* jsx di. ayrılcak css burdan*/
        .stat-card-primary {
          background: linear-gradient(45deg, #0d6efd, #0056b3);
        }
        .stat-card-success {
          background: linear-gradient(45deg, #198754, #146c43);
        }
        .stat-card-warning {
          background: linear-gradient(45deg, #ffc107, #e0a800);
        }
        .stat-card-info {
          background: linear-gradient(45deg, #0dcaf0, #0aa2c0);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
        }
        .action-card {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        .action-icon-primary {
          color: #0d6efd;
          background: rgba(13, 110, 253, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .action-icon-success {
          color: #198754;
          background: rgba(25, 135, 84, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .action-icon-info {
          color: #0dcaf0;
          background: rgba(13, 202, 240, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .action-icon-danger {
          color: #dc3545;
          background: rgba(220, 53, 69, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .action-icon-dark {
          color: #212529;
          background: rgba(33, 37, 41, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .action-icon-secondary {
          color: #6c757d;
          background: rgba(108, 117, 125, 0.1);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .site-card {
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .site-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

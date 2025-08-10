import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CModalTitle,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CRow,
  CCol,
  CButton,
  CSpinner,
  CAlert,
  CFormSelect,
  CFormInput,
  CBadge,
  CListGroup,
  CListGroupItem
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilArrowLeft,
  cilCloudDownload,
  cilDescription,
  cilPrint,
  cilShare,
  cilChart,
  cilSpeedometer,
  cilContrast // Replaced cilShield with a valid and more appropriate icon for competitor analysis
} from '@coreui/icons';

const Reports = () => {
  const { site } = useParams();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedReportType, setSelectedReportType] = useState('comprehensive');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', body: '', color: 'info' });

  // Mock data
  const mockReportData = {
    summary: {
      totalPages: 156,
      totalKeywords: 2340,
      organicTraffic: 45280,
      avgPosition: 8.4,
      seoScore: 78,
      issuesFound: 23
    },
    recentReports: [
      {
        id: 1,
        name: 'SEO Comprehensive Report',
        type: 'comprehensive',
        date: '2024-01-15',
        status: 'completed',
        size: '2.4 MB'
      },
      {
        id: 2,
        name: 'Keyword Performance Report',
        type: 'keywords',
        date: '2024-01-10',
        status: 'completed',
        size: '1.8 MB'
      },
      {
        id: 3,
        name: 'Technical SEO Audit',
        type: 'technical',
        date: '2024-01-05',
        status: 'completed',
        size: '3.1 MB'
      }
    ]
  };

  const reportTypes = [
    { value: 'comprehensive', label: 'Kapsamlı SEO Raporu', icon: cilChart },
    { value: 'keywords', label: 'Anahtar Kelime Raporu', icon: cilDescription },
    { value: 'technical', label: 'Teknik SEO Raporu', icon: cilSpeedometer },
    { value: 'competitor', label: 'Rakip Analizi Raporu', icon: cilContrast },
    { value: 'traffic', label: 'Trafik Analizi Raporu', icon: cilChart }
  ];

  const timePeriods = [
    { value: '7', label: 'Son 7 Gün' },
    { value: '30', label: 'Son 30 Gün' },
    { value: '90', label: 'Son 3 Ay' },
    { value: '180', label: 'Son 6 Ay' },
    { value: '365', label: 'Son 1 Yıl' }
  ];

  useEffect(() => {
    // Load existing report data
    setReportData(mockReportData);
  }, [site]);

  const showModal = (title, body, color) => {
    setModalContent({ title, body, color });
    setModalVisible(true);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // In a real app, this would trigger backend report generation
      console.log(`Generating ${selectedReportType} report for ${site} with ${selectedPeriod} days period`);

      // Show success message using the custom modal
      showModal('Rapor Başarıyla Oluşturuldu!', 'Rapor başarıyla oluşturuldu! İndirme işlemi başlayacak.', 'success');

    } catch (error) {
      console.error('Report generation error:', error);
      // Show error message using the custom modal
      showModal('Hata', 'Rapor oluşturulurken bir hata oluştu.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = (reportId) => {
    // In a real app, this would download the actual file
    console.log(`Downloading report ${reportId}`);
    // Show download message using the custom modal
    showModal('İndirme Başlatıldı', `Rapor ${reportId} indiriliyor...`, 'info');
  };

  const getReportTypeIcon = (type) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.icon : cilDescription;
  };

  const getReportTypeName = (type) => {
    const reportType = reportTypes.find(rt => rt.value === type);
    return reportType ? reportType.label : 'Bilinmeyen Rapor';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <CBadge color="success">Tamamlandı</CBadge>;
      case 'processing':
        return <CBadge color="warning">İşleniyor</CBadge>;
      case 'failed':
        return <CBadge color="danger">Başarısız</CBadge>;
      default:
        return <CBadge color="secondary">{status}</CBadge>;
    }
  };

  const StatCard = ({ title, value, color = "primary" }) => (
    <CCard className={`text-white bg-${color} mb-3`}>
      <CCardBody>
        <div className="text-center">
          <div className="fs-4 fw-bold">{value}</div>
          <div className="fs-6">{title}</div>
        </div>
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
            <CIcon icon={cilArrowLeft} className="me-2" />
            Geri Dön
          </CButton>
          <h2 className="mb-0">SEO Raporları</h2>
          <p className="text-muted mb-0">Site: <strong>{site}</strong></p>
        </div>
      </div>

      <CRow>
        {/* Rapor Oluşturma */}
        <CCol lg={8}>
          <CCard className="mb-4">
            <CCardHeader>
              <h5 className="mb-0">
                <CIcon icon={cilDescription} className="me-2" />
                Yeni Rapor Oluştur
              </h5>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={6}>
                  <label className="form-label">Rapor Türü</label>
                  <CFormSelect
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                  >
                    {reportTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={6}>
                  <label className="form-label">Zaman Aralığı</label>
                  <CFormSelect
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  >
                    {timePeriods.map(period => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              <div className="mb-3">
                <label className="form-label">Ek Notlar (Opsiyonel)</label>
                <CFormInput
                  type="text"
                  placeholder="Rapor için özel notlarınızı ekleyin..."
                />
              </div>

              <div className="d-flex gap-2">
                <CButton
                  color="primary"
                  onClick={handleGenerateReport}
                  disabled={loading}
                  className="d-flex align-items-center"
                >
                  {loading ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilCloudDownload} className="me-2" />
                      Rapor Oluştur
                    </>
                  )}
                </CButton>

                <CButton color="outline-secondary" disabled>
                  <CIcon icon={cilPrint} className="me-2" />
                  Yazdır
                </CButton>

                <CButton color="outline-info" disabled>
                  <CIcon icon={cilShare} className="me-2" />
                  Paylaş
                </CButton>
              </div>

              <div className="mt-3">
                <small className="text-muted">
                  * Kapsamlı raporların oluşturulması 2-3 dakika sürebilir.
                </small>
              </div>
            </CCardBody>
          </CCard>

          {/* Geçmiş Raporlar */}
          <CCard>
            <CCardHeader>
              <h5 className="mb-0">Geçmiş Raporlar</h5>
            </CCardHeader>
            <CCardBody>
              {reportData?.recentReports.length === 0 ? (
                <CAlert color="info">Henüz oluşturulmuş rapor bulunmuyor.</CAlert>
              ) : (
                <CListGroup flush>
                  {reportData?.recentReports.map(report => (
                    <CListGroupItem key={report.id} className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <CIcon icon={getReportTypeIcon(report.type)} className="me-3 text-primary" />
                        <div>
                          <div className="fw-bold">{report.name}</div>
                          <small className="text-muted">
                            {new Date(report.date).toLocaleDateString('tr-TR')} • {report.size}
                          </small>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {getStatusBadge(report.status)}
                        <CButton
                          color="primary"
                          size="sm"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <CIcon icon={cilCloudDownload} className="me-1" />
                          İndir
                        </CButton>
                      </div>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        {/* Özet İstatistikler */}
        <CCol lg={4}>
          <CCard className="mb-4">
            <CCardHeader>
              <h6 className="mb-0">Site Özeti</h6>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol xs={6}>
                  <StatCard
                    title="Toplam Sayfa"
                    value={reportData?.summary.totalPages || 0}
                    color="primary"
                  />
                </CCol>
                <CCol xs={6}>
                  <StatCard
                    title="Anahtar Kelime"
                    value={reportData?.summary.totalKeywords || 0}
                    color="success"
                  />
                </CCol>
                <CCol xs={6}>
                  <StatCard
                    title="Organik Trafik"
                    value={reportData?.summary.organicTraffic?.toLocaleString() || 0}
                    color="info"
                  />
                </CCol>
                <CCol xs={6}>
                  <StatCard
                    title="SEO Skoru"
                    value={`${reportData?.summary.seoScore || 0}/100`}
                    color="warning"
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          <CAlert color="info">
            <strong>💡 Rapor İpuçları:</strong>
            <ul className="mb-0 mt-2 small">
              <li>Kapsamlı raporlar tüm SEO metriklerini içerir</li>
              <li>Aylık raporları karşılaştırarak trend analizi yapın</li>
              <li>Raporları müşterilerle paylaşmak için PDF formatını kullanın</li>
              <li>Teknik raporlar geliştiriciler için uygundur</li>
            </ul>
          </CAlert>
        </CCol>
      </CRow>

      {loading && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50" style={{zIndex: 9999}}>
          <CCard className="text-center">
            <CCardBody>
              <CSpinner color="primary" size="lg" className="mb-3" />
              <h5>Rapor Oluşturuluyor...</h5>
              <p className="text-muted mb-0">Lütfen bekleyin, veriler analiz ediliyor.</p>
            </CCardBody>
          </CCard>
        </div>
      )}

      {/* Custom Alert Modal */}
      <CModal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <CModalHeader onClose={() => setModalVisible(false)}>
          <CModalTitle>
            <CIcon icon={cilDescription} className="me-2" />
            {modalContent.title}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color={modalContent.color}>{modalContent.body}</CAlert>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setModalVisible(false)}>
            Kapat
          </CButton>
        </CModalFooter>
      </CModal>
    </CContainer>
  );
};

export default Reports;

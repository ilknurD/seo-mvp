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
  CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import * as icons from '@coreui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const TrafficAnalysis = () => {
  const { site } = useParams();
  const navigate = useNavigate();
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // 7, 30 veya 90 gün

  // Trafik verilerini çekme fonksiyonu
  const fetchTrafficData = async () => {
  setLoading(true);
  setError(null);
  try {
    console.log(`Trafik verileri çekiliyor: ${site}, tarih aralığı: ${dateRange} gün`);
    // Site adını temizle
    const cleanSite = site.replace(/^https?:\/\//, '').replace(/\/$/, '');
    console.log(`Temizlenmiş site: ${cleanSite}`);

    const params = {
      days: dateRange
    };

    const response = await axios.get(
      `http://localhost:5000/sites/${cleanSite}/traffic-analysis`,
      {
        withCredentials: true,
        params: {
          days: dateRange
        }
      }
    );

    console.log("Trafik verileri alındı:", response.data);
    setTrafficData(response.data);
  } catch (err) {
      console.error("Trafik verileri çekme hatası:", err);
    if (err.response) {
      console.error("Hata durumu:", err.response.status);
      console.error("Hata verisi:", err.response.data);

      // Google Analytics API özel hata mesajları
      let errorMessage = "Trafik verileri alınamadı.";
      if (err.response.data && err.response.data.detail) {
        if (err.response.data.detail.includes("unexpected keyword argument")) {
          errorMessage = "Google Analytics API parametre hatası. Lütfen sistem yöneticisine bildirin.";
        } else {
          errorMessage += ` ${err.response.data.detail}`;
        }
      }

      // HTTP durum kodlarına göre özel mesajlar
      if (err.response.status === 401) {
        errorMessage = "Oturumunuzun süresi dolmuş. Lütfen tekrar giriş yapın.";
      } else if (err.response.status === 403) {
        errorMessage = "Bu işlem için yetkiniz yok.";
      } else if (err.response.status === 404) {
        errorMessage = "Google Analytics verileri bulunamadı. Lütfen Google Analytics entegrasyonunu kontrol edin.";
      } else if (err.response.status === 429) {
        errorMessage = "Çok fazla istek yapıldı. Lütfen daha sonra tekrar deneyin.";
      } else if (err.response.status === 500) {
        errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
      }

      setError(errorMessage);
    } else if (err.request) {
      console.error("İstek hatası:", err.request);
      setError("Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.");
    } else {
      setError("Bilinmeyen bir hata oluştu.");
    }
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (site) {
      fetchTrafficData();
    }
  }, [site, dateRange]);

  const StatCard = ({ icon, title, value, subtitle, color = "primary", trend = null }) => (
    <CCard className={`text-white bg-${color} mb-4`}>
      <CCardBody>
        <div className="d-flex justify-content-between">
          <div>
            <div className="fs-6 fw-semibold text-white-75">{title}</div>
            <div className="fs-4 fw-bold">{value}</div>
            {subtitle && <div className="small text-white-75">{subtitle}</div>}
          </div>
          <div className="d-flex flex-column align-items-center">
            <div className="bg-white bg-opacity-25 p-3 rounded mb-2">
              <CIcon icon={icon} size="xl" />
            </div>
            {trend && (
              <div className={`d-flex align-items-center ${trend > 0 ? 'text-white-75' : 'text-white-50'}`}>
                <CIcon
                  icon={trend > 0 ? icons.cilArrowTop : icons.cilArrowBottom}
                  className="me-1"
                  size="sm"
                />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
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
            <CIcon icon={icons.cilArrowLeft} className="me-2" />
            Geri Dön
          </CButton>
          <h2 className="mb-0">Trafik Analizi</h2>
          <p className="text-muted mb-0">Site: <strong>{site}</strong></p>
        </div>

        {/* Tarih aralığı seçici */}
        <div className="d-flex gap-2">
          <CButton
            color={dateRange === '7' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setDateRange('7')}
          >
            7 Gün
          </CButton>
          <CButton
            color={dateRange === '30' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setDateRange('30')}
          >
            30 Gün
          </CButton>
          <CButton
            color={dateRange === '90' ? 'primary' : 'outline-primary'}
            size="sm"
            onClick={() => setDateRange('90')}
          >
            90 Gün
          </CButton>
        </div>
      </div>

      {error && <CAlert color="danger">{error}</CAlert>}

      {loading ? (
        <div className="text-center py-5">
          <CSpinner color="primary" size="lg" />
          <p className="mt-3">Trafik verileri yükleniyor. Bekleyiniz...</p>
        </div>
      ) : !trafficData ? (
        <CAlert color="danger">Trafik verileri yüklenemedi.</CAlert>
      ) : (
        <>
          {/* Ana Metrikler */}
          <CRow className="mb-4">
            <CCol sm={6} lg={3}>
              <StatCard
                icon={icons.cilPeople}
                title="Toplam Ziyaretçi"
                value={trafficData.totalVisits.toLocaleString()}
                subtitle={`${trafficData.monthlyGrowth > 0 ? '+' : ''}${trafficData.monthlyGrowth.toFixed(1)}% bu ay`}
                color="primary"
                trend={trafficData.monthlyGrowth}
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <StatCard
                icon={icons.cilTrendingUp}
                title="Organik Trafik"
                value={trafficData.organicTraffic.toLocaleString()}
                subtitle={`${((trafficData.organicTraffic / trafficData.totalVisits) * 100).toFixed(1)}% toplam`}
                color="success"
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <StatCard
                icon={icons.cilChart}
                title="Sayfa Görüntüleme"
                value={trafficData.pageViews.toLocaleString()}
                subtitle="Toplam sayfa görüntüleme"
                color="info"
              />
            </CCol>
            <CCol sm={6} lg={3}>
              <StatCard
                icon={icons.cilClock}
                title="Ortalama Süre"
                value={trafficData.avgSessionDuration}
                subtitle={`%${trafficData.bounceRate.toFixed(1)} çıkış oranı`}
                color="warning"
              />
            </CCol>
          </CRow>

          <CRow>
            {/* En Çok Ziyaret Edilen Sayfalar */}
            <CCol lg={6}>
              <CCard className="mb-4">
                <CCardHeader>
                  <h5 className="mb-0">En Popüler Sayfalar</h5>
                </CCardHeader>
                <CCardBody>
                  {trafficData.topPages.map((page, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div>
                        <div className="fw-bold">{page.page}</div>
                        <small className="text-muted">{page.visits.toLocaleString()} ziyaretçi</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-primary">{page.percentage.toFixed(1)}%</div>
                        <div className="progress" style={{ width: '100px', height: '4px' }}>
                          <div
                            className="progress-bar bg-primary"
                            style={{ width: `${page.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            </CCol>

            {/* Trafik Kaynakları */}
            <CCol lg={6}>
              <CCard className="mb-4">
                <CCardHeader>
                  <h5 className="mb-0">Trafik Kaynakları</h5>
                </CCardHeader>
                <CCardBody>
                  {trafficData.trafficSources.map((source, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                      <div>
                        <div className="fw-bold">{source.source}</div>
                        <small className="text-muted">{source.visits.toLocaleString()} ziyaretçi</small>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success">{source.percentage.toFixed(1)}%</div>
                        <div className="progress" style={{ width: '100px', height: '4px' }}>
                          <div
                            className="progress-bar bg-success"
                            style={{ width: `${source.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Ek Bilgiler */}
          <CRow>
            <CCol xs={12}>
              <CCard className="mb-4">
                <CCardHeader>
                  <h5 className="mb-0">Analiz Özeti</h5>
                </CCardHeader>
                <CCardBody>
                  <div className="d-flex align-items-center mb-3">
                    <div className="me-3">
                      <div className="fs-5 fw-bold">Performans Değerlendirmesi</div>
                    </div>
                    <div className="ms-auto">
                      <CBadge
                        color={trafficData.monthlyGrowth > 0 ? 'success' : 'danger'}
                        size="lg"
                      >
                        {trafficData.monthlyGrowth > 0 ? 'Büyüyor' : 'Küçülüyor'}
                      </CBadge>
                    </div>
                  </div>

                  <div className="progress mb-3" style={{ height: '10px' }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, Math.abs(trafficData.monthlyGrowth) * 2)}%`,
                        backgroundColor: trafficData.monthlyGrowth > 0 ? '#28a745' : '#dc3545'
                      }}
                    ></div>
                  </div>

                  <CAlert color="info">
                    <strong>💡 Analiz Özeti:</strong> Siteniz {trafficData.monthlyGrowth > 0 ? 'büyüyor' : 'küçülüyor'}!
                    Organik trafikten gelen ziyaretçi oranı %{((trafficData.organicTraffic / trafficData.totalVisits) * 100).toFixed(1)}
                    ve bu oldukça {trafficData.organicTraffic / trafficData.totalVisits > 0.6 ? 'iyi' : 'geliştirilebilir'} bir oran.
                    Ortalama oturum süresi {trafficData.avgSessionDuration} ve çıkış oranı %{trafficData.bounceRate.toFixed(1)}.
                  </CAlert>

                  <div className="mt-3">
                    <h6>Öneriler:</h6>
                    <ul>
                      {trafficData.monthlyGrowth < 5 && (
                        <li>Daha fazla organik trafik çekmek için içerik stratejinizi gözden geçirin.</li>
                      )}
                      {trafficData.bounceRate > 50 && (
                        <li>Çıkış oranını düşürmek için sayfa içeriğini ve kullanıcı deneyimini iyileştirin.</li>
                      )}
                      {trafficData.avgSessionDuration < '00:02:00' && (
                        <li>Ziyaretçilerin sitede daha fazla zaman geçirmesi için ilgi çekici içerik ekleyin.</li>
                      )}
                      <li>Düzenli olarak yeni ve kaliteli içerik yayınlayarak trafik artışını sürdürün.</li>
                    </ul>
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </>
      )}
    </CContainer>
  );
};

export default TrafficAnalysis;

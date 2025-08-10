import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// CoreUI bileşenleri ve Tailwind CSS ile modern bir rakip analiz paneli oluşturuldu.
// @coreui/icons içe aktarma hatasını çözmek için simgeler manuel olarak tanımlanmıştır.
import CIcon from '@coreui/icons-react';
import {
  CCard,
  CCardBody,
  CCardHeader,
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
  CFormInput,
  CInputGroup,
  CInputGroupText
} from '@coreui/react';

// Tailwind CSS için gerekli script'i ekliyoruz. Bu, CoreUI'nin düzen sınıflarını
// Tailwind sınıflarıyla birleştirmemizi sağlar.
const TailwindScript = () => (
  <script src="https://cdn.tailwindcss.com"></script>
);

// Simgeleri (icons) doğrudan SVG yolu verileriyle tanımlıyoruz.
// Bu, '@coreui/icons' içe aktarma hatasını önler ve harici bir kütüphaneye bağımlılığı ortadan kaldırır.
const cilArrowLeft = ['512 512', '<path d="M237.4,269.4L372.6,134.2c6.2-6.2,6.2-16.4,0-22.6c-6.2-6.2-16.4-6.2-22.6,0l-150,150c-6.2,6.2-6.2,16.4,0,22.6l150,150c6.2,6.2,16.4,6.2,22.6,0c6.2-6.2,6.2-16.4,0-22.6L237.4,269.4z"/>'];
const cilSearch = ['512 512', '<path d="M331.2,331.2c-29.2,29.2-68,45.2-109.2,45.2c-41.2,0-80-16-109.2-45.2c-29.2-29.2-45.2-68-45.2-109.2c0-41.2,16-80,45.2-109.2c29.2-29.2,68-45.2,109.2-45.2c41.2,0,80,16,109.2,45.2c29.2,29.2,45.2,68,45.2,109.2C376.4,263.2,360.4,302,331.2,331.2zM454,420c-15.6,15.6-41,15.6-56.6,0L340,362c-35.4,26.8-78.6,42-125.6,42c-56,0-108.6-21.8-148.6-61.8C25.8,302.6,4,250,4,194C4,138,25.8,85.4,65.8,45.4C105.8,5.4,158.4-16.4,214.4-16.4c56,0,108.6,21.8,148.6,61.8C403.6,101.4,425.4,154,425.4,210c0,47-15.2,90.2-42,125.6l56,57.4C469.6,379,469.6,404.4,454,420z"/>'];
const cilTrendingUp = ['512 512', '<path d="M498.4,159.2L352.8,304.8c-6.2,6.2-16.4,6.2-22.6,0L266,239.6L127.8,377.8c-6.2,6.2-16.4,6.2-22.6,0L13.6,285.6c-6.2-6.2-6.2-16.4,0-22.6s16.4-6.2,22.6,0l91.6,91.6L254.6,217c6.2-6.2,16.4-6.2,22.6,0l64.2,64.2L475.8,136.6c6.2-6.2,16.4-6.2,22.6,0S504.6,153,498.4,159.2z"/>'];
const cilTrendingDown = ['512 512', '<path d="M498.4,285.6L475.8,263c-6.2-6.2-16.4-6.2-22.6,0L334,394.6l-64.2-64.2c-6.2-6.2-16.4-6.2-22.6,0L105.2,460c-6.2,6.2-6.2,16.4,0,22.6s16.4,6.2,22.6,0l138.2-138.2c6.2-6.2,16.4-6.2,22.6,0l64.2,64.2l128.8-128.8c6.2-6.2,16.4-6.2,22.6,0s6.2,16.4,0,22.6z"/>'];
const cilUser = ['512 512', '<path d="M256,256c-64,0-116.4-52.4-116.4-116.4S192,23.2,256,23.2s116.4,52.4,116.4,116.4S320,256,256,256zM256,295.8c114,0,206.8,92.8,206.8,206.8h-413.6C49.2,388.6,142,295.8,256,295.8z"/>'];
const cilGlobeAlt = ['512 512', '<path d="M256,48.2C130,48.2,28.6,130,28.6,256S130,463.8,256,463.8S483.4,382,483.4,256S382,48.2,256,48.2zM256,432.2c-97.4,0-176.2-78.8-176.2-176.2S158.6,79.8,256,79.8S432.2,158.6,432.2,256S353.4,432.2,256,432.2zM368,256c0,61.4-49.8,111.2-111.2,111.2S145.6,317.4,145.6,256s49.8-111.2,111.2-111.2S368,194.6,368,256z"/>'];
const cilChart = ['512 512', '<path d="M503.2,467.2c-4.8,4.8-12.8,4.8-17.6,0L256,220.8l-87.2,87.2c-4.8,4.8-12.8,4.8-17.6,0L8.8,168.8c-4.8-4.8-4.8-12.8,0-17.6l24-24c4.8-4.8,12.8-4.8,17.6,0l128,128L256,183.2l229.6,229.6c4.8,4.8,4.8,12.8,0,17.6L503.2,467.2z"/>'];


const CompetitorAnalysis = ({ site, onBack }) => {
  const [competitorData, setCompetitorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for demonstration purposes
  const mockCompetitorData = {
    mainCompetitors: [
      {
        domain: 'competitor1.com',
        authorityScore: 85,
        organicTraffic: 125000,
        keywords: 3420,
        backlinks: 15600,
        overlap: 65,
        trend: 'up'
      },
      {
        domain: 'competitor2.com',
        authorityScore: 78,
        organicTraffic: 98000,
        keywords: 2890,
        backlinks: 12300,
        overlap: 52,
        trend: 'down'
      },
      {
        domain: 'competitor3.com',
        authorityScore: 72,
        organicTraffic: 87500,
        keywords: 2150,
        backlinks: 9800,
        overlap: 48,
        trend: 'up'
      }
    ],
    keywordGaps: [
      { keyword: 'dijital pazarlama', yourRank: null, competitor1: 3, competitor2: 7, volume: 8900 },
      { keyword: 'sosyal medya yönetimi', yourRank: 15, competitor1: 2, competitor2: 5, volume: 5400 },
      { keyword: 'web tasarım', yourRank: 8, competitor1: 1, competitor2: 12, volume: 12000 },
      { keyword: 'seo hizmetleri', yourRank: 4, competitor1: 6, competitor2: 3, volume: 3200 },
      { keyword: 'içerik pazarlaması', yourRank: null, competitor1: 5, competitor2: 9, volume: 2800 }
    ],
    contentGaps: [
      { topic: 'E-ticaret SEO Rehberi', competitor: 'competitor1.com', traffic: 15000, difficulty: 65 },
      { topic: 'Sosyal Medya Algoritmaları', competitor: 'competitor2.com', traffic: 12000, difficulty: 58 },
      { topic: 'Google Ads Optimizasyonu', competitor: 'competitor1.com', traffic: 8500, difficulty: 72 },
      { topic: 'Mobil SEO İpuçları', competitor: 'competitor3.com', traffic: 6200, difficulty: 45 }
    ]
  };

  useEffect(() => {
    // Veri çekme işlemini simule ediyoruz
    const fetchCompetitorData = async () => {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1800));
        setCompetitorData(mockCompetitorData);
      } catch (error) {
        console.error('Competitor data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitorData();
  }, [site]);

  const filteredKeywordGaps = competitorData?.keywordGaps.filter(keyword =>
    keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getTrendIcon = (trend) => {
    return trend === 'up' ?
      <CIcon icon={cilTrendingUp} className="text-green-500" /> :
      <CIcon icon={cilTrendingDown} className="text-red-500" />;
  };

  const CompetitorCard = ({ competitor }) => (
    <CCard className="mb-4 shadow-sm rounded-lg">
      <CCardBody>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <div className="mr-3">
              <CIcon icon={cilGlobeAlt} size="lg" className="text-blue-500" />
            </div>
            <div>
              <h6 className="mb-1 text-base font-semibold">{competitor.domain}</h6>
              <small className="text-gray-500">Rakip Site</small>
            </div>
          </div>
          <div className="text-right">
            {getTrendIcon(competitor.trend)}
            <CBadge color="secondary" className="ml-2 bg-gray-200 text-gray-800 rounded-full px-2 py-1">
              %{competitor.overlap} Ortak
            </CBadge>
          </div>
        </div>
        <div className="flex flex-wrap -mx-2">
          <div className="px-2 w-1/2 md:w-1/4 mb-3 md:mb-0 border-r border-gray-200">
            <div className="text-center">
              <div className="text-xl font-bold text-green-500">{competitor.authorityScore}</div>
              <small className="text-gray-500">Otorite Skoru</small>
            </div>
          </div>
          <div className="px-2 w-1/2 md:w-1/4 mb-3 md:mb-0 border-r border-gray-200">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-500">{competitor.organicTraffic.toLocaleString()}</div>
              <small className="text-gray-500">Organik Trafik</small>
            </div>
          </div>
          <div className="px-2 w-1/2 md:w-1/4 border-r md:border-r-0 border-gray-200">
            <div className="text-center">
              <div className="text-xl font-bold text-sky-500">{competitor.keywords.toLocaleString()}</div>
              <small className="text-gray-500">Anahtar Kelime</small>
            </div>
          </div>
          <div className="px-2 w-1/2 md:w-1/4">
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">{competitor.backlinks.toLocaleString()}</div>
              <small className="text-gray-500">Backlink</small>
            </div>
          </div>
        </div>
      </CCardBody>
    </CCard>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 bg-gray-100 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <CButton
              color="light"
              onClick={onBack}
              className="mr-3 border border-gray-300 rounded-full px-4 py-2"
            >
              <CIcon icon={cilArrowLeft} className="mr-2" />
              Geri Dön
            </CButton>
            <div>
              <h2 className="mb-0 text-2xl font-bold">Rakip Analizi</h2>
              <p className="text-gray-600 mb-0">Site: <strong className="text-gray-800">{site}</strong></p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <CSpinner color="primary" size="lg" />
            <p className="mt-3 text-gray-700">Rakip analizi yapılıyor...</p>
          </div>
        ) : !competitorData ? (
          <CAlert color="danger" className="rounded-lg">Rakip analizi verileri yüklenemedi.</CAlert>
        ) : (
          <>
            {/* Ana Rakipler */}
            <div className="mb-6">
              <CCard className="shadow-lg rounded-lg">
                <CCardHeader className="border-b border-gray-200">
                  <h5 className="mb-0 text-xl font-semibold">
                    <CIcon icon={cilUser} className="mr-2" />
                    Ana Rakipleriniz
                  </h5>
                </CCardHeader>
                <CCardBody>
                  <div className="grid gap-4">
                    {competitorData.mainCompetitors.map((competitor, index) => (
                      <CompetitorCard key={index} competitor={competitor} />
                    ))}
                  </div>
                </CCardBody>
              </CCard>
            </div>

            <div className="flex flex-col lg:flex-row -mx-3">
              {/* Anahtar Kelime Boşlukları */}
              <div className="px-3 w-full lg:w-8/12 mb-6">
                <CCard className="shadow-lg rounded-lg h-full">
                  <CCardHeader className="border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <h5 className="mb-2 sm:mb-0 text-xl font-semibold">Anahtar Kelime Fırsatları</h5>
                      <CInputGroup className="w-full sm:w-64 rounded-lg">
                        <CInputGroupText className="bg-white border-r-0 rounded-l-lg border-gray-300">
                          <CIcon icon={cilSearch} className="text-gray-500" />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="Kelime ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="border-l-0 rounded-r-lg border-gray-300 focus:ring-blue-500"
                        />
                      </CInputGroup>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    <div className="overflow-x-auto">
                      <CTable hover responsive className="min-w-full">
                        <CTableHead className="bg-gray-50">
                          <CTableRow>
                            <CTableHeaderCell className="text-gray-600 font-medium">Anahtar Kelime</CTableHeaderCell>
                            <CTableHeaderCell className="text-gray-600 font-medium">Sizin Sıranız</CTableHeaderCell>
                            <CTableHeaderCell className="text-gray-600 font-medium">Rakip 1</CTableHeaderCell>
                            <CTableHeaderCell className="text-gray-600 font-medium">Rakip 2</CTableHeaderCell>
                            <CTableHeaderCell className="text-gray-600 font-medium">Hacim</CTableHeaderCell>
                          </CTableRow>
                        </CTableHead>
                        <CTableBody>
                          {filteredKeywordGaps.map((keyword, index) => (
                            <CTableRow key={index} className="hover:bg-gray-50">
                              <CTableDataCell>
                                <strong className="text-gray-800">{keyword.keyword}</strong>
                              </CTableDataCell>
                              <CTableDataCell>
                                {keyword.yourRank ? (
                                  <CBadge color={keyword.yourRank <= 10 ? 'success' : 'warning'} className="rounded-full px-2 py-1">
                                    #{keyword.yourRank}
                                  </CBadge>
                                ) : (
                                  <CBadge color="secondary" className="rounded-full px-2 py-1">Yok</CBadge>
                                )}
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color="danger" className="rounded-full px-2 py-1">#{keyword.competitor1}</CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color="danger" className="rounded-full px-2 py-1">#{keyword.competitor2}</CBadge>
                              </CTableDataCell>
                              <CTableDataCell className="text-gray-700">{keyword.volume.toLocaleString()}</CTableDataCell>
                            </CTableRow>
                          ))}
                        </CTableBody>
                      </CTable>
                    </div>
                  </CCardBody>
                </CCard>
              </div>

              {/* İçerik Fırsatları */}
              <div className="px-3 w-full lg:w-4/12 mb-6">
                <CCard className="shadow-lg rounded-lg h-full">
                  <CCardHeader className="border-b border-gray-200">
                    <h5 className="mb-0 text-xl font-semibold">
                      <CIcon icon={cilChart} className="mr-2" />
                      İçerik Fırsatları
                    </h5>
                  </CCardHeader>
                  <CCardBody>
                    {competitorData.contentGaps.map((content, index) => (
                      <div key={index} className="mb-4 pb-4 border-b border-gray-200 last:border-b-0">
                        <h6 className="mb-2 text-base font-semibold text-gray-800">{content.topic}</h6>
                        <div className="flex justify-between mb-1">
                          <small className="text-gray-500">Rakip:</small>
                          <code className="text-sm font-mono text-gray-700">{content.competitor}</code>
                        </div>
                        <div className="flex justify-between mb-1">
                          <small className="text-gray-500">Trafik:</small>
                          <strong className="text-green-500">{content.traffic.toLocaleString()}</strong>
                        </div>
                        <div className="mb-1">
                          <small className="text-gray-500">Zorluk: {content.difficulty}%</small>
                        </div>
                        <CProgress className="mb-1 h-1.5 rounded-full">
                          <CProgressBar
                            color={content.difficulty < 50 ? 'success' : content.difficulty < 70 ? 'warning' : 'danger'}
                            value={content.difficulty}
                            className="rounded-full"
                          />
                        </CProgress>
                      </div>
                    ))}
                  </CCardBody>
                </CCard>
              </div>
            </div>

            {/* Stratejik Öneriler */}
            <div className="mb-6">
              <div className="bg-blue-100 border border-blue-200 text-blue-800 p-4 rounded-lg shadow-sm">
                <strong className="text-lg">🎯 Stratejik Öneriler:</strong>
                <ul className="mt-2 list-disc list-inside">
                  <li><strong>Anahtar Kelime Fırsatları:</strong> Rakiplerinizin 1-5. sıralarda olduğu ama sizin bulunmadığınız kelimelere odaklanın</li>
                  <li><strong>İçerik Boşlukları:</strong> Rakiplerinizin yüksek trafik aldığı konularda içerik üretin</li>
                  <li><strong>Backlink Fırsatları:</strong> Rakiplerinizin backlink aldığı siteleri araştırın</li>
                  <li><strong>Sosyal Medya:</strong> Rakiplerinizin aktif olduğu platformlarda varlığınızı artırın</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const App = () => {
  // useParams ve useNavigate hook'ları immersive ortamda çalışmayacağı için
  // bu işlevsellik propslar aracılığıyla simule edilmiştir.
  const site = "example.com";
  const handleBack = () => {
    // navigate(-1) işlevini simule etmek için bir mesaj gösteriyoruz.
    alert("Geri dönme fonksiyonu tetiklendi. Tarayıcı geçmişinde geri gidebilirsiniz.");
  };

  return (
    <>
      <TailwindScript />
      <CompetitorAnalysis site={site} onBack={handleBack} />
    </>
  );
};

export default App;

// React uygulamasını DOM'a render etme
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);


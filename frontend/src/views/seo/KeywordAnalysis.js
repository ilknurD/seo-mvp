import React, { useEffect, useState } from 'react';
import {
  CCard, CCardBody, CCardHeader, CContainer, CRow, CCol,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell,
  CBadge, CSpinner, CAlert
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import * as icons from '@coreui/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const KeywordAnalysis = () => {
  const navigate = useNavigate();
  const site = 'ilknurdmn.com.tr'; // örnek domain
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    axios.get('/keyword-analysis', { withCredentials: true }) // proxy üzerinden çalışacak
      .then(res => setKeywords(res.data?.keywords || []))
      .catch(err => {
        console.error(err);
        setKeywords([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredKeywords = keywords.filter(k =>
    k.keys?.[0]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CContainer fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <CIcon icon={icons.cilChart} className="me-2" size="lg" />
          <h2 className="mb-0 d-inline">Anahtar Kelime Analizi</h2>
          <p className="text-muted mb-0">Site: <strong>{site}</strong></p>
        </div>
        <CIcon icon={icons.cilReload} role="button" onClick={() => window.location.reload()} />
      </div>

      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Anahtar Kelimeler ({filteredKeywords.length})</h5>
                <input
                  className="form-control"
                  placeholder="Kelime ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '300px' }}
                />
              </div>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                  <p className="mt-2">Anahtar kelimeler yükleniyor...</p>
                </div>
              ) : filteredKeywords.length === 0 ? (
                <CAlert color="info">
                  {searchTerm ? 'Arama sonucunda eşleşme yok.' : 'Henüz anahtar kelime verisi yok.'}
                </CAlert>
              ) : (
                <CTable striped hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Keyword</CTableHeaderCell>
                      <CTableHeaderCell>Clicks</CTableHeaderCell>
                      <CTableHeaderCell>Impressions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {filteredKeywords.map((k, i) => (
                      <CTableRow key={i}>
                        <CTableDataCell>{k.keys?.[0] ?? '—'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="primary">{k.clicks ?? 0}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{k.impressions ?? 0}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default KeywordAnalysis;

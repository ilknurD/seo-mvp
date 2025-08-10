import axios from 'axios';
import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';


import { CSpinner, useColorModes } from '@coreui/react';
import './scss/style.scss';
import './scss/examples.scss';

axios.defaults.withCredentials = true; // Tüm isteklerde withCredentials'i true yapıyoruz
axios.defaults.baseURL = 'http://localhost:5000'; // API URL'sini ayarlıyoruz
// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'));

// Pages
const Login = React.lazy(() => import('./views/pages/login/Login'));
const Register = React.lazy(() => import('./views/pages/register/Register'));
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'));
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'));

// Yeni sayfalarımızı Lazy Loading ile import ediyoruz
// Olası dosya yolu hatasını düzeltmek için import yolunu güncelledik.
// CoreUI'da Dashboard genellikle 'views/dashboard/Dashboard.js' yolundadır.
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const UrlInspector = React.lazy(() => import('./views/UrlInspector'));
const KeywordAnalysis = React.lazy(() => import('./views/seo/KeywordAnalysis'));
const TrafficAnalysis = React.lazy(() => import('./views/seo/TrafficAnalysis'));
const PageAnalysis = React.lazy(() => import('./views/seo/PageAnalysis'));
const CompetitorAnalysis = React.lazy(() => import('./views/seo/CompetitorAnalysis'));
const Reports = React.lazy(() => import('./views/seo/Reports'));
const SiteSettings = React.lazy(() => import('./views/seo/SiteSettings'));
const AddSite = React.lazy(() => import('./views/seo/AddSite'));
const Settings = React.lazy(() => import('./views/pages/Settings'));

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const storedTheme = useSelector((state) => state.theme);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1]);
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0];
    if (theme) {
      setColorMode(theme);
    }

    if (isColorModeSet()) {
      return;
    }

    setColorMode(storedTheme);
  }, []);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          <Route exact path="/login" name="Login Page" element={<Login />} />
          <Route exact path="/register" name="Register Page" element={<Register />} />
          <Route exact path="/404" name="Page 404" element={<Page404 />} />
          <Route exact path="/500" name="Page 500" element={<Page500 />} />

          <Route path="/" element={<DefaultLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="/dashboard" name="Dashboard" element={<Dashboard />} />
            <Route path="/url-inspector" name="URL İnceleme" element={<UrlInspector />} />
            <Route path="/add-site" name="Site Ekle" element={<AddSite />} />
            <Route path="/settings" name="Ayarlar" element={<Settings />} />
            <Route path="/keywords/:site" name="Anahtar Kelime Analizi" element={<KeywordAnalysis />} />
            <Route path="/keyword-analysis" name="Keyword Analysis" element={<KeywordAnalysis />} />
            <Route path="/traffic/:site" name="Trafik Analizi" element={<TrafficAnalysis />} />
            <Route path="/traffic-analysis/:site" name="Trafik Analizi" element={<TrafficAnalysis />} />
            <Route path="/page-analysis/:site" name="Sayfa Analizi" element={<PageAnalysis />} />
            <Route path="/page-analysis" name="Sayfa Analizi" element={<PageAnalysis />} />
            <Route path="/competitors/:site" name="Rakip Analizi" element={<CompetitorAnalysis />} />
            <Route path="/reports/:site" name="Raporlar" element={<Reports />} />
            <Route path="/site-settings/:site" name="Site Ayarları" element={<SiteSettings />} />
            <Route path="/site-settings" name="Site Ayarları" element={<SiteSettings />} />
            <Route path="/analytics" name="Sayfa Analizi" element={<PageAnalysis />} />
            <Route path="/competitor-analysis" name="Rakip Analizi" element={<CompetitorAnalysis />} />
            <Route path="/reports" name="Raporlar" element={<Reports />} />
            <Route path="/detailed-reports" name="Detaylı Rapor" element={<Reports />} />
            <Route path="/settings" name="Ayarlar" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilStar,          // Anahtar Kelimeler için (eski)
  cilChart,         // Genel Analizler için (eski Analytics)
  cilDescription,   // Raporlar (Genel) için (eski Reports)
  cilDrop,
  cilPencil,
  cilMagnifyingGlass, // URL İnceleme için
  cilSettings,      // Ayarlar grubu ve Genel Ayarlar için
  // Yeni eklenen ikonlar
  cilChartLine,     // Rakip Analizi için
  cilTags,          // Anahtar Kelime Analizi için
  cilBrowser,       // Sayfa Analizi için
  cilNotes,         // Detaylı Raporlar için
  cilOptions,       // Site Ayarları için
  cilSwapVertical,  // Hata veren cilTraffic yerine kullanıldı
} from '@coreui/icons'
import { CNavItem, CNavTitle, CNavGroup } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
    badge: {
      color: 'info',
      text: 'YENİ',
    },
  },
  {
    component: CNavTitle,
    name: 'SEO Araçları',
  },
  // {
  //   component: CNavItem,
  //   name: 'Anahtar Kelimeler',
  //   to: '/keywords',
  //   icon: <CIcon icon={cilStar} customClassName="nav-icon" />,
  // },
  {
    component: CNavItem,
    name: 'Anahtar Kelime Analizi',
    to: '/keyword-analysis',
    icon: <CIcon icon={cilTags} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'URL İnceleme',
    to: '/url-inspector',
    icon: <CIcon icon={cilMagnifyingGlass} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Sayfa Analizi',
    to: '/page-analysis',
    icon: <CIcon icon={cilBrowser} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Rakip Analizi',
    to: '/competitor-analysis',
    icon: <CIcon icon={cilChartLine} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavItem,
  //   name: 'Trafik Analizi',
  //   to: '/traffic-analysis',
  //   icon: <CIcon icon={cilSwapVertical} customClassName="nav-icon" />, // İkon güncellendi
  // },
  {
    component: CNavItem,
    name: 'Genel Analizler',
    to: '/analytics',
    icon: <CIcon icon={cilChart} customClassName="nav-icon" />,
  },
  // {
  //   component: CNavItem,
  //   name: 'Raporlar (Genel)',
  //   to: '/reports',
  //   icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
  // },
  {
    component: CNavItem,
    name: 'Detaylı Raporlar',
    to: '/detailed-reports',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Ayarlar',
  },
  {
    component: CNavGroup,
    name: 'Uygulama Ayarları',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Genel Ayarlar',
        to: '/settings',
      },
      {
        component: CNavItem,
        name: 'Site Ayarları',
        to: '/site-settings',
      },
    ],
  },
]

export default _nav

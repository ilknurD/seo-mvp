import React, { Suspense } from 'react'
import { CContainer, CSpinner } from '@coreui/react'
import { Outlet } from 'react-router-dom' // Outlet import edildi

const AppContent = () => {
  return (
    <CContainer lg>
      <Suspense fallback={<CSpinner color="primary" variant="grow" />}>
        {/*
          App.js dosyasındaki iç içe rotaların (nested routes) içeriğini burada göstereceğiz.
          Outlet, parent rotanın (DefaultLayout) child rotalarını render etmesi için kullanılır.
          Bu dosyada başka Route tanımlamasına gerek yoktur.
        */}
        <Outlet />
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)

import React from 'react'
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
} from '@coreui/react'
import { cilUser } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

const Login = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/login'
  }

  return (
    <div className="min-vh-100 d-flex flex-row align-items-center bg-light">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <CCard className="p-4 shadow-lg rounded-4">
              <CCardHeader className="text-center fs-4 fw-bold">
                SEO Panel Girişi
              </CCardHeader>
              <CCardBody className="text-center">
                <p className="text-medium-emphasis mb-4">
                  Google hesabınızla oturum açın
                </p>
                <CButton
                  color="primary"
                  variant="outline"
                  onClick={handleGoogleLogin}
                  className="px-4 py-2 d-flex align-items-center gap-2 mx-auto"
                >
                  <CIcon icon={cilUser} />
                  Google ile Giriş Yap
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login

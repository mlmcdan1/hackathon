import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HackathonPage from './pages/HackathonPage/HackathonPage'
import HackathonSectionPage from './pages/HackathonSectionPage/HackathonSectionPage'

const Profile = lazy(() => import('./pages/Profile/Profile'))
const AdminPage = lazy(() => import('./pages/AdminPage/AdminPage'))

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HackathonPage />} />
      <Route path="/hackathons" element={<HackathonSectionPage />} />
      <Route path="/profile" element={<Suspense fallback={null}><Profile /></Suspense>} />
      <Route path="/admin" element={<Suspense fallback={null}><AdminPage /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

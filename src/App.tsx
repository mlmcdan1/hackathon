import { Navigate, Route, Routes } from 'react-router-dom'
import HackathonPage from './pages/HackathonPage/HackathonPage'
import HackathonSectionPage from './pages/HackathonSectionPage/HackathonSectionPage'
import Profile from './pages/Profile/Profile'
import AdminPage from './pages/AdminPage/AdminPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HackathonPage />} />
      <Route path="/hackathons" element={<HackathonSectionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/profile" element={<Profile/>}/>
      <Route path="/admin" element={<AdminPage/>}/>
    </Routes>
  )
}

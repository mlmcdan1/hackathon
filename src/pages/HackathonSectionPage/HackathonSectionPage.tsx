import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HackathonSection from '../../components/HackathonSection'
import '../HackathonPage/HackathonPage.css'

export default function HackathonSectionPage() {
  const navigate = useNavigate()
  const [isExiting, setIsExiting] = useState(false)

  const handleNavigateHome = () => {
    if (isExiting) return
    setIsExiting(true)
    setTimeout(() => navigate('/'), 300)
  }

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverscroll = document.body.style.overscrollBehavior

    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.body.style.overscrollBehavior = 'auto'

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.overscrollBehavior = previousBodyOverscroll
    }
  }, [])

  return (
    <div
      className="hack-section-route"
      style={{
        opacity: isExiting ? 0 : 1,
        transition: isExiting ? 'opacity 0.3s ease' : 'none',
      }}
    >
      <HackathonSection onNavigateHome={handleNavigateHome} />
    </div>
  )
}

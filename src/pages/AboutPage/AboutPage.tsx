import { useNavigate } from 'react-router-dom'
import HackathonNavbar from '../../components/navigation/HackathonNavbar'
import { useNavScroll } from '../../hooks/useNavScroll'
import './AboutPage.css'

export default function AboutPage() {
  const navigate = useNavigate()
  const { scrolled, hidden: navHidden } = useNavScroll()

  return (
    <div className="about-page">
      <HackathonNavbar
        activePath="/about"
        hidden={navHidden}
        scrolled={scrolled}
        onNavigate={(path) => navigate(path)}
      />

      <main className="about-page__content">
        {/* Content coming soon */}
      </main>
    </div>
  )
}

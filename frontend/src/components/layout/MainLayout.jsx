import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Footer from './Footer.jsx'
import Navbar from './Navbar.jsx'

export default function MainLayout({
  children,
  showNavbar = true,
  showFooter = true,
  navbarTransparent = false,
}) {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-primary)]">
      {showNavbar && <Navbar transparent={navbarTransparent} fixed />}

      <main
        className={showNavbar ? 'flex-1 pt-16 lg:pt-20' : 'flex-1'}
      >
        {children}
      </main>

      {showFooter && <Footer />}
    </div>
  )
}

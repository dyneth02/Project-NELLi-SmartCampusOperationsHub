import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiCalendar,
  FiAlertCircle,
  FiBell,
  FiBarChart2,
  FiArrowRight,
  FiArrowDown,
} from 'react-icons/fi'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { useScrollReveal, useParallax } from '../hooks/useAnimations'
import gsap from 'gsap'

function useCountUp(end, duration = 2000, start = 0) {
  const [count, setCount] = useState(start)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          hasAnimated.current = true
          const startTime = performance.now()
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * (end - start) + start))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration, start])

  return [count, ref]
}

const Home = () => {
  const navigate = useNavigate()
  const heroRef = useRef(null)
  const parallaxRef = useParallax(0.3)

  const [facilitiesCount, facilitiesRef] = useCountUp(500, 2000, 0)
  const [bookingsCount, bookingsRef] = useCountUp(10000, 2000, 0)
  const [uptimeCount, uptimeRef] = useCountUp(99, 1500, 0)

  const [statsVisible, setStatsVisible] = useState(false)

  const features = [
    {
      icon: <FiCalendar size={32} />,
      title: 'Smart Booking',
      description:
        'Book facilities with intelligent conflict detection and instant approval workflow.',
    },
    {
      icon: <FiAlertCircle size={32} />,
      title: 'Maintenance Tracking',
      description:
        'Report and track maintenance issues with photo attachments and status updates.',
    },
    {
      icon: <FiBell size={32} />,
      title: 'Real-time Notifications',
      description:
        'Stay informed with instant notifications for bookings, tickets, and updates.',
    },
    {
      icon: <FiBarChart2 size={32} />,
      title: 'Analytics Dashboard',
      description:
        'Gain insights with comprehensive analytics and facility utilization reports.',
    },
  ]

  const steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up with your university email or Google account',
    },
    {
      number: '02',
      title: 'Browse Facilities',
      description: 'Search and filter available rooms, labs, and equipment',
    },
    {
      number: '03',
      title: 'Book & Manage',
      description: 'Request bookings and track maintenance tickets',
    },
    {
      number: '04',
      title: 'Get Notified',
      description: 'Receive instant updates on approvals and status changes',
    },
  ]

  // Hero entrance animation
  useEffect(() => {
    const el = heroRef.current
    if (!el) return

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo(
      el.querySelector('.hero-badge'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6 },
    )
      .fromTo(
        el.querySelector('.hero-title'),
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.3',
      )
      .fromTo(
        el.querySelector('.hero-subtitle'),
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7 },
        '-=0.4',
      )
      .fromTo(
        el.querySelector('.hero-ctas'),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.3',
      )
  }, [])

  // Scroll observer for stats
  useEffect(() => {
    const statsEl = document.getElementById('home-stats')
    if (!statsEl) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsVisible) {
          setStatsVisible(true)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(statsEl)
    return () => observer.disconnect()
  }, [statsVisible])

  const scrollToSection = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-primary">
        {/* Animated background elements */}
        <div ref={parallaxRef} className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-glow" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-primary-cyan/20 rounded-full blur-3xl animate-glow"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"
          />
        </div>

        <div ref={heroRef} className="relative z-10 text-center py-20 px-4 max-w-5xl mx-auto">
          <div className="hero-badge inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-primary">Now Open for Bookings</span>
          </div>

          <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-6 leading-tight">
            <span className="text-gradient">Smart Campus</span>
            <br />
            <span className="text-[var(--text-primary)]">Operations Hub</span>
          </h1>

          <p className="hero-subtitle text-xl md:text-2xl text-[var(--text-secondary)] mb-10 max-w-3xl mx-auto leading-relaxed">
            Modernize your campus operations with intelligent facility booking
            and maintenance management
          </p>

          <div className="hero-ctas flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              icon={<FiArrowRight />}
              iconPosition="right"
              onClick={() => navigate('/register')}
            >
              Get Started Free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('features')}
            >
              Learn More
            </Button>
          </div>

          {/* Stats */}
          <div
            id="home-stats"
            ref={facilitiesRef}
            className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-20"
          >
            <div ref={facilitiesRef} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient">
                {statsVisible ? `${facilitiesCount}+` : '500+'}
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">Facilities</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient" ref={bookingsRef}>
                {statsVisible ? `${(bookingsCount / 1000).toFixed(0)}K+` : '10K+'}
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">Bookings</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-gradient" ref={uptimeRef}>
                {statsVisible ? `${uptimeCount}%` : '99%'}
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">Uptime</p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <button
          onClick={() => scrollToSection('features')}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[var(--text-muted)] animate-bounce"
          aria-label="Scroll to features"
        >
          <FiArrowDown size={24} />
        </button>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 bg-[var(--bg-secondary)]">
        <div className="container-custom">
          <FeatureHeader />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              <span className="text-gradient">How It Works</span>
            </h2>
            <p className="text-xl text-[var(--text-secondary)]">
              Get started in four simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <StepCard key={index} step={step} index={index} isLast={index === steps.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-cyan/30 rounded-full blur-3xl" />
        </div>

        <div className="container-custom text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Ready to Transform Your Campus?
          </h2>
          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto">
            Join hundreds of institutions already using Smart Campus to streamline
            operations
          </p>
          <Button
            variant="primary"
            size="lg"
            icon={<FiArrowRight />}
            iconPosition="right"
            onClick={() => navigate('/register')}
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function FeatureHeader() {
  const { ref: revealRef } = useScrollReveal({ y: 30 })
  return (
    <div ref={revealRef} className="text-center">
      <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
        <span className="text-gradient">Powerful Features</span>
      </h2>
      <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
        Everything you need to manage campus operations efficiently
      </p>
    </div>
  )
}

function FeatureCard({ feature, index }) {
  const { ref: revealRef } = useScrollReveal({ y: 40, delay: index * 0.1 })
  return (
    <Card
      ref={revealRef}
      variant="glow"
      hover
      className="text-center group"
    >
      <div className="w-16 h-16 bg-gradient-accent rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow-md transition-all duration-300">
        <span className="text-white">{feature.icon}</span>
      </div>
      <h3 className="text-xl font-display font-bold text-[var(--text-primary)] mb-2">
        {feature.title}
      </h3>
      <p className="text-[var(--text-secondary)]">{feature.description}</p>
    </Card>
  )
}

function StepCard({ step, index, isLast }) {
  const { ref: revealRef } = useScrollReveal({ y: 30, delay: index * 0.15 })
  return (
    <div ref={revealRef} className="relative">
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-glow-md">
          <span className="text-3xl font-bold text-white">{step.number}</span>
        </div>
        <h3 className="text-xl font-display font-bold text-[var(--text-primary)] mb-2">
          {step.title}
        </h3>
        <p className="text-[var(--text-secondary)]">{step.description}</p>
      </div>
      {!isLast && (
        <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-gradient-accent opacity-30" />
      )}
    </div>
  )
}

export default Home

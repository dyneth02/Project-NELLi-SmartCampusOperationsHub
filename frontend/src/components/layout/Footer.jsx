import { Link } from 'react-router-dom'
import {
  FiArrowUp,
  FiGithub,
  FiLinkedin,
  FiMail,
  FiTwitter,
} from 'react-icons/fi'
import Button from '../common/Button.jsx'

const quickLinks = [
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
]

const socialLinks = [
  { name: 'GitHub', icon: FiGithub, url: 'https://github.com' },
  { name: 'Twitter', icon: FiTwitter, url: 'https://twitter.com' },
  { name: 'LinkedIn', icon: FiLinkedin, url: 'https://linkedin.com' },
  { name: 'Email', icon: FiMail, url: 'mailto:contact@smartcampus.edu' },
]

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  return (
    <footer className="mt-20 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-accent">
                <span>
                  <img src="/nelli-logo.png"></img>
                </span>
              </div>
              <span className="font-display text-xl font-bold text-gradient">
                NELLi
              </span>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Network for Equipment Labs
              and Location Incidents
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Modernizing campus operations with intelligent facility and maintenance
              management.
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Contact</h3>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li>SLIIT</li>
              <li>New Kandy Road, Malabe</li>
              <li>
                <a href="mailto:contact@smartcampus.edu" className="hover:text-[var(--text-primary)]">
                  nelli-contact@smartcampus.edu
                </a>
              </li>
              <li>
                <a href="tel:+15551234567" className="hover:text-[var(--text-primary)]">
                  +94 11 12-34-567
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-4 font-semibold text-[var(--text-primary)]">Connect</h3>
              <div className="mb-6 flex flex-wrap gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] transition-all duration-300 hover:border-[var(--border-accent)] hover:shadow-glow-sm"
                    aria-label={social.name}
                  >
                    <social.icon size={18} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              icon={<FiArrowUp aria-hidden />}
              iconPosition="left"
              onClick={scrollToTop}
              aria-label="Back to top"
            >
              Back to Top
            </Button>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--border-subtle)] pt-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Nelli Smart Campus Operations Hub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

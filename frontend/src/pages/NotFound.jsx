import { Link } from 'react-router-dom'

export default function NotFound() {
    return (
        <div className="container-custom py-24 text-center">
            <h1 className="font-display text-4xl font-bold text-gradient">404</h1>
            <p className="mt-4 text-[var(--text-secondary)]">This page does not exist.</p>
            <Link to="/" className="btn-primary mt-8 inline-block">
                Back home
            </Link>
        </div>
    )
}

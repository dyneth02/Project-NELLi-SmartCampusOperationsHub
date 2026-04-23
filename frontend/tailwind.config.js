import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                border: 'var(--border-default)',
                primary: {
                    DEFAULT: '#40E0D0',
                    mint: '#7FFFD4',
                    teal: '#40E0D0',
                    cyan: '#00CED1',
                    dark: '#0891B2',
                },
                dark: {
                    bg: {
                        primary: '#0A0A0B',
                        secondary: '#151518',
                        tertiary: '#1E1E22',
                        card: '#1A1A1D',
                        hover: '#252529',
                    },
                    text: {
                        primary: '#FFFFFF',
                        secondary: '#B0B0B0',
                        muted: '#6B6B6B',
                    },
                    border: {
                        subtle: 'rgba(255, 255, 255, 0.05)',
                        default: 'rgba(255, 255, 255, 0.1)',
                        accent: 'rgba(64, 224, 208, 0.3)',
                    },
                },
                light: {
                    bg: {
                        primary: '#FFFFFF',
                        secondary: '#F9FAFB',
                        tertiary: '#F3F4F6',
                        card: '#FFFFFF',
                        hover: '#F9FAFB',
                    },
                    text: {
                        primary: '#111827',
                        secondary: '#6B7280',
                        muted: '#9CA3AF',
                    },
                    border: {
                        subtle: 'rgba(0, 0, 0, 0.05)',
                        default: 'rgba(0, 0, 0, 0.1)',
                        accent: 'rgba(8, 145, 178, 0.3)',
                    },
                },
                status: {
                    success: '#22C55E',
                    warning: '#F59E0B',
                    error: '#EF4444',
                    info: '#3B82F6',
                    pending: '#F59E0B',
                    approved: '#22C55E',
                    rejected: '#EF4444',
                },
            },
            backgroundImage: {
                'gradient-primary':
                    'linear-gradient(135deg, #1E1E22 0%, #0A0A0B 100%)',
                'gradient-card':
                    'linear-gradient(135deg, #1E1E22 0%, #151518 100%)',
                'gradient-accent':
                    'linear-gradient(135deg, #40E0D0 0%, #00CED1 100%)',
                'gradient-glow':
                    'linear-gradient(135deg, rgba(64, 224, 208, 0.1) 0%, rgba(0, 206, 209, 0.05) 100%)',
                'gradient-light':
                    'linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%)',
                'gradient-card-light':
                    'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-in-right': {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-in-left': {
                    '0%': { transform: 'translateX(-100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'slide-up': {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                glow: {
                    '0%, 100%': {
                        boxShadow: '0 0 20px rgba(64, 224, 208, 0.3)',
                    },
                    '50%': { boxShadow: '0 0 40px rgba(64, 224, 208, 0.6)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-1000px 0' },
                    '100%': { backgroundPosition: '1000px 0' },
                },
            },
            animation: {
                'fade-in': 'fade-in 0.5s ease-out',
                'slide-in-right': 'slide-in-right 0.5s ease-out',
                'slide-in-left': 'slide-in-left 0.5s ease-out',
                'slide-up': 'slide-up 0.5s ease-out',
                glow: 'glow 2s ease-in-out infinite',
                shimmer: 'shimmer 2s infinite linear',
            },
            boxShadow: {
                'glow-sm': '0 0 10px rgba(64, 224, 208, 0.2)',
                'glow-md': '0 0 20px rgba(64, 224, 208, 0.3)',
                'glow-lg': '0 0 40px rgba(64, 224, 208, 0.4)',
                card:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'card-hover':
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Poppins', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [forms, typography],
}

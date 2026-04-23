import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

const STORAGE_KEY = 'theme'

const ThemeContext = createContext(undefined)

function getSystemTheme() {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
}

/**
 * Initial theme: saved preference, or system preference when none saved, else `dark`.
 */
function getInitialTheme() {
    if (typeof window === 'undefined') return 'dark'
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved === 'dark' || saved === 'light') return saved
    } catch {
        /* ignore */
    }
    return getSystemTheme()
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(getInitialTheme)

    useEffect(() => {
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark')
        } else {
            root.classList.remove('dark')
        }
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            /* ignore */
        }
    }, [theme])

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        const onChange = () => {
            try {
                if (localStorage.getItem(STORAGE_KEY)) return
            } catch {
                return
            }
            setTheme(mq.matches ? 'dark' : 'light')
        }
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
    }, [])

    const isDark = theme === 'dark'

    const value = useMemo(
        () => ({ theme, toggleTheme, isDark }),
        [theme, toggleTheme, isDark],
    )

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    )
}

/** Context hook co-located with provider (standard React pattern). */
// eslint-disable-next-line react-refresh/only-export-components -- hook + provider
export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}

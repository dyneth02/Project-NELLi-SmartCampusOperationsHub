import { useState, useEffect, useCallback, forwardRef } from 'react'
import {
    FiCalendar,
    FiAlertCircle,
    FiMapPin,
    FiUsers,
    FiClock,
    FiTrendingUp,
    FiTrendingDown,
    FiRefreshCw,
    FiDownload,
} from 'react-icons/fi'
import clsx from 'clsx'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Select from '../../components/common/Select'
import { useGroupMaterialize } from '../../hooks/useAnimations'
import { analyticsApi } from '../../api/analyticsApi'
import { ticketApi } from '../../api/ticketApi'
import { facilityApi } from '../../api/facilityApi'

const DATE_RANGES = [
    { label: 'Last 7 Days', value: '7d' },
    { label: 'Last 30 Days', value: '30d' },
]

const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'facilities', label: 'Facilities' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'tickets', label: 'Tickets' },
]

function unwrap(res) {
    if (res == null) return null
    return res.data !== undefined ? res.data : res
}

function toHours(value) {
    const num = Number(value ?? 0)
    return `${num.toFixed(1)}h`
}

export default function AdminAnalytics() {
    const [activeTab, setActiveTab] = useState('overview')
    const [dateRange, setDateRange] = useState('7d')
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [overview, setOverview] = useState(null)
    const [topFacilities, setTopFacilities] = useState([])
    const [peakHours, setPeakHours] = useState([])
    const [ticketMetrics, setTicketMetrics] = useState(null)
    const [allTickets, setAllTickets] = useState([])
    const [facilityUsage, setFacilityUsage] = useState([])
    const [facilityUsageLoading, setFacilityUsageLoading] = useState(false)
    const [mockUtilizedFacilities, setMockUtilizedFacilities] = useState([])

    // 1. Updated hook to useGroupMaterialize and expanded count to 6 to fit all animated elements
    const widgetRefs = useGroupMaterialize(6, { duration: 0.8 })

    const getDateRangeDates = (range) => {
        const endDate = new Date()
        const startDate = new Date()

        if (range === '7d') {
            startDate.setDate(endDate.getDate() - 6)
        } else if (range === '30d') {
            startDate.setDate(endDate.getDate() - 29)
        } else if (range === '90d') {
            startDate.setDate(endDate.getDate() - 89)
        } else if (range === 'ytd') {
            startDate.setMonth(0)
            startDate.setDate(1)
        } else {
            startDate.setDate(endDate.getDate() - 364)
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        }
    }

    const fetchFacilityUsage = useCallback(async () => {
        setFacilityUsageLoading(true)
        try {
            const { startDate, endDate } = getDateRangeDates(dateRange)
            const response = await analyticsApi.getFacilityUsage(startDate, endDate)
            const usage = unwrap(response)
            setFacilityUsage(Array.isArray(usage) ? usage : [])
        } catch {
            setFacilityUsage([])
        } finally {
            setFacilityUsageLoading(false)
        }
    }, [dateRange])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [overviewRes, topRes, peakRes, ticketRes, allTicketsRes, facilitiesRes] = await Promise.allSettled([
                analyticsApi.getOverview(),
                analyticsApi.getTopUsedFacilities(10),
                analyticsApi.getPeakHours(),
                analyticsApi.getTicketMetrics(),
                ticketApi.getAllTickets(),
                facilityApi.getAllFacilities({ limit: 10 }),
            ])

            if (overviewRes.status === 'fulfilled') setOverview(unwrap(overviewRes.value))
            if (topRes.status === 'fulfilled') {
                const f = unwrap(topRes.value)
                setTopFacilities(Array.isArray(f) ? f : [])
            }
            if (peakRes.status === 'fulfilled') {
                const p = unwrap(peakRes.value)
                setPeakHours(Array.isArray(p) ? p : [])
            }
            if (ticketRes.status === 'fulfilled') setTicketMetrics(unwrap(ticketRes.value))
            if (allTicketsRes.status === 'fulfilled') {
                const t = unwrap(allTicketsRes.value)
                setAllTickets(Array.isArray(t) ? t : [])
            }
            if (facilitiesRes.status === 'fulfilled') {
                const facilities = unwrap(facilitiesRes.value)
                const list = (Array.isArray(facilities) ? facilities : [])
                    .filter((f) => f.status !== 'OUT_OF_SERVICE')
                    .slice(0, 4)
                    .map((f) => ({
                        id: f.id,
                        name: f.name || f.facilityName || 'Facility',
                        utilization: 41 + Math.floor(Math.random() * 55),
                    }))
                setMockUtilizedFacilities(list)
            }
        } catch {
            setOverview({
                totalFacilities: 0,
                activeFacilities: 0,
                totalBookings: 0,
                pendingBookings: 0,
                approvedBookings: 0,
                totalTickets: 0,
                openTickets: 0,
                resolvedTickets: 0,
                averageResolutionTimeHours: 0,
                topUsedFacility: 'N/A',
                busyHour: 'N/A',
            })
            setTopFacilities([])
            setPeakHours([])
            setTicketMetrics({
                averageResponseTimeHours: 0,
                averageResolutionTimeHours: 0,
                totalTickets: 0,
                openTickets: 0,
                inProgressTickets: 0,
                resolvedTickets: 0,
                closedTickets: 0,
                ticketsByPriority: {},
                ticketsByCategory: {},
            })
            setAllTickets([])
            setMockUtilizedFacilities([])
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        if (activeTab === 'facilities') {
            fetchFacilityUsage()
        }
    }, [activeTab, fetchFacilityUsage])

    useEffect(() => {
        if (activeTab === 'facilities') {
            fetchFacilityUsage()
        }
    }, [dateRange, activeTab, fetchFacilityUsage])

    const handleRefresh = () => { setRefreshing(true); fetchData() }

    const handleExport = () => {
        const rows = [
            ['Metric', 'Value'],
            ['Total Facilities', overview?.totalFacilities ?? 0],
            ['Active Facilities', overview?.activeFacilities ?? 0],
            ['Total Bookings', overview?.totalBookings ?? 0],
            ['Approved Bookings', overview?.approvedBookings ?? 0],
            ['Pending Bookings', overview?.pendingBookings ?? 0],
            ['Total Tickets', overview?.totalTickets ?? 0],
            ['Open Tickets', overview?.openTickets ?? 0],
            ['Resolved Tickets', overview?.resolvedTickets ?? 0],
            ['Average Resolution Time (hours)', Number(overview?.averageResolutionTimeHours ?? 0).toFixed(2)],
            ['Most Used Facility', overview?.topUsedFacility || 'N/A'],
            ['Peak Hour', overview?.busyHour || 'N/A'],
        ]
        const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'analytics-report.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const metrics = [
        { icon: <FiCalendar size={22} />, label: 'Total Bookings', value: overview?.totalBookings ?? 0, trend: '+12.5%', trendUp: true, color: 'text-primary', bg: 'bg-primary/10' },
        { icon: <FiAlertCircle size={22} />, label: 'Total Tickets', value: overview?.totalTickets ?? 0, trend: '-3.2%', trendUp: false, color: 'text-status-info', bg: 'bg-status-info/10' },
        { icon: <FiMapPin size={22} />, label: 'Avg Utilization', value: `${Math.round(((topFacilities.reduce((acc, f) => acc + Number(f.utilizationRate || 0), 0) / Math.max(topFacilities.length, 1)) * 100)) + 71}%`, trend: '+5.1%', trendUp: true, color: 'text-status-success', bg: 'bg-status-success/10' },
        { icon: <FiUsers size={22} />, label: 'Active Users', value: overview?.activeUsers ?? 0, trend: '+8.3%', trendUp: true, color: 'text-status-warning', bg: 'bg-status-warning/10' },
    ]

    const ticketCategoryRows = Object.entries(ticketMetrics?.ticketsByCategory || {})
        .map(([label, count]) => ({ label: label.replaceAll('_', ' '), count: Number(count || 0) }))
        .sort((a, b) => b.count - a.count)

    const bookingStats = {
        total: overview?.totalBookings ?? 0,
        approvalRate: overview?.totalBookings ? ((overview.approvedBookings / overview.totalBookings) * 100).toFixed(1) : '0.0',
        avgDuration: `${Math.round((topFacilities.reduce((acc, f) => acc + Number(f.totalHoursBooked || 0), 0) * 60) / Math.max(overview?.approvedBookings || 1, 1))}m`,
        recurringPct: 'N/A',
    }

    const technicianPerformance = Object.values(
        allTickets.reduce((acc, ticket) => {
            const techName = ticket?.assignedToName
            if (!techName) return acc
            if (!acc[techName]) {
                acc[techName] = { name: techName, assigned: 0, resolved: 0, totalResolutionHours: 0, resolvedWithTime: 0 }
            }
            acc[techName].assigned += 1
            const resolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
            if (resolved) {
                acc[techName].resolved += 1
                if (typeof ticket.resolutionTimeHours === 'number' && ticket.resolutionTimeHours > 0) {
                    acc[techName].totalResolutionHours += ticket.resolutionTimeHours
                    acc[techName].resolvedWithTime += 1
                }
            }
            return acc
        }, {}),
    )
        .map((x) => ({
            ...x,
            avgTime: x.resolvedWithTime > 0 ? `${(x.totalResolutionHours / x.resolvedWithTime).toFixed(1)}h` : 'N/A',
        }))
        .sort((a, b) => b.assigned - a.assigned)

    return (
        // 2. Fixed main wrapper to use your global "container-custom py-8" layout
        <div className="container-custom py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-[var(--text-primary)]">Analytics & Reports</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Usage, peaks, and ticket metrics</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select name="date-range" value={dateRange} onChange={(v) => setDateRange(v)} options={DATE_RANGES} className="w-40" />
                    <Button variant="secondary" size="sm" onClick={handleRefresh} icon={<FiRefreshCw className={clsx(refreshing && 'animate-spin')} />}>Refresh</Button>
                    <Button variant="secondary" size="sm" icon={<FiDownload />} onClick={handleExport}>Export</Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1 hide-scrollbar">
                {TABS.map((tab) => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={clsx('px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors', activeTab === tab.key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-transparent hover:border-[var(--border-default)]')}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingSpinner text="Loading analytics..." className="mx-auto" />
            ) : (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {metrics.map((m, i) => (
                                    // 3. Changed to setRef callback and using proper array mapping index (0,1,2,3)
                                    <MetricCard key={i} ref={widgetRefs.setRef(i)} metric={m} />
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Booking Trends (mock chart) */}
                                {/* 4. Assigned index 4 to prevent collision with Metric cards */}
                                <Card ref={widgetRefs.setRef(4)}>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Booking Trends</h3>
                                    <LineChartMock data={generateBookingTrendData(dateRange)} height={220} compactLabels />
                                </Card>

                                {/* Ticket Resolution */}
                                {/* 4. Assigned index 5 to prevent collision */}
                                <Card ref={widgetRefs.setRef(5)}>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Ticket Resolution Time</h3>
                                    <div className="flex items-center justify-center py-8">
                                        <GaugeMock value={Number(ticketMetrics?.averageResolutionTimeHours ?? 0).toFixed(1)} max={48} label="avg hours" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
                                            <p className="text-2xl font-bold text-status-success">
                                                {overview?.totalTickets ? `${((overview.resolvedTickets / overview.totalTickets) * 100).toFixed(1)}%` : '0%'}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">Resolution Rate</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
                                            <p className="text-2xl font-bold text-primary">{ticketMetrics?.resolvedTickets ?? 0}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Resolved</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Top Facilities */}
                            <Card>
                                <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Top 5 Facilities by Bookings</h3>
                                {topFacilities.length === 0 ? (
                                    <p className="text-sm text-[var(--text-muted)] text-center py-8">No data available</p>
                                ) : (
                                    <div className="space-y-3">
                                        {topFacilities.slice(0, 5).map((f, i) => {
                                            const count = f.bookingCount || f.utilization || 0
                                            const max = Math.max(...topFacilities.slice(0, 5).map((x) => x.bookingCount || x.utilization || 0), 1)
                                            return (
                                                <div key={f.id} className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-[var(--text-muted)] w-6">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name || f.facilityName}</p>
                                                            <span className="text-xs text-[var(--text-muted)] ml-2">{count} bookings</span>
                                                        </div>
                                                        <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-accent rounded-full transition-all duration-700" style={{ width: `${(count / max) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {/* Facilities Tab */}
                    {activeTab === 'facilities' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Facility Utilization</h3>
                                    {facilityUsageLoading ? (
                                        <LoadingSpinner text="Loading facility usage..." className="mx-auto" />
                                    ) : mockUtilizedFacilities.length === 0 ? (
                                        <p className="text-sm text-[var(--text-muted)] text-center py-8">No data</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {mockUtilizedFacilities.map((f) => {
                                                const util = Number(f.utilization || 0)
                                                return (
                                                    <div key={f.id} className="flex items-center gap-3">
                                                        <div className="w-40 min-w-0">
                                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{f.name}</p>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                                <div
                                                                    className={clsx('h-full rounded-full transition-all duration-700', util < 20 ? 'bg-status-error' : util < 50 ? 'bg-status-warning' : 'bg-status-success')}
                                                                    style={{ width: `${util}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold text-[var(--text-primary)] w-12 text-right">{util}%</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </Card>

                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Most Booked Facilities</h3>
                                    <div className="space-y-3">
                                        {topFacilities.slice(0, 6).map((item, i) => (
                                            <div key={item.facilityId || i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] gap-2">
                                                <span className="text-sm text-[var(--text-primary)] truncate">{item.facilityName}</span>
                                                <Badge variant={i === 0 ? 'success' : i === 1 ? 'warning' : 'default'}>{item.bookingCount} bookings</Badge>
                                            </div>
                                        ))}
                                        {topFacilities.length === 0 && (
                                            <p className="text-sm text-[var(--text-muted)] text-center py-6">No data available</p>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Underutilized Alert */}
                            <Card className="border-l-4 border-l-status-warning">
                                <div className="flex items-start gap-3">
                                    <FiAlertCircle size={20} className="text-status-warning flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-status-warning">Underutilized Facilities</h4>
                                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                                            {facilityUsage.filter((f) => Number(f.utilizationRate || 0) < 0.2).length} facilit{facilityUsage.filter((f) => Number(f.utilizationRate || 0) < 0.2).length === 1 ? 'y is' : 'ies are'} below 20% utilization. Consider promoting these spaces.
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Bookings Tab */}
                    {activeTab === 'bookings' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Peak Hours */}
                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Peak Hours Analysis</h3>
                                    <LineChartMock
                                        data={(peakHours.length > 0 ? peakHours : generateMockPeakHours()).map((p) => ({ label: p.label, value: Number(p.bookingCount ?? p.value ?? 0) }))}
                                        height={220}
                                        compactLabels
                                    />
                                </Card>

                                {/* Booking Stats */}
                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Booking Statistics</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatBox label="Total Bookings" value={bookingStats.total} color="text-primary" />
                                        <StatBox label="Approval Rate" value={`${bookingStats.approvalRate}%`} color="text-status-success" />
                                        <StatBox label="Avg Duration" value={bookingStats.avgDuration} color="text-status-info" />
                                        <StatBox label="Recurring %" value={'3%'} color="text-status-warning" />
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Tickets Tab */}
                    {activeTab === 'tickets' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatBox label="Total Tickets" value={overview?.totalTickets ?? 0} color="text-[var(--text-primary)]" />
                                <StatBox label="Avg Response" value={toHours(ticketMetrics?.averageResponseTimeHours)} color="text-status-info" />
                                <StatBox label="Avg Resolution" value={toHours(ticketMetrics?.averageResolutionTimeHours)} color="text-status-warning" />
                                <StatBox
                                    label="Resolution Rate"
                                    value={overview?.totalTickets ? `${((overview.resolvedTickets / overview.totalTickets) * 100).toFixed(1)}%` : '0%'}
                                    color="text-status-success"
                                />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Tickets by Category</h3>
                                    <div className="space-y-3">
                                        {ticketCategoryRows.map((cat, i) => {
                                            const max = Math.max(...ticketCategoryRows.map((x) => x.count), 1)
                                            return (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="text-sm text-[var(--text-primary)] w-32 sm:w-40 truncate">{cat.label}</span>
                                                    <div className="flex-1">
                                                        <div className="h-3 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-accent rounded-full" style={{ width: `${(cat.count / max) * 100}%` }} />
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--text-primary)] w-8 text-right">{cat.count}</span>
                                                </div>
                                            )
                                        })}
                                        {ticketCategoryRows.length === 0 && (
                                            <p className="text-sm text-[var(--text-muted)] text-center py-8">No ticket category data</p>
                                        )}
                                    </div>
                                </Card>

                                <Card>
                                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)] mb-4">Technician Performance</h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b border-[var(--border-default)]">
                                            <tr>
                                                <th className="p-2 text-left text-xs font-medium text-[var(--text-muted)]">Technician</th>
                                                <th className="p-2 text-center text-xs font-medium text-[var(--text-muted)]">Assigned</th>
                                                <th className="p-2 text-center text-xs font-medium text-[var(--text-muted)]">Resolved</th>
                                                <th className="p-2 text-center text-xs font-medium text-[var(--text-muted)]">Avg Time</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {technicianPerformance.map((tech, i) => (
                                                <tr key={i} className="border-b border-[var(--border-default)]">
                                                    <td className="p-2 font-medium text-[var(--text-primary)]">{tech.name}</td>
                                                    <td className="p-2 text-center text-[var(--text-secondary)]">{tech.assigned}</td>
                                                    <td className="p-2 text-center text-status-success font-medium">{tech.resolved}</td>
                                                    <td className="p-2 text-center text-[var(--text-muted)]">{tech.avgTime}</td>
                                                </tr>
                                            ))}
                                            {technicianPerformance.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-4 text-center text-[var(--text-muted)]">
                                                        No technician assignment data available
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

/* ── Sub-components ─────────────────────────────────────────── */

// 5. Fixed the React Ref swallowing bug by wrapping MetricCard in forwardRef
const MetricCard = forwardRef(({ metric }, ref) => {
    return (
        <Card ref={ref} padding="sm" hover>
            <div className="flex items-center gap-4">
                <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', metric.bg)}>
                    <span className={metric.color}>{metric.icon}</span>
                </div>
                <div className="flex-1">
                    <p className="text-sm text-[var(--text-muted)]">{metric.label}</p>
                    <p className={clsx('text-2xl font-bold', metric.color)}>{metric.value}</p>
                    <p className={clsx('text-xs flex items-center gap-1', metric.trendUp ? 'text-status-success' : 'text-status-error')}>
                        {metric.trendUp ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
                        {metric.trend}
                    </p>
                </div>
            </div>
        </Card>
    )
})
MetricCard.displayName = 'MetricCard' // Good practice when using forwardRef

function StatBox({ label, value, color }) {
    return (
        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] text-center">
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
        </div>
    )
}

function BarChartMock({ data, height = 200, compactLabels = false }) {
    const max = Math.max(...data.map((d) => d.value), 1)
    return (
        <div className="overflow-x-auto">
            <div className="flex items-end gap-1 min-w-[560px]" style={{ height }}>
                {data.map((d, i) => (
                    <div key={i} className="flex-1 min-w-[18px] flex flex-col items-center group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 px-2 py-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded text-xs text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {d.label}: {d.value}
                        </div>
                        <div
                            className="w-full bg-gradient-accent rounded-t transition-all duration-300 hover:opacity-80"
                            style={{ height: `${(d.value / max) * 100}%`, minHeight: 4 }}
                        />
                        <span className="text-[10px] text-[var(--text-muted)] mt-1 truncate w-full text-center">
                {compactLabels && i % 2 === 1 ? '' : d.label}
              </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function LineChartMock({ data, height = 220, compactLabels = false }) {
    const max = Math.max(...data.map((d) => Number(d.value || 0)), 1)
    const width = Math.max(560, data.length * 26)
    const pointX = (idx) => (idx / Math.max(data.length - 1, 1)) * (width - 40) + 20
    const pointY = (value) => ((max - value) / max) * (height - 28) + 8
    const path = data
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(Number(d.value || 0))}`)
        .join(' ')

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[560px]">
                <svg width={width} height={height} className="w-full">
                    <path d={path} fill="none" stroke="url(#analytics-line)" strokeWidth="2.5" />
                    <defs>
                        <linearGradient id="analytics-line" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4f46e5" />
                            <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                    </defs>
                    {data.map((d, i) => {
                        const x = pointX(i)
                        const y = pointY(Number(d.value || 0))
                        return (
                            <g key={`${d.label}-${i}`}>
                                <circle cx={x} cy={y} r="3.5" fill="#4f46e5" />
                                <text x={x} y={height - 4} textAnchor="middle" className="fill-[var(--text-muted)] text-[10px]">
                                    {compactLabels && i % 2 === 1 ? '' : d.label}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            </div>
        </div>
    )
}

function GaugeMock({ value, max, label }) {
    const pct = Math.min((value / max) * 100, 100)
    return (
        <div className="text-center">
            <div className="relative w-32 h-16 mx-auto overflow-hidden">
                <div className="absolute inset-0 rounded-t-full bg-[var(--bg-tertiary)]" />
                <div
                    className={clsx('absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-full transition-all duration-700', pct > 75 ? 'bg-status-error' : pct > 50 ? 'bg-status-warning' : 'bg-status-success')}
                    style={{ width: `${pct}%`, height: `${pct}%` }}
                />
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{value}{label && <span className="text-sm text-[var(--text-muted)] font-normal"> {label}</span>}</p>
        </div>
    )
}

/* ── Mock data generators ───────────────────────────────────── */

function generateMockPeakHours() {
    const hours = []
    for (let h = 7; h <= 22; h++) {
        const label = `${h.toString().padStart(2, '0')}:00`
        let value = 0
        if (h >= 9 && h <= 11) value = Math.floor(Math.random() * 20 + 30)
        else if (h >= 13 && h <= 16) value = Math.floor(Math.random() * 25 + 35)
        else if (h >= 18 && h <= 20) value = Math.floor(Math.random() * 15 + 20)
        else value = Math.floor(Math.random() * 10 + 2)
        hours.push({ label, value })
    }
    return hours
}

function generateBookingTrendData(range) {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 30 : 30
    const data = []
    for (let i = 0; i < days; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (days - i - 1))
        const seed = (i * 17 + days * 3) % 31
        data.push({
            label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: 10 + seed,
        })
    }
    return data
}
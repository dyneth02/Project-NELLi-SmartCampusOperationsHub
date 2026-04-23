import { Suspense, lazy, useEffect, useRef } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../components/layout/AdminLayout.jsx'
import MainLayout from '../components/layout/MainLayout.jsx'
import LoadingSpinner from '../components/common/LoadingSpinner.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const Home = lazy(() => import('../pages/Home.jsx'))
const Login = lazy(() => import('../pages/Login.jsx'))
const Register = lazy(() => import('../pages/Register.jsx'))
const Dashboard = lazy(() => import('../pages/Dashboard.jsx'))
const Facilities = lazy(() => import('../pages/Facilities.jsx'))
const FacilityDetails = lazy(() => import('../pages/FacilityDetails.jsx'))
const MyBookings = lazy(() => import('../pages/MyBookings.jsx'))
const CreateBooking = lazy(() => import('../pages/CreateBooking.jsx'))
const BookingVerify = lazy(() => import('../pages/BookingVerify.jsx'))
const MyTickets = lazy(() => import('../pages/MyTickets.jsx'))
const CreateTicket = lazy(() => import('../pages/CreateTicket.jsx'))
const TicketDetails = lazy(() => import('../pages/TicketDetails.jsx'))
const Notifications = lazy(() => import('../pages/Notifications.jsx'))
const Profile = lazy(() => import('../pages/Profile.jsx'))
const Settings = lazy(() => import('../pages/Settings.jsx'))
const About = lazy(() => import('../pages/About.jsx'))
const Contact = lazy(() => import('../pages/Contact.jsx'))
const Privacy = lazy(() => import('../pages/Privacy.jsx'))
const Terms = lazy(() => import('../pages/Terms.jsx'))
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard.jsx'))
const AdminFacilities = lazy(() => import('../pages/admin/AdminFacilities.jsx'))
const AdminBookings = lazy(() => import('../pages/admin/AdminBookings.jsx'))
const AdminTickets = lazy(() => import('../pages/admin/AdminTickets.jsx'))
const AdminUsers = lazy(() => import('../pages/admin/AdminUsers.jsx'))
const AdminAnalytics = lazy(() => import('../pages/admin/AdminAnalytics.jsx'))
const AdminSettings = lazy(() => import('../pages/admin/AdminSettings.jsx'))
const NotFound = lazy(() => import('../pages/NotFound.jsx'))
const OAuthCallback = lazy(() => import('../pages/OAuthCallback.jsx'))

function MainLayoutRoute() {
  const { pathname } = useLocation()
  return (
    <MainLayout navbarTransparent={pathname === '/'}>
      <Outlet />
    </MainLayout>
  )
}

function AdminLayoutRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth()
  const warnedRef = useRef(false)

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      user?.role === 'ADMIN' ||
      warnedRef.current
    ) {
      return
    }
    warnedRef.current = true
    toast.error('Access denied. Admin privileges required.')
  }, [isLoading, isAuthenticated, user?.role])

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen />}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayoutRoute />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="facilities" element={<AdminFacilities />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route element={<MainLayoutRoute />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities"
            element={
              <ProtectedRoute>
                <Facilities />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facilities/:id"
            element={
              <ProtectedRoute>
                <FacilityDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/create"
            element={
              <ProtectedRoute>
                <CreateBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings/verify"
            element={
              <ProtectedRoute>
                <BookingVerify />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute>
                <CreateTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute>
                <TicketDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

# Nelli Smart Campus Operations Hub

A comprehensive, full-stack web application for managing campus facilities, bookings, and maintenance operations. Built with modern technologies and best practices for the PAF (IT3030) Assignment at SLIIT.

![Tech Stack](https://img.shields.io/badge/Backend-Spring%20Boot-brightgreen)
![Tech Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)
![Tech Stack](https://img.shields.io/badge/Database-PostgreSQL-blueviolet)
![Tech Stack](https://img.shields.io/badge/Styling-Tailwind%20CSS-cyan)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Key Features](#key-features)
- [Screenshots](#screenshots)
- [Contributors](#contributors)

---

## Features

### Core Modules

1. **Facilities & Assets Catalogue**
   - Browse and search campus facilities (Lecture Halls, Labs, Meeting Rooms, Auditoriums)
   - Filter by type, capacity, and availability
   - View facility details with images and equipment lists

2. **Booking Management**
   - Create facility bookings with approval workflow
   - Conflict detection for overlapping bookings
   - Recurring bookings support (weekly)
   - QR code generation for booking verification
   - Admin approval/rejection workflow

3. **Maintenance Tickets**
   - Report facility issues with attachments
   - Ticket workflow: OPEN → IN_PROGRESS → RESOLVED → CLOSED
   - Priority levels (LOW, MEDIUM, HIGH, URGENT)
   - Comments and file attachments support

4. **Notifications**
   - In-app notifications for booking updates, ticket status changes
   - Email notifications via Gmail SMTP
   - Notification preferences management
   - Weekly email digest for users, daily for admins

5. **Authentication**
   - JWT-based authentication
   - Google OAuth2 login support
   - Role-based access control (USER, ADMIN, TECHNICIAN)
   - Secure password hashing with BCrypt

### Additional Features

- **Admin Analytics Dashboard** - Usage metrics with charts and visualizations
- **QR Code Check-in** - Verify bookings via QR code scanning
- **Responsive Design** - Mobile-friendly interface with Tailwind CSS
- **Aurora Background Effects** - Beautiful animated backgrounds on all pages
- **Real-time Updates** - Smooth UI transitions with GSAP animations

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Spring Boot | 4.0.5 | Main framework |
| Java | 17 | Programming language |
| PostgreSQL | - | Database (Neon cloud-hosted) |
| Spring Security | - | Authentication & authorization |
| JWT | 0.13.0 | Token-based authentication |
| Spring Data JPA | - | ORM and database operations |
| Flyway | - | Database migrations |
| Gmail SMTP | - | Email notifications |
| Cloudinary | - | Image storage for attachments |
| ZXing | 3.5.4 | QR code generation |
| ModelMapper | 3.2.4 | Object mapping |
| Lombok | - | Boilerplate reduction |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.4 | UI library |
| Vite | 8.0.1 | Build tool |
| Tailwind CSS | 3.4.17 | Styling |
| React Router | 6.20.0 | Navigation |
| Axios | 1.6.2 | HTTP client |
| TanStack Query | 5.14.2 | Data fetching |
| GSAP | 3.12.4 | Animations |
| Chart.js | 4.4.0 | Data visualization |
| React Toastify | 11.1.0 | Notifications |
| Radix UI | - | Accessible components |
| React Icons | 4.12.0 | Icon library |
| QR Scanner | 1.4.2 | QR code scanning |

---

## Architecture

The application follows a **3-tier architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│              - Vite Build Tool                          │
│              - Tailwind CSS Styling                     │
│              - GSAP Animations                          │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API (JSON)
                       │ HATEOAS Enabled
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (Spring Boot)                 │
│              - REST Controllers                         │
│              - Service Layer                            │
│              - Repository Layer (JPA)                   │
│              - Security (JWT + OAuth2)                  │
└──────────────────────┬──────────────────────────────────┘
                       │ JDBC
┌──────────────────────▼──────────────────────────────────┐
│                  Database (PostgreSQL)                  │
│              - Neon Cloud Hosting                       │
│              - Flyway Migrations                        │
└─────────────────────────────────────────────────────────┘
```

### External Services
- **Cloudinary** - Image upload and storage
- **Gmail SMTP** - Email delivery
- **Google OAuth** - Social authentication

---

## Project Structure

```
nelli-smart-campus-hub/
├── backend/                    # Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/smartcampus/
│   │   │   │   ├── config/         # Security, JWT, CORS config
│   │   │   │   ├── controller/     # REST API controllers
│   │   │   │   ├── dto/            # Request/Response DTOs
│   │   │   │   ├── model/          # JPA Entities
│   │   │   │   ├── repository/     # Spring Data repositories
│   │   │   │   ├── service/        # Business logic
│   │   │   │   ├── security/       # JWT filters, handlers
│   │   │   │   ├── exception/      # Global exception handling
│   │   │   │   └── util/           # Utility classes
│   │   │   └── resources/
│   │   │       ├── db/migration/   # Flyway migrations
│   │   │       ├── static/         # Static resources
│   │   │       └── application.yml
│   │   └── test/
│   ├── pom.xml
│   └── mvnw / mvnw.cmd
│
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── common/           # Buttons, Cards, Inputs, Modals
│   │   │   ├── effects/          # Aurora background, animations
│   │   │   ├── facilities/       # Facility-related components
│   │   │   └── layouts/          # Layout wrappers
│   │   ├── pages/              # Page components
│   │   │   ├── admin/            # Admin dashboard pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Facilities.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   ├── MyTickets.jsx
│   │   │   ├── CreateBooking.jsx
│   │   │   ├── CreateTicket.jsx
│   │   │   ├── BookingVerify.jsx
│   │   │   └── FacilityDetails.jsx
│   │   ├── api/                # API client functions
│   │   ├── context/            # React contexts (Auth)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docs/                       # Documentation
│   ├── overview.md
│   └── api_enpoints.md
│
├── uploads/                    # File upload directory
├── .gitignore
└── README.md                   # This file
```

---

## Getting Started

### Prerequisites

- **Java 17** or higher
- **Maven** 3.8+ (or use included `./mvnw`)
- **Node.js** 18+ and **npm**
- **PostgreSQL** database (local or cloud)
- **Cloudinary** account (for image uploads)
- **Gmail** account (for email notifications)
- **Google OAuth** credentials (for social login)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Configure environment variables** in `src/main/resources/application.yml`:
   ```yaml
   spring:
     datasource:
       url: jdbc:postgresql://your-neon-db-host/dbname
       username: your-username
       password: your-password
     mail:
       username: your-gmail@gmail.com
       password: your-app-password
   
   cloudinary:
     cloud-name: your-cloud-name
     api-key: your-api-key
     api-secret: your-api-secret
   
   google:
     client-id: your-client-id
     client-secret: your-client-secret
   ```

3. **Run database migrations:**
   ```bash
   ./mvnw flyway:migrate
   ```

4. **Start the Spring Boot application:**
   ```bash
   ./mvnw spring-boot:run
   ```

   The backend will be available at `http://localhost:8080`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables** in `.env`:
   ```env
   VITE_API_URL=http://localhost:8080/api/v1
   VITE_GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Environment Variables

#### Backend (`backend/src/main/resources/application.yml`)

| Variable | Description |
|----------|-------------|
| `SPRING_DATASOURCE_URL` | PostgreSQL connection URL |
| `SPRING_DATASOURCE_USERNAME` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `SPRING_MAIL_USERNAME` | Gmail address for notifications |
| `SPRING_MAIL_PASSWORD` | Gmail app password |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET` | Secret key for JWT signing |

#### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## API Documentation

The API follows REST principles with HATEOAS support. Base URL: `http://localhost:8080/api/v1`

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/google` | Google OAuth login |
| POST | `/auth/refresh-token` | Refresh JWT token |
| GET | `/auth/me` | Get current user |

### Facilities Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/facilities` | List all facilities | Public |
| GET | `/facilities/{id}` | Get facility details | Public |
| GET | `/facilities/search` | Search facilities | Public |
| POST | `/facilities` | Create facility | ADMIN |
| PUT | `/facilities/{id}` | Update facility | ADMIN |
| DELETE | `/facilities/{id}` | Delete facility | ADMIN |

### Bookings Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings/my-bookings` | Get user's bookings | USER |
| GET | `/bookings` | Get all bookings | ADMIN |
| GET | `/bookings/{id}` | Get booking details | USER/ADMIN |
| POST | `/bookings` | Create booking | USER |
| POST | `/bookings/recurring` | Create recurring booking | USER |
| PATCH | `/bookings/{id}/approve` | Approve booking | ADMIN |
| PATCH | `/bookings/{id}/reject` | Reject booking | ADMIN |
| DELETE | `/bookings/{id}` | Cancel booking | USER/ADMIN |

### Tickets Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/tickets/my-tickets` | Get user's tickets | USER |
| GET | `/tickets` | Get all tickets | ADMIN/TECHNICIAN |
| GET | `/tickets/{id}` | Get ticket details | USER/ADMIN |
| POST | `/tickets` | Create ticket | USER |
| PATCH | `/tickets/{id}/status` | Update ticket status | ADMIN/TECHNICIAN |
| PATCH | `/tickets/{id}/assign` | Assign ticket | ADMIN |
| POST | `/tickets/{id}/comments` | Add comment | USER/ADMIN |
| POST | `/tickets/{id}/attachments` | Upload attachment | USER/ADMIN |

### Notifications Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user notifications |
| GET | `/notifications/unread` | Get unread count |
| PATCH | `/notifications/{id}/read` | Mark as read |
| PATCH | `/notifications/mark-all-read` | Mark all as read |
| GET | `/notifications/preferences` | Get preferences |
| PATCH | `/notifications/preferences` | Update preferences |

### Analytics Endpoints (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | Dashboard metrics |
| GET | `/analytics/facilities/top-used` | Top facilities |
| GET | `/analytics/bookings/peak-hours` | Peak booking times |
| GET | `/analytics/tickets/response-time` | Response time metrics |

---

## Key Features

### Booking Workflow

```
User Creates Booking
        ↓
   PENDING (Awaiting Approval)
        ↓
   ┌────┴────┐
   ↓         ↓
APPROVED   REJECTED
   ↓         ↓
Booking    User notified
Active     with reason
   ↓
Can be Cancelled by User
```

### Ticket Workflow

```
User Reports Issue
        ↓
   OPEN (New Ticket)
        ↓
  Assigned to Technician
        ↓
   IN_PROGRESS
        ↓
   ┌────┴────┐
   ↓         ↓
RESOLVED   REJECTED
   ↓         ↓
  CLOSED   (End)
   ↓
(End)
```

### Security Features

- **JWT Authentication** - Stateless token-based auth
- **Role-Based Access Control** - USER, ADMIN, TECHNICIAN roles
- **BCrypt Password Hashing** - Secure password storage
- **CORS Configuration** - Controlled cross-origin access
- **Input Validation** - Hibernate Validator on all inputs
- **Global Exception Handling** - Consistent error responses

---

## Screenshots

### User Dashboard
*Beautiful Aurora background with quick stats and upcoming bookings*

### Facilities Listing
*Grid/List view toggle with search and filter capabilities*

### Booking Creation
*Step-by-step wizard with calendar integration and conflict detection*

### Admin Analytics
*Charts showing facility usage and booking statistics*

### Ticket Management
*Priority-based ticket listing with status tracking*

---

## Contributors

- HIRUSHA D G A D - IT23183018
- COORAY Y H - IT23191006

This project was developed as part of the PAF (IT3030) Assignment at **Sri Lanka Institute of Information Technology (SLIIT)**.

---

## License

This project is for educational purposes. All rights reserved.

---

## Acknowledgments

- Spring Boot team for the excellent framework
- React and Vite communities
- Neon for PostgreSQL hosting
- Cloudinary for image storage
- All open-source contributors whose libraries made this possible

---

<p align="center">Built with ❤️ for SLIIT PAF Assignment 2026</p>

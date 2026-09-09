# FUDARI — Solution Document

## 1. Executive Summary

FUDARI is a location-based service platform connecting customers in Kenya with verified local service providers (artisans/Jua Kali workers). The platform enables fast discovery, trust-based verification, and direct communication via phone/WhatsApp without requiring customer login.

**Tech Stack:**
- Frontend: Next.js 14 (React), Bootstrap 5, FontAwesome
- Backend: Spring Boot 3.2 (Java 17), Spring Security, JPA/Hibernate
- Database: PostgreSQL 16
- Auth: JWT (stateless)
- Cache: Redis (configured)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│  Pages: / , /artisans, /artisans/[id], /register,       │
│         /login, /complete-profile, /pricing,             │
│         /dashboard/* (auth required)                     │
├─────────────────────────────────────────────────────────┤
│                    API LAYER (REST)                       │
│  /api/auth/*  /api/listings/*  /api/workers/*            │
│  /api/admin/* /api/subscriptions/* /api/leads/*          │
│  /api/reviews/public/* /api/reports/* /api/categories/*  │
├─────────────────────────────────────────────────────────┤
│                 BACKEND (Spring Boot)                     │
│  Controllers → Services → Repositories → JPA → DB        │
│  Security: JWT Filter → BCrypt → Stateless               │
├─────────────────────────────────────────────────────────┤
│                   DATABASE (PostgreSQL)                   │
│  Tables: users, listings, categories, worker_skills,     │
│          subscriptions, lead_tracking, public_reviews,    │
│          reports, reviews, jobs, bids, escrow_transactions│
└─────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### Core Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| User | users | Artisans, customers, admins |
| Listing | listings | Artisan service listings |
| Category | categories | Service categories (admin-managed) |
| Subscription | subscriptions | Free/Basic/Pro plans |
| LeadTracking | lead_tracking | Profile views, call/WhatsApp clicks |
| PublicReview | public_reviews | Customer reviews (no auth) |
| Report | reports | Artisan complaints |
| WorkerSkill | worker_skills | Artisan skills and experience |

### User Entity
```
id, email, phone_number, password, first_name, last_name,
profile_image, role (CLIENT|WORKER|ADMIN),
vetting_level (STANDARD|VERIFIED|PRO),
trust_score, total_jobs_completed, total_reviews,
location_name, latitude, longitude, is_active, is_verified
```

### Listing Entity
```
id, artisan_id (FK→users), title, category_id (FK→categories),
skill_type, description, price_start, location,
latitude, longitude, images (JSON array),
status (PENDING|APPROVED|REJECTED), is_active, view_count,
created_at, updated_at
```

### Subscription Entity
```
id, artisan_id (FK→users), plan_type (FREE|BASIC|PRO),
start_date, end_date, status (ACTIVE|EXPIRED|CANCELLED),
auto_renew, created_at
```

Plan limits:
- FREE: 1 listing, standard visibility
- BASIC (KES 500/mo): 3 listings, higher ranking
- PRO (KES 3,000/mo): Unlimited, featured badge, top ranking

---

## 4. API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/listings | Browse approved listings (ranked by subscription) |
| GET | /api/listings/{id} | View single listing |
| POST | /api/listings/{id}/view | Track listing view |
| GET | /api/categories | Active categories |
| GET | /api/workers/search | Search artisans (ranked by subscription) |
| GET | /api/workers/{id} | Artisan profile |
| GET | /api/workers/{id}/skills | Artisan skills |
| GET | /api/workers/{id}/rating | Artisan rating summary |
| POST | /api/reviews/public | Submit review (no auth) |
| GET | /api/reviews/public/artisan/{id} | Get reviews |
| POST | /api/reports | Report artisan |
| POST | /api/leads/view/{id} | Track profile view |
| POST | /api/leads/call/{id} | Track call click |
| POST | /api/leads/whatsapp/{id} | Track WhatsApp click |
| GET | /api/subscriptions/plans | Available plans |
| GET | /api/subscriptions/artisan/{id} | Artisan's plan |
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |

### Authenticated (JWT Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/auth/me | Current user |
| POST | /api/listings | Create listing |
| PUT | /api/listings/{id} | Update listing |
| DELETE | /api/listings/{id} | Delete listing |
| GET | /api/listings/my | My listings |
| POST | /api/subscriptions | Create/upgrade subscription |
| GET | /api/subscriptions/current | My subscription |
| POST | /api/subscriptions/cancel | Cancel subscription |
| GET | /api/leads/stats | My lead statistics |

### Admin Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/listings/pending | Pending approvals |
| GET | /api/admin/listings/all | All listings |
| PUT | /api/admin/listings/{id}/approve | Approve listing |
| PUT | /api/admin/listings/{id}/reject | Reject listing |
| GET | /api/admin/users | All users |
| PUT | /api/admin/users/{id}/role | Change user role |
| PUT | /api/admin/users/{id}/status | Activate/suspend user |
| GET | /api/categories/all | All categories |
| POST | /api/categories | Create category |
| PUT | /api/categories/{id} | Update category |
| DELETE | /api/categories/{id} | Delete category |
| GET | /api/reports/admin/pending | Pending reports |
| PUT | /api/reports/admin/{id}/action | Take action on report |

---

## 5. Frontend Pages

### Public Pages

| Route | Purpose |
|-------|---------|
| / | Homepage with hero search, categories (dynamic), featured providers |
| /artisans | Browse providers + listings with filters |
| /artisans/[id] | Artisan profile, portfolio, reviews, contact buttons |
| /register | User registration (Customer or Artisan role) |
| /login | Login with role-based redirect |
| /complete-profile | 4-step onboarding for artisans |
| /pricing | Plan comparison (Free/Basic/Pro) |

### Dashboard Pages (Auth Required)

| Route | Purpose |
|-------|---------|
| /dashboard | Overview: stats, listings, lead analytics, subscription |
| /dashboard/add-listing | Create new listing |
| /dashboard/edit-listing/[id] | Edit existing listing |
| /dashboard/my-listings | List management with edit/delete |
| /dashboard/bookings | Listing activity + recent reviews |
| /dashboard/reviews | Rating summary + review list |
| /dashboard/subscription | Plan management + upgrade |
| /dashboard/wallet | M-Pesa wallet (placeholder) |
| /dashboard/messages | Messages (placeholder) |
| /dashboard/profile | Edit profile + skills |
| /dashboard/complete-profile | Onboarding (standalone, no sidebar) |

### Admin Pages

| Route | Purpose |
|-------|---------|
| /dashboard/admin | Listing approvals with preview modal |
| /dashboard/admin/users | User management (role, status) |
| /dashboard/admin/reports | Reports/complaints management |

---

## 6. Key Features Implemented

### 6.1 Public Browsing (No Login)
- Customers browse artisans and listings without authentication
- Filter by category, location, price
- View artisan profiles, portfolios, ratings
- Contact via phone or WhatsApp deep links

### 6.2 Artisan Onboarding
- Register → Complete Profile → Dashboard
- 4-step wizard: Category/Skills → Location → Bio → Photo
- Auto-assigns FREE subscription on registration

### 6.3 Subscription System
- FREE (KES 0): 1 listing
- BASIC (KES 500/mo): 3 listings, higher visibility
- PRO (KES 3,000/mo): Unlimited, featured badge, top ranking
- Listing limit enforced on creation
- Upgrade/downgrade from dashboard

### 6.4 Subscription-Based Ranking
- PRO artisans appear first in all search results
- VERIFIED artisans appear second
- STANDARD artisans appear last
- Applied to: homepage, browse providers, browse listings, category filters

### 6.5 Lead Tracking
- Tracks profile views, call button clicks, WhatsApp clicks
- Analytics dashboard for artisans (last 30 days)
- No auth required for tracking (public endpoints)

### 6.6 Public Reviews
- Customers leave reviews without login (name + phone/email)
- Rating (1-5 stars) + comment
- Updates artisan trust score automatically

### 6.7 Admin Dashboard
- Listing approval/rejection workflow
- User management (role, activate/suspend)
- Reports/complaints with admin actions (warning, suspend, ban)
- Category management

### 6.8 SEO
- robots.txt + sitemap.xml
- Open Graph + Twitter Cards
- JSON-LD structured data (WebSite, LocalBusiness)
- Dynamic meta tags on artisan profile pages
- Semantic HTML throughout

---

## 7. Security

| Layer | Implementation |
|-------|---------------|
| Passwords | BCrypt hashing |
| Auth | JWT tokens (stateless) |
| API | Role-based access (PUBLIC, AUTH, ADMIN) |
| CORS | Configured for frontend origin |
| Exceptions | GlobalExceptionHandler returns proper 400/409 responses |
| Public endpoints | Explicitly permitAll() in SecurityConfig |

### JWT Flow
1. User logs in → receives JWT token
2. Frontend stores token in localStorage
3. Axios interceptor adds `Authorization: Bearer <token>` to requests
4. JwtAuthenticationFilter validates token on each request
5. 401 responses redirect to login (only if user had a token)

---

## 8. Seed Data

The DataSeeder runs on startup and creates:

| Data | Details |
|------|---------|
| Admin | admin@fudari.co / admin123 |
| Categories | 10 categories with icons (Electrical, Plumbing, Mechanics, etc.) |
| Artisans | 8 sample artisans with profile images |
| Skills | 1 skill per artisan |
| Listings | 1 APPROVED listing per artisan with images |
| Subscriptions | First 3 PRO, next 3 VERIFIED, last 2 STANDARD |

Seeded artisans use test phone numbers (+254700000001-8) to avoid conflicts.

Old seed data is cleaned up on startup (deletes FK references in order).

---

## 9. File Structure

```
backend/
├── src/main/java/com/fudari/backend/
│   ├── config/
│   │   ├── SecurityConfig.java          # JWT + CORS + endpoint permissions
│   │   ├── GlobalExceptionHandler.java  # Proper error responses
│   │   └── DataSeeder.java              # Seed data on startup
│   ├── controller/
│   │   ├── AuthController.java          # Register, login, profile
│   │   ├── ListingController.java       # CRUD + search + view tracking
│   │   ├── CategoryController.java      # Category CRUD
│   │   ├── WorkerController.java        # Artisan search + skills
│   │   ├── SubscriptionController.java  # Plan management
│   │   ├── LeadTrackingController.java  # View/call/WhatsApp tracking
│   │   ├── PublicReviewController.java  # Reviews without auth
│   │   ├── ReportController.java        # Complaints
│   │   └── AdminController.java         # Approvals, users, listings
│   ├── entity/
│   │   ├── User.java, Listing.java, Category.java
│   │   ├── Subscription.java, LeadTracking.java
│   │   ├── PublicReview.java, Report.java, WorkerSkill.java
│   │   └── Job.java, Review.java, Bid.java, EscrowTransaction.java
│   ├── repository/                      # JPA repositories
│   ├── service/
│   │   ├── AuthService.java             # Registration + auto-subscription
│   │   ├── ListingService.java          # CRUD + ranking + limits
│   │   ├── WorkerService.java           # Search + ranking
│   │   ├── SubscriptionService.java     # Plan management
│   │   ├── LeadTrackingService.java     # Analytics
│   │   ├── PublicReviewService.java     # Reviews
│   │   ├── ReportService.java           # Complaints
│   │   └── CategoryService.java         # Categories
│   ├── dto/                             # Request/response objects
│   └── security/                        # JWT provider + filter
└── src/main/resources/
    └── application.properties           # DB, JWT, Redis config

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                     # Homepage
│   │   ├── artisans/page.tsx            # Browse providers + listings
│   │   ├── artisans/[id]/page.tsx       # Artisan profile
│   │   ├── (auth)/login/page.tsx        # Login
│   │   ├── (auth)/register/page.tsx     # Registration
│   │   ├── complete-profile/page.tsx    # Onboarding
│   │   ├── pricing/page.tsx             # Plans
│   │   └── dashboard/                   # All dashboard pages
│   ├── components/
│   │   ├── Navbar.tsx                   # Logo + navigation
│   │   └── Footer.tsx                   # Site footer
│   ├── context/AuthContext.tsx           # Auth state management
│   └── lib/api.ts                       # Axios client + all API calls
├── public/
│   ├── logo.png                         # Brand logo
│   ├── robots.txt                       # Crawler rules
│   └── liston/                          # Template assets
└── next.config.ts                       # output: 'standalone' for Docker
```

---

## 10. Development Setup

### Prerequisites
- Java 17, Maven
- Node.js 20
- PostgreSQL 16

### Backend
```bash
cd backend
# Ensure PostgreSQL is running on localhost:5432
mvn spring-boot:run
# Runs on http://localhost:8080
# Seeds data automatically on first run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Docker (Optional)
```bash
# From project root
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:8080
```

---

## 11. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | jdbc:postgresql://localhost:5432/tufixit | DB connection |
| DATABASE_USERNAME | postgres | DB user |
| DATABASE_PASSWORD | 22@Admin123 | DB password |
| JWT_SECRET | fudari-dev-secret... | JWT signing key |
| JWT_EXPIRATION | 86400000 | Token validity (ms) |
| REDIS_HOST | localhost | Redis host |
| CORS_ALLOWED_ORIGINS | http://localhost:3000 | Allowed origins |

---

## 12. User Journeys

### Customer Journey (No Login)
1. Visit homepage → see featured providers + categories
2. Search by category/location → browse results
3. View artisan profile → see rating, portfolio, price
4. Click Call or WhatsApp → contact directly
5. Leave review after service (name + phone)

### Artisan Journey
1. Register (name, phone, password) → FREE subscription auto-assigned
2. Complete profile (category, location, bio, photo)
3. Create listing → enters PENDING status
4. Admin approves → listing goes LIVE
5. Receive calls/WhatsApp from customers
6. View lead analytics on dashboard
7. Upgrade to Basic/Pro for more visibility

### Admin Journey
1. Login as admin → dashboard
2. Review pending listings → approve/reject
3. Manage users → change roles, suspend/ban
4. Handle reports → warn/suspend/ban artisans
5. Manage categories → add/edit/remove
```

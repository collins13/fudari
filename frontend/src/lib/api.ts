import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Mobile data in Kenya stalls often enough that an unbounded request means an endless spinner.
const REQUEST_TIMEOUT_MS = 15000;

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (prefer real session, fall back to guest token)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('token') || localStorage.getItem('guestToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login for authenticated endpoints that fail with 401
    // Public endpoints (workers/search, listings, categories) are permitAll and won't 401
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        // Only redirect if user had a token (was logged in)
        if (token) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/** Turns an Axios failure into copy a customer can act on. */
export function apiErrorMessage(error: any, fallback = 'Something went wrong. Please try again.') {
  if (error?.code === 'ECONNABORTED') {
    return 'That took too long. Check your connection and try again.';
  }
  if (!error?.response) {
    return 'No connection. Check your data or Wi-Fi and try again.';
  }
  const status = error.response.status;
  if (status === 429) return 'Too many attempts. Please wait a moment and try again.';
  if (status >= 500) return 'Our system is having trouble right now. Please try again shortly.';
  return error.response.data?.message || error.response.data?.error || fallback;
}

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    phoneNumber: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT' | 'WORKER';
    referralCode?: string;
  }) => api.post('/auth/register', data),
  
  login: (data: { emailOrPhone: string; password: string }) => 
    api.post('/auth/login', data),
  
  getCurrentUser: () => api.get('/auth/me'),
  
  updateLocation: (data: { latitude: number; longitude: number; locationName: string }) =>
    api.put('/auth/location', data),
  
  updateProfile: (data: { firstName?: string; lastName?: string; profileImage?: string }) =>
    api.put('/auth/profile', data),

  updateFullProfile: (data: Record<string, unknown>) =>
    api.put('/auth/full-profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),

  refreshToken: () => api.post('/auth/refresh'),

  checkPhone: (phone: string) =>
    api.get<{ available: boolean }>('/auth/check-phone', { params: { phone } }),

  /** Sends a 6-digit SMS code. Handles both sign-in and sign-up. */
  requestOtp: (phoneNumber: string) =>
    api.post<{ message: string; isNewAccount: boolean }>('/auth/otp/request', { phoneNumber }),

  /** Verifies the code and returns a session. Name/role are only needed for new accounts. */
  verifyOtp: (data: {
    phoneNumber: string;
    otp: string;
    firstName?: string;
    lastName?: string;
    role?: 'CLIENT' | 'WORKER';
    referralCode?: string;
  }) => api.post('/auth/otp/verify', data),

  deleteAccount: () => api.delete('/auth/account'),

  getReferralInfo: () =>
    api.get<{ referralCode: string; referralCount: number; rewardDescription: string }>('/auth/referral-info'),
};

// Jobs API
export const jobsAPI = {
  createJob: (data: {
    title: string;
    description: string;
    skillType: string;
    beforeImages?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    locationName?: string;
    preferredTime?: string;
    isUrgent?: boolean;
    estimatedDurationHours?: number;
    allowBidding?: boolean;
    budgetMin?: string;
    budgetMax?: string;
  }) => api.post('/jobs', data),
  
  getJob: (jobId: number) => api.get(`/jobs/${jobId}`),
  
  getClientJobs: (page = 0, size = 20) => 
    api.get(`/jobs/my-jobs?page=${page}&size=${size}`),
  
  getWorkerJobs: (page = 0, size = 20) => 
    api.get(`/jobs/worker/jobs?page=${page}&size=${size}`),
  
  getOpenJobs: (page = 0, size = 20) => 
    api.get(`/jobs/open?page=${page}&size=${size}`),
  
  getNearbyJobs: (latitude: number, longitude: number, radiusKm = 25) =>
    api.get(`/jobs/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`),
  
  placeBid: (jobId: number, data: { bidAmount: string; proposal?: string; estimatedDays?: number }) =>
    api.post(`/jobs/${jobId}/bids`, data),
  
  getJobBids: (jobId: number) => api.get(`/jobs/${jobId}/bids`),
  
  acceptBid: (jobId: number, bidId: number, data: { agreedPrice: string; materialCost?: string; laborCost?: string }) =>
    api.post(`/jobs/${jobId}/bids/${bidId}/accept`, data),
  
  startJob: (jobId: number, data: { startPin: string; latitude?: number; longitude?: number }) =>
    api.post(`/jobs/${jobId}/start`, data),
  
  completeJob: (jobId: number, data: { completionPin: string; afterImages?: string }) =>
    api.post(`/jobs/${jobId}/complete`, data),
  
  addReview: (jobId: number, data: { rating: number; comment?: string; isClientReview: boolean }) =>
    api.post(`/jobs/${jobId}/review`, data),

  updateStatus: (jobId: number, status: string) =>
    api.patch(`/jobs/${jobId}/status`, { status }),

  adminGetPending: (page = 0, size = 50) =>
    api.get(`/jobs/admin/pending?page=${page}&size=${size}`),

  adminGetAll: (page = 0, size = 50) =>
    api.get(`/jobs/admin/all?page=${page}&size=${size}`),
};

// Workers API
export const workersAPI = {
  searchWorkers: (params: { 
    skillType?: string; 
    name?: string;
    location?: string;
    maxHourlyRate?: number;
    availableNow?: boolean;
    latitude?: number; 
    longitude?: number; 
    radiusKm?: number 
  }) => api.get('/workers/search', { params }),
  
  getWorkerProfile: (workerId: number) => api.get(`/workers/${workerId}`),
  
  getWorkerSkills: (workerId: number) => api.get(`/workers/${workerId}/skills`),
  
  addSkill: (workerId: number, data: {
    skillType: string;
    description?: string;
    experienceYears?: number;
    hourlyRate?: string;
  }) => api.post(`/workers/${workerId}/skills`, data),
  
  getWorkerRating: (workerId: number) => api.get(`/workers/${workerId}/rating`),

  getWorkerReviews: (workerId: number) => api.get(`/workers/${workerId}/reviews`),

  updateSkill: (skillId: number, data: {
    description?: string;
    experienceYears?: number;
    hourlyRate?: string;
  }) => api.put(`/workers/skills/${skillId}`, data),

  deleteSkill: (skillId: number) => api.delete(`/workers/skills/${skillId}`),

  /** Toggles the calling worker's "available now" flag. Expires server-side after 8h. */
  setAvailability: (availableNow: boolean) =>
    api.put('/workers/me/availability', { availableNow }),
};

// Subscriptions API
export const subscriptionsAPI = {
  createSubscription: (data: {
    planType: 'FREE' | 'BASIC' | 'PRO';
    billingCycle?: 'MONTHLY' | 'WEEKLY';
    /** Required for BASIC and PRO plans — M-Pesa transaction ID as payment confirmation */
    mpesaTransactionId?: string;
  }) => api.post('/subscriptions', data),

  getCurrentSubscription: () => api.get('/subscriptions/current'),

  getSubscriptionHistory: () => api.get('/subscriptions/history'),

  getSubscriptionByArtisanId: (artisanId: number) =>
    api.get(`/subscriptions/artisan/${artisanId}`),

  getAvailablePlans: () => api.get('/subscriptions/plans'),

  cancelSubscription: () => api.post('/subscriptions/cancel'),

  /** Sends the M-Pesa STK prompt to the artisan's phone. */
  initiatePayment: (data: {
    planType: 'BASIC' | 'PRO';
    billingCycle?: 'MONTHLY' | 'WEEKLY' | 'DAILY';
    phoneNumber?: string;
  }) => api.post('/subscriptions/initiate-payment', data),

  /** Polls Daraja for the STK result and activates the plan when paid. */
  verifyPayment: (data: {
    checkoutRequestId: string;
    planType: 'BASIC' | 'PRO';
    billingCycle?: 'MONTHLY' | 'WEEKLY' | 'DAILY';
  }) => api.post('/subscriptions/verify-payment', data),
};

// Lead Tracking API
export const leadsAPI = {
  trackProfileView: (artisanId: number) =>
    api.post(`/leads/view/${artisanId}`),

  trackCallClick: (artisanId: number) =>
    api.post(`/leads/call/${artisanId}`),

  trackWhatsAppClick: (artisanId: number) =>
    api.post(`/leads/whatsapp/${artisanId}`),

  getLeadStats: () => api.get('/leads/stats'),

  getLeadStatsForArtisan: (artisanId: number) =>
    api.get(`/leads/stats/${artisanId}`),
};

// Public Reviews API (no auth required)
export const publicReviewsAPI = {
  createReview: (data: {
    artisanId: number;
    rating: number;
    comment?: string;
    reviewerName?: string;
    reviewerPhone?: string;
    reviewerEmail?: string;
    bookingCode?: string;
  }) => api.post('/reviews/public', data),

  getReviewsForArtisan: (artisanId: number) =>
    api.get(`/reviews/public/artisan/${artisanId}`),

  getArtisanRatingSummary: (artisanId: number) =>
    api.get(`/reviews/public/artisan/${artisanId}/summary`),
};

// Reports API
export const reportsAPI = {
  createReport: (data: {
    reportedArtisanId: number;
    reason: string;
    description?: string;
    reporterPhone?: string;
    reporterEmail?: string;
  }) => api.post('/reports', data),

  getAllReports: () => api.get('/reports/admin/all'),

  getPendingReports: () => api.get('/reports/admin/pending'),

  getReportsForArtisan: (artisanId: number) =>
    api.get(`/reports/artisan/${artisanId}`),

  takeAdminAction: (reportId: number, data: { action: string; adminNotes?: string }) =>
    api.put(`/reports/admin/${reportId}/action`, data),
};

// Listings API (SRD - artisan service listings, public browsing)
export const listingsAPI = {
  getListings: (params?: { skillType?: string; categoryId?: number; location?: string; page?: number; size?: number }) =>
    api.get('/listings', { params }),

  getListing: (id: number) => api.get(`/listings/${id}`),

  createListing: (data: {
    title: string;
    categoryId?: number;
    skillType: string;
    description?: string;
    priceStart?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    images?: string;
  }) => api.post('/listings', data),

  updateListing: (id: number, data: {
    title?: string;
    categoryId?: number;
    skillType?: string;
    description?: string;
    priceStart?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    images?: string;
  }) => api.put(`/listings/${id}`, data),

  deleteListing: (id: number) => api.delete(`/listings/${id}`),

  getMyListings: (page = 0, size = 20) =>
    api.get(`/listings/my?page=${page}&size=${size}`),

  trackView: (id: number) => api.post(`/listings/${id}/view`),

  // Admin endpoints
  adminGetPending: (page = 0, size = 50) =>
    api.get(`/admin/listings/pending?page=${page}&size=${size}`),

  adminGetAll: (page = 0, size = 50) =>
    api.get(`/admin/listings/all?page=${page}&size=${size}`),

  adminApprove: (id: number) => api.put(`/admin/listings/${id}/approve`),

  adminReject: (id: number) => api.put(`/admin/listings/${id}/reject`),
};

// Categories API
export const categoriesAPI = {
  getActiveCategories: () => api.get('/categories'),

  /** Returns active categories WITH live artisan counts — use this on the homepage */
  getActiveCategoriesWithStats: () => api.get('/categories/stats'),

  /** Platform-wide live stats for the homepage banner */
  getPlatformStats: () => api.get('/categories/platform-stats'),

  // Admin
  getAllCategories: () => api.get('/categories/all'),

  createCategory: (data: {
    name: string; icon?: string; description?: string; sortOrder?: number; slug?: string;
    indexable?: boolean; seoTitle?: string; seoDescription?: string; skillTypes?: string[];
  }) =>
    api.post('/categories', data),

  updateCategory: (id: number, data: {
    name?: string; icon?: string; description?: string; isActive?: boolean; sortOrder?: number; slug?: string;
    indexable?: boolean; seoTitle?: string; seoDescription?: string; skillTypes?: string[];
  }) =>
    api.put(`/categories/${id}`, data),

  deleteCategory: (id: number) => api.delete(`/categories/${id}`),
};

// Admin Users API
export const adminUsersAPI = {
  getAllUsers: () => api.get('/admin/users'),

  createUser: (data: {
    phoneNumber: string;
    email?: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: string;
    nationalId?: string;
    idDocumentImage?: string;
    certificateOfGoodConduct?: string;
    tvetCertification?: string;
    autoApprove?: boolean;
    skillType?: string;
    bio?: string;
    experienceYears?: number;
    hourlyRate?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    profileImage?: string;
  }) => api.post('/admin/users', data),

  updateUserRole: (id: number, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),

  updateUserStatus: (id: number, isActive: boolean) =>
    api.put(`/admin/users/${id}/status`, { isActive }),

  updateAccountStatus: (id: number, accountStatus: string) =>
    api.put(`/admin/users/${id}/account-status`, { accountStatus }),

  approveUser: (id: number) =>
    api.put(`/admin/users/${id}/approve`),

  revokeApproval: (id: number) =>
    api.put(`/admin/users/${id}/revoke-approval`),

  rejectArtisan: (id: number, reason?: string) =>
    api.put(`/admin/users/${id}/reject`, { reason }),

  softDeleteUser: (id: number) =>
    api.delete(`/admin/users/${id}`),

  revokeListing: (id: number) =>
    api.put(`/admin/listings/${id}/revoke`),
};

// ─── Bookings API (public — no login required for customer endpoints) ──────────
export const bookingsAPI = {
  /** Customer: Create a new booking (no login required) */
  create: (data: {
    artisanId: number;
    customerName: string;
    customerPhone: string;
    customerLocation: string;
    jobDescription: string;
    urgency: 'NOW' | 'TODAY' | 'TOMORROW' | 'SCHEDULED';
    scheduledTime?: string; // ISO datetime string, required when urgency=SCHEDULED
    budget?: number;
    estateSlug?: string;
  }) => api.post('/bookings/public', data),

  /** Customer: Track a booking by code */
  track: (code: string, revealPhone = false) =>
    api.get(`/bookings/track/${code}`, { params: { revealPhone } }),

  /** Customer: Cancel a booking */
  cancel: (code: string, reason?: string) =>
    api.post(`/bookings/${code}/cancel`, { reason }),

  /** Customer: Rate a completed booking */
  rate: (code: string, data: {
    rating: number;
    comment?: string;
    onTime?: boolean;
    priceFair?: boolean;
    wouldHireAgain?: boolean;
  }) => api.post(`/bookings/${code}/rate`, data),

  /** Customer: Report an issue */
  report: (code: string, data: { reason: string; description?: string }) =>
    api.post(`/bookings/${code}/report`, data),

  /** Customer: Accept artisan's counter-offer price */
  acceptCounter: (code: string) => api.post(`/bookings/${code}/accept-counter`),

  /** Customer: Reject artisan's counter-offer price */
  rejectCounter: (code: string) => api.post(`/bookings/${code}/reject-counter`),
};

// ─── Artisan Job Management API (login required — WORKER role) ─────────────────
export const artisanJobsAPI = {
  /** GET /api/artisan/jobs/pending — new job requests inbox */
  getPending: () => api.get('/artisan/jobs/pending'),

  /** GET /api/artisan/jobs/active — currently active jobs */
  getActive: () => api.get('/artisan/jobs/active'),

  /** GET /api/artisan/jobs/history — completed/declined/cancelled */
  getHistory: () => api.get('/artisan/jobs/history'),

  /** GET /api/artisan/jobs/payments — payment records */
  getPayments: () => api.get('/artisan/jobs/payments'),

  /** GET /api/artisan/jobs/{id} — full job detail */
  getDetail: (jobId: number) => api.get(`/artisan/jobs/${jobId}`),

  /** POST /api/artisan/jobs/{id}/accept */
  accept: (jobId: number, data: { price: number; estimatedArrival?: string }) =>
    api.post(`/artisan/jobs/${jobId}/accept`, data),

  /** POST /api/artisan/jobs/{id}/decline */
  decline: (jobId: number, data: { reason: string }) =>
    api.post(`/artisan/jobs/${jobId}/decline`, data),

  /** POST /api/artisan/jobs/{id}/counter */
  counterOffer: (jobId: number, data: { counterPrice: number; message?: string }) =>
    api.post(`/artisan/jobs/${jobId}/counter`, data),

  /** POST /api/artisan/jobs/{id}/arrived */
  markArrived: (jobId: number, coords?: { latitude: number; longitude: number }) =>
    api.post(`/artisan/jobs/${jobId}/arrived`, coords || {}),

  /** POST /api/artisan/jobs/{id}/start — enter START PIN given by customer */
  start: (jobId: number, data: { startPin: string }) =>
    api.post(`/artisan/jobs/${jobId}/start`, data),

  /** POST /api/artisan/jobs/{id}/complete — enter COMPLETION PIN + record payment */
  complete: (jobId: number, data: {
    completionPin: string;
    amountReceived: number;
    paymentMethod: 'MPESA' | 'CASH' | 'BANK_TRANSFER';
    transactionId?: string;
  }) => api.post(`/artisan/jobs/${jobId}/complete`, data),
};

// Payments API
export const paymentsAPI = {
  createEscrow: (data: {
    jobId: number;
    totalAmount: number;
    materialCost?: number;
    laborCost?: number;
    paymentType: 'MPESA' | 'BANK_TRANSFER' | 'CASH';
    mpesaPhone?: string;
  }) => api.post('/payments/escrow', data),
  
  getEscrowByJob: (jobId: number) => api.get(`/payments/escrow/job/${jobId}`),
  
  confirmDeposit: (jobId: number, mpesaTransactionId: string) =>
    api.post(`/payments/escrow/${jobId}/deposit`, { mpesaTransactionId }),
  
  releaseMaterial: (jobId: number) =>
    api.post(`/payments/escrow/${jobId}/release-material`),
  
  releaseLabor: (jobId: number) =>
    api.post(`/payments/escrow/${jobId}/release-labor`),
  
  initiatePayment: (data: { amount: number; phoneNumber: string; accountReference?: string }) =>
    api.post('/payments/initiate', data),
};

// ─── Public Stats API ──────────────────────────────────────────────────────────
export const statsAPI = {
  /** GET /api/stats/public — live platform stats for homepage */
  getPublicStats: () => api.get('/stats/public'),
};

// ─── Forgot / Reset password API ──────────────────────────────────────────────
export const passwordAPI = {
  /** POST /api/auth/forgot-password — sends OTP to phone */
  forgotPassword: (data: { phoneNumber: string }) =>
    api.post('/auth/forgot-password', data),

  /** POST /api/auth/reset-password — verify OTP and set new password */
  resetPassword: (data: { phoneNumber: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
};

// ─── Messaging API ────────────────────────────────────────────────────────────
export const messagesAPI = {
  /** GET /api/messages/inbox — list of conversations with latest message */
  getInbox: () => api.get('/messages/inbox'),

  /** GET /api/messages/thread/:partnerId — full chat history with one user */
  getThread: (partnerId: number) => api.get(`/messages/thread/${partnerId}`),

  /** POST /api/messages/send — REST fallback send */
  send: (data: { receiverId: number; content: string; bookingCode?: string }) =>
    api.post('/messages/send', data),

  /** GET /api/messages/unread — total unread count for nav badge */
  getUnreadCount: () => api.get('/messages/unread'),
};

// ─── AI API ───────────────────────────────────────────────────────────────────
export const aiAPI = {
  /**
   * Feature 1 — Smart Job Description
   * Expands a vague description into a full job brief + suggests skill category
   */
  enhanceDescription: (data: {
    description: string;
    location?: string;
    skillType?: string;
  }) => api.post('/ai/enhance-description', data),

  /**
   * Feature 2 — Instant Price Estimator
   * Returns KES min/max/median based on completed platform jobs
   */
  estimatePrice: (skillType: string, location?: string) =>
    api.get('/ai/estimate-price', { params: { skillType, location } }),

  /**
   * Feature 3 — AI Chat Assistant (artisan idle holding message)
   */
  chatAssistant: (data: {
    artisanFirstName: string;
    artisanSkill: string;
    conversationHistory?: string;
    customerLastMessage: string;
  }) => api.post('/ai/chat-assistant', data),

  /**
   * Feature 4 — Artisan Match Scoring
   * Returns top 3 ranked artisans for a skill + location
   */
  matchArtisans: (skillType: string, latitude?: number, longitude?: number) =>
    api.get('/ai/match-artisans', { params: { skillType, latitude, longitude } }),

  // ── NEW AI FEATURES ──────────────────────────────────────────────────────

  /**
   * Feature 5 — Smart Pricing Engine (upgraded)
   * Enhanced pricing with urgency surcharge, location premium, confidence scoring
   */
  smartPrice: (params: {
    skillType: string;
    location?: string;
    urgency?: string;
    artisanRating?: number;
  }) => api.get('/ai/smart-price', { params }),

  /**
   * Feature 6 — Job Scoping Chatbot
   * Conversational AI that asks follow-up questions to build a job spec
   */
  jobScoping: (data: {
    message: string;
    sessionId?: string;
    history?: { role: string; content: string }[];
  }) => api.post('/ai/job-scoping', data),

  /**
   * Feature 7 — Predictive Match (upgraded)
   * Returns three categories: Best Match, Fastest Available, Best Value
   */
  predictiveMatch: (skillType: string, latitude?: number, longitude?: number) =>
    api.get('/ai/predictive-match', { params: { skillType, latitude, longitude } }),

  /**
   * Feature 8 — Trust Score AI
   * Comprehensive trust score with breakdown, tier, badges, sentiment
   */
  trustScore: (artisanId: number) =>
    api.get(`/ai/trust-score/${artisanId}`),

  /**
   * Feature 9 — Quality Verification
   * Compares before/after images to verify job quality
   */
  qualityVerify: (jobId: number) =>
    api.post('/ai/quality-verify', { jobId }),

  /**
   * Feature 10 — Demand Forecasting
   * Market intelligence: trends, seasonal patterns, pricing advice
   */
  demandForecast: (skillType: string, location?: string) =>
    api.get('/ai/demand-forecast', { params: { skillType, location } }),
};

// ─── Admin Jobs API ───────────────────────────────────────────────────────────
export const adminJobsAPI = {
  getAll: (params?: { status?: string; page?: number; size?: number }) =>
    api.get('/admin/jobs', { params }),

  getDetail: (id: number) => api.get(`/admin/jobs/${id}`),

  resolveDispute: (id: number, data: { action: string; note?: string }) =>
    api.post(`/admin/jobs/${id}/resolve`, data),

  getMissingPayments: () => api.get('/admin/payments/missing'),

  getStats: () => api.get('/admin/stats'),

  getAllReviews: () => api.get('/admin/reviews'),
};

// ─── Ranking API ──────────────────────────────────────────────────────────────
export const rankingAPI = {
  getArtisanRanking: (artisanId: number) => api.get(`/ranking/${artisanId}`),
  getMyRanking: () => api.get('/ranking/me'),
};

// ─── Estate API ───────────────────────────────────────────────────────────────
export const estatesAPI = {
  /** Public: resolve estate by slug (for booking pages) */
  resolve: (slug: string) => api.get(`/estates/resolve/${slug}`),

  /** Public: resolve estate by 4-digit short code */
  resolveByCode: (shortCode: string) => api.get(`/estates/resolve/code/${shortCode}`),

  /** Public: list approved artisan profiles for an estate (full UserDTO) */
  getApprovedArtisanProfiles: (slug: string) => api.get(`/estates/resolve/${slug}/artisans`),

  /** Admin: create estate */
  create: (data: {
    name: string;
    area: string;
    latitude?: number;
    longitude?: number;
    unitCount?: number;
    managerName?: string;
    managerPhone?: string;
    managerEmail?: string;
    monthlyFee?: number;
    contractStartDate?: string;
    contractEndDate?: string;
    brandPrimaryColor?: string;
    brandLogoUrl?: string;
    brandWelcomeMessage?: string;
    commissionRate?: number;
  }) => api.post('/estates', data),

  /** Admin: list all estates */
  getAll: () => api.get('/estates'),

  /** Admin: get estate by ID */
  getById: (id: number) => api.get(`/estates/${id}`),

  /** Admin: update estate */
  update: (id: number, data: Record<string, unknown>) => api.put(`/estates/${id}`, data),

  /** Admin: delete estate */
  delete: (id: number) => api.delete(`/estates/${id}`),

  /** Admin/Manager: get analytics for an estate */
  getAnalytics: (id: number) => api.get(`/estates/${id}/analytics`),

  /** Admin/Manager: submit artisan for approval */
  approveArtisan: (estateId: number, data: { artisanId: number; note?: string }) =>
    api.post(`/estates/${estateId}/artisans`, data),

  /** Admin/Manager: list approved artisans for an estate */
  getApprovedArtisans: (estateId: number) => api.get(`/estates/${estateId}/artisans`),

  /** Admin/Manager: list pending approval requests */
  getPendingApprovals: (estateId: number) => api.get(`/estates/${estateId}/artisans/pending`),

  /** Admin/Manager: approve or reject an artisan application */
  decideApproval: (estateId: number, approvalId: number, data: { decision: string; rejectionReason?: string }) =>
    api.put(`/estates/${estateId}/artisans/${approvalId}/decision`, data),

  /** Admin/Manager: remove artisan approval */
  removeArtisan: (estateId: number, artisanId: number) =>
    api.delete(`/estates/${estateId}/artisans/${artisanId}`),
};

// ─── WhatsApp Sessions API (admin monitoring) ─────────────────────────────────
export const whatsappAPI = {
  /** Admin: list recent WhatsApp bot sessions */
  getSessions: (params?: { status?: string; page?: number; size?: number }) =>
    api.get('/admin/whatsapp/sessions', { params }),
};

export default api;

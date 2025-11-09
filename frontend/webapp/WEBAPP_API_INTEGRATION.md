# WebApp API Integration Status

## Phase 1: Authentication ✅ (In Progress)

### Updated Methods:
- ✅ `register()` - POST `/api/v1/users/register/` - Sends OTP
- ✅ `verifyRegistrationOtp()` - POST `/api/v1/users/verify-otp/` - Completes registration
- ✅ `login()` - POST `/api/v1/users/login/` - Sends OTP
- ✅ `verifyLoginOtp()` - POST `/api/v1/users/verify-login-otp/` - Completes login
- ✅ `getCurrentUser()` - GET `/api/v1/users/me/` - Gets user profile
- ✅ `updateProfile()` - PUT `/api/v1/users/profile/` - Updates profile
- ✅ `requestPasswordResetOtp()` - POST `/api/v1/users/forgot-password/request-otp/` - Requests password reset OTP
- ✅ `resetPassword()` - POST `/api/v1/users/reset-password/` - Resets password with OTP

### Response Format:
Backend returns: `{ access: "...", refresh: "...", user: {...} }`

## Phase 2: Public Events (Next)

### Endpoints to Update:
- GET `/api/v1/public/events/` - List events (with filters: category, location, date_from, date_to, search)
- GET `/api/v1/public/events/featured/` - Featured events
- GET `/api/v1/public/events/categories/` - Event categories
- GET `/api/v1/public/events/:id/` - Event details
- GET `/api/v1/public/organizers/:id/` - Organizer details
- GET `/api/v1/public/venues/` - Venues list

## Phase 3: Tickets & Bookings (Next)

### Endpoints:
- POST `/api/v1/tickets/book/` - Book tickets
- GET `/api/v1/users/tickets/` - List user tickets
- GET `/api/v1/users/tickets/:id/` - Ticket details
- GET `/api/v1/users/tickets/:id/qr-code/` - QR code
- POST `/api/v1/users/tickets/:id/transfer/` - Transfer ticket
- POST `/api/v1/users/tickets/:id/gift/` - Gift ticket
- POST `/api/v1/users/tickets/:id/refund-request/` - Request refund
- GET `/api/v1/users/events/:id/checkin-status/` - Check-in status

## Phase 4: Payments (Next)

### Endpoints:
- POST `/api/v1/payments/process/` - Process payment
- POST `/api/v1/payments/confirm/` - Confirm payment
- GET `/api/v1/payments/:transaction_id/status/` - Payment status
- GET `/api/v1/invoices/:transaction_id/` - Download invoice
- GET `/api/v1/users/payment-history/` - Payment history

## Phase 5: NFC Cards (Next)

### Endpoints:
- GET `/api/v1/users/nfc-cards/` - List cards
- POST `/api/v1/users/nfc-cards/request/` - Request card
- POST `/api/v1/users/nfc-cards/:id/reload/` - Reload balance
- GET `/api/v1/users/nfc-cards/:id/transactions/` - Transaction history
- POST `/api/v1/users/nfc-cards/:id/auto-reload-settings/` - Auto-reload settings

## Phase 6: Dependents (Next)

### Endpoints:
- GET `/api/v1/users/dependents/` - List dependents
- POST `/api/v1/users/dependents/` - Add dependent
- PUT `/api/v1/users/dependents/:id/` - Update dependent
- DELETE `/api/v1/users/dependents/:id/` - Delete dependent

## Phase 7: Favorites (Next)

### Endpoints:
- GET `/api/v1/users/favorites/` - List favorites
- POST `/api/v1/users/favorites/` - Add favorite
- DELETE `/api/v1/users/favorites/:event_id/` - Remove favorite

## Phase 8: Analytics (Next)

### Endpoints:
- GET `/api/v1/users/analytics/` - User analytics
- GET `/api/v1/users/payment-history/` - Payment history

## Phase 9: Check-in (Next)

### Endpoints:
- POST `/api/v1/checkin/verify/` - Verify check-in
- POST `/api/v1/checkin/nfc/` - NFC check-in


## Auth Flows

### Client Invitation Flow

1. **Coach invites a client**
   - Coach sends a POST request to `/api/invite-client` with client's email
   - System generates a secure token and sends an invitation email
   - Token is valid for 30 minutes
   - Email contains a signup link with the token: `/signup/:token`

2. **Client creates an account**
   - Client clicks the link in the email
   - Client fills out the registration form
   - System validates the token and creates a client account
   - Client is automatically linked to the inviting coach
   - Client can now log in

### Coach Approval Flow

1. **Coach registers**
   - Coach registers through the regular signup process
   - System marks the coach as unapproved

2. **Admin approves coach**
   - Admin views pending coach approvals in admin dashboard
   - Admin approves a coach by sending a PATCH request to `/api/coach/:id/approve`
   - Coach is now approved and can start inviting clients

### Password Reset Flow

1. **User requests password reset**
   - User submits email through `/forgot-password` page
   - System sends a password reset email with a secure token
   - Token is valid for 30 minutes
   - Email contains a reset link: `/reset-password/:token`

2. **User resets password**
   - User clicks the link in the email
   - User enters a new password
   - System validates the token and updates the password
   - User can now log in with the new password

### Token Security

- All tokens are 48-byte random hex strings (high entropy)
- Tokens have a 30-minute expiration time
- Tokens are stored in separate collections with TTL indexes for automatic cleanup
- Previous tokens are invalidated when new ones are issued for the same user
- Used tokens are immediately invalidated 
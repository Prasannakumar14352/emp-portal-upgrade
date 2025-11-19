# Security Features Implementation

This document outlines the security features implemented in the HRMS application.

## Two-Factor Authentication (2FA)

### Overview
The application now supports TOTP-based two-factor authentication using the speakeasy library.

### Features
- QR code generation for authenticator apps
- Manual secret key entry option
- 10 backup codes (single-use)
- Enable/disable 2FA from settings
- 2FA verification during login

### Setup Process
1. User navigates to Settings > Security
2. Clicks "Enable" next to Two-Factor Authentication
3. Scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enters verification code to confirm setup
5. Saves backup codes securely

### Database Schema
The following columns were added to the `profiles` table:
- `two_factor_secret` (TEXT) - Stores the TOTP secret
- `two_factor_enabled` (BOOLEAN) - Indicates if 2FA is enabled
- `two_factor_backup_codes` (TEXT) - JSON array of backup codes

### API Endpoints
- `POST /api/2fa/setup` - Generate secret and QR code
- `POST /api/2fa/verify` - Verify and enable 2FA
- `POST /api/2fa/disable` - Disable 2FA
- `POST /api/2fa/verify-login` - Verify 2FA during login
- `GET /api/2fa/status` - Get 2FA status and backup codes remaining

## Notification Features

### Notification Center
A dropdown widget in the top navigation bar that displays:
- 5 most recent notifications
- Unread count badge
- Color-coded notification types
- Click to mark as read
- Link to view all notifications

### Notification Sounds
Users can customize notification sounds and volume:
- Multiple sound options (Default, Chime, Ping, Alert, Success)
- Volume control (0-100%)
- Plays sound when new notifications arrive
- Can be disabled via push notifications toggle

### Browser Push Notifications
- Request permission from browser
- Show native browser notifications
- Disabled if user denies permission
- Respects user preferences

### Database Schema
The following columns were added to the `user_preferences` table:
- `notification_sound` (TEXT) - Selected notification sound
- `notification_volume` (INTEGER) - Volume level (0-100)

### Sound Files
Place MP3 files in `/public/sounds/`:
- `notification.mp3`
- `success.mp3`
- `alert.mp3`
- `chime.mp3`
- `ping.mp3`

## Security Best Practices

### Password Requirements
- Minimum 12 characters
- Hashed using bcrypt (10 rounds)
- Change password functionality in settings
- Password reset via email

### Session Management
- JWT-based authentication
- Token expiration
- Secure cookie storage
- Logout invalidates session

### Input Validation
- Server-side validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF protection

### Row-Level Security (RLS)
All database tables have RLS policies:
- Users can only view/edit their own data
- HR and managers have elevated permissions
- Service role bypass for system operations

## Future Enhancements

### Planned Features
- Session management (view active sessions, remote logout)
- Biometric authentication
- Security audit logs
- IP whitelisting
- Device fingerprinting
- Account recovery options
- Security email alerts

### 2FA Improvements
- SMS-based 2FA option
- Hardware key support (WebAuthn)
- Trusted device management
- Remember this device option

## Testing

### 2FA Testing
1. Enable 2FA for a test user
2. Verify QR code scanning works
3. Test backup code usage
4. Test disabling 2FA
5. Test login with 2FA enabled

### Notification Testing
1. Trigger different notification types
2. Verify sound plays at correct volume
3. Test browser notification permissions
4. Verify notification center updates in real-time
5. Test mark as read functionality

## Troubleshooting

### 2FA Issues
- **Lost authenticator device**: Use backup codes
- **No backup codes**: Contact administrator for 2FA reset
- **QR code not scanning**: Try manual secret entry

### Notification Issues
- **No sound**: Check volume settings and browser permissions
- **No notifications**: Verify push notifications are enabled
- **Notifications not updating**: Check network connection

## Dependencies

### Backend
- `speakeasy` - TOTP generation and verification
- `qrcode` - QR code generation
- `bcrypt` - Password hashing

### Frontend
- `@radix-ui/*` - UI components
- `date-fns` - Date formatting
- `sonner` - Toast notifications

## Security Considerations

1. **Secret Storage**: 2FA secrets are stored encrypted in the database
2. **Backup Codes**: Single-use, removed after use
3. **Token Window**: 2-step window for TOTP verification (allows clock skew)
4. **Rate Limiting**: Consider implementing rate limiting on 2FA endpoints
5. **Audit Logging**: Log all 2FA enable/disable events

## Maintenance

### Regular Tasks
- Monitor 2FA adoption rates
- Review security logs
- Update sound files as needed
- Test notification delivery
- Verify backup codes are working

### Updates
- Keep speakeasy library updated
- Monitor for security vulnerabilities
- Review and update RLS policies
- Test password reset flow regularly
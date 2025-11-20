# Azure AD Role Mapping Configuration

## Overview
The application automatically detects and assigns user roles based on Azure AD group memberships during OAuth login.

## How It Works

When a user logs in with Microsoft, the application:
1. Authenticates the user with Azure AD
2. Fetches their group memberships from Microsoft Graph API
3. Maps Azure AD groups to application roles (HR, Manager, Employee)
4. Assigns the appropriate roles to the user

## Role Assignment Logic

### Default Behavior
- **Employee**: Assigned to all users by default
- **HR**: Assigned if user belongs to HR-related groups
- **Manager**: Assigned if user belongs to Manager-related groups

### Group Detection Methods

#### 1. By Group Display Name (Auto-detection)
The system automatically checks group display names for these keywords:
- **HR Role**: Groups containing "hr" or "human resources" (case-insensitive)
- **Manager Role**: Groups containing "manager" or "lead" (case-insensitive)

#### 2. By Specific Group ID (Recommended)
For more precise control, configure specific Azure AD Group IDs:

```env
# In your .env file
AZURE_HR_GROUP_ID=12345678-1234-1234-1234-123456789abc
AZURE_MANAGER_GROUP_ID=87654321-4321-4321-4321-cba987654321
```

## Setup Instructions

### Step 1: Find Azure AD Group IDs

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **Groups**
3. Select the group you want to use
4. Copy the **Object ID** from the group's overview page

### Step 2: Configure Group Permissions in Azure AD

Ensure your Azure AD app registration has the required permissions:

1. Go to **Azure Active Directory** > **App registrations**
2. Select your application
3. Go to **API permissions**
4. Ensure these Microsoft Graph permissions are granted:
   - `User.Read` (Delegated)
   - `GroupMember.Read.All` (Delegated) - **Required for group detection**
5. Click **Grant admin consent** if needed

### Step 3: Update Environment Variables

Add the Group IDs to your `.env` file:

```env
AZURE_HR_GROUP_ID=your-hr-group-object-id
AZURE_MANAGER_GROUP_ID=your-manager-group-object-id
```

### Step 4: Assign Users to Groups in Azure AD

1. Go to **Azure Active Directory** > **Groups**
2. Select the HR or Manager group
3. Click **Members** > **Add members**
4. Add users who should have these roles

## Role Hierarchy

Users can have multiple roles:
- A user can be both HR and Manager
- All users automatically get the Employee role
- Roles are cumulative and non-exclusive

## Testing Role Assignment

1. Log in with a test user who belongs to the HR or Manager group
2. Check the backend logs for: `Detected roles for [email]: hr, employee`
3. Verify in the database that the user has the correct roles in the `user_roles` table

## Troubleshooting

### Roles Not Being Assigned

1. **Check API Permissions**:
   - Ensure `GroupMember.Read.All` permission is granted
   - Admin consent may be required

2. **Check Group Membership**:
   - Verify the user is actually a member of the group in Azure AD
   - Check both direct and nested group memberships

3. **Check Logs**:
   - Backend logs show detected roles during login
   - Look for errors related to fetching group memberships

4. **Verify Group IDs**:
   - Ensure the Group IDs in `.env` match the Object IDs in Azure AD
   - Group IDs are UUIDs, not group names

### Users Getting Only Employee Role

- If using Group IDs: Verify the IDs are correct
- If using auto-detection: Check that group names contain the expected keywords
- Check that the user is logged out and logs back in after being added to groups

## Security Notes

- Group membership is checked at login time
- Roles are stored in the database and JWT tokens
- To update a user's roles, they must log out and log back in
- Consider implementing role refresh mechanisms for long-lived sessions

## Custom Role Mapping

To add custom role detection logic, modify the group detection code in `backend/routes/auth.js`:

```javascript
const isCustomRole = groups.some(g => 
  g.id === CUSTOM_GROUP_ID || 
  g.displayName?.toLowerCase().includes('custom-keyword')
);

if (isCustomRole) userRoles.push('custom-role');
```

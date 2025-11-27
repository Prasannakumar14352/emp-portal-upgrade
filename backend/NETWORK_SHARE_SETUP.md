# Network Share Setup Guide

This guide explains how to configure and validate network share storage for payslip file management.

## Overview

The application can store payslip files on a network share instead of the local backend server. This is useful for:
- **Centralized Storage**: All payslips stored in one location accessible by multiple servers
- **Backup & Recovery**: Network shares typically have better backup mechanisms
- **Scalability**: Multiple backend instances can access the same storage
- **Compliance**: Easier to implement retention policies and access controls

## Configuration

### Step 1: Set Environment Variable

Add the following to your `backend/.env` file:

```env
# Windows UNC Path Example
NETWORK_SHARE_PATH=\\\\server\\share\\payslips

# Linux Mounted Path Example
NETWORK_SHARE_PATH=/mnt/network/payslips
```

### Step 2: Ensure Proper Permissions

The backend server must have **read and write** permissions on the network share.

#### Windows Permissions
1. Right-click the shared folder → Properties → Security
2. Add the user account running the Node.js process
3. Grant "Modify" permissions (includes Read, Write, Delete)

#### Linux Permissions
1. Mount the network share with appropriate permissions
2. Ensure the user running Node.js can read/write:
   ```bash
   chmod 755 /mnt/network/payslips
   chown nodeuser:nodegroup /mnt/network/payslips
   ```

### Step 3: Test Connection

The server automatically validates the network share on startup. You'll see one of these messages:

✅ **Success:**
```
============================================================
[2024-01-15T10:30:00.000Z] NETWORK SHARE VALIDATION
============================================================
✓ STATUS: VALID
✓ MESSAGE: Network share is properly configured and accessible

Details:
{
  "exists": true,
  "readable": true,
  "writable": true,
  "path": "\\\\server\\share\\payslips"
}
============================================================
```

❌ **Failure:**
```
============================================================
[2024-01-15T10:30:00.000Z] NETWORK SHARE VALIDATION
============================================================
✗ STATUS: INVALID
✗ MESSAGE: Network share is not writable. Check permissions.

Details:
{
  "exists": true,
  "readable": true,
  "writable": false,
  "writeError": "EACCES: permission denied"
}
============================================================
```

## Directory Structure

Payslips are organized as follows:

```
NETWORK_SHARE_PATH/
├── 101/                    # Employee ID
│   ├── 2024/
│   │   ├── January.pdf
│   │   ├── February.pdf
│   │   └── March.pdf
│   └── 2025/
│       └── January.pdf
├── 102/
│   └── 2024/
│       └── January.pdf
└── 103/
    └── 2024/
        └── January.pdf
```

## Validation Checks

The automatic validation performs these checks on startup:

1. **Path Configured**: Verifies `NETWORK_SHARE_PATH` is set in environment
2. **Path Exists**: Confirms the network share path exists
3. **Is Directory**: Ensures the path points to a directory, not a file
4. **Read Permission**: Tests read access by checking directory stats
5. **Write Permission**: Creates a test file, writes to it, reads it back, and deletes it
6. **Subdirectory Creation**: Verifies ability to create nested directories

## Health Check Endpoint

You can check network share status at runtime using the health endpoint:

```bash
GET /api/health
```

Response includes network share status:
```json
{
  "status": "ok",
  "message": "Backend server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "networkShare": {
    "configured": true,
    "path": "\\\\server\\share\\payslips",
    "accessible": true,
    "message": "Network share is properly configured and accessible"
  }
}
```

## Troubleshooting

### Issue: "Network share path does not exist"

**Solution:**
- Verify the path is correct in `.env`
- Check if the network share is mounted/accessible
- Test access manually: `cd \\\\server\\share\\payslips` (Windows) or `ls /mnt/network/payslips` (Linux)

### Issue: "Network share is not readable"

**Solution:**
- Check file permissions on the network share
- Ensure the user running the Node.js process has read access
- On Windows, verify the user is in the correct security groups

### Issue: "Network share is not writable"

**Solution:**
- Grant write permissions to the user running Node.js
- On Windows: Security tab → Edit → Add "Modify" permission
- On Linux: Use `chmod` and `chown` to set proper permissions

### Issue: "Cannot create subdirectories"

**Solution:**
- The parent directory exists but lacks permissions for subfolder creation
- Grant "Modify" or "Full Control" permissions (Windows)
- Use `chmod 755` or `chmod 775` (Linux)

### Issue: Payslips saving locally instead of network share

**Solution:**
- Check if `NETWORK_SHARE_PATH` is properly set in `.env`
- Restart the backend server after changing `.env`
- Check server startup logs for validation errors

## Fallback Behavior

If `NETWORK_SHARE_PATH` is not configured:
- ⚠️ Warning message displayed on startup
- Files save to `backend/uploads/payslips/` locally
- Application continues to function normally

## Best Practices

1. **Use Dedicated Share**: Create a dedicated network share for payslips
2. **Limit Access**: Only grant permissions to the backend server and HR administrators
3. **Enable Auditing**: Turn on access auditing for compliance tracking
4. **Regular Backups**: Ensure the network share is included in backup schedules
5. **Monitor Space**: Set up alerts for low disk space on the network share
6. **Test Failover**: Verify application behavior if network share becomes unavailable

## Windows Network Share Setup Example

### Create Share (Windows Server)

```powershell
# Create directory
New-Item -Path "C:\Payslips" -ItemType Directory

# Create share
New-SmbShare -Name "Payslips" -Path "C:\Payslips" -FullAccess "Domain\NodeJSServiceAccount"

# Set NTFS permissions
$Acl = Get-Acl "C:\Payslips"
$AccessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Domain\NodeJSServiceAccount","Modify","ContainerInherit,ObjectInherit","None","Allow")
$Acl.SetAccessRule($AccessRule)
Set-Acl "C:\Payslips" $Acl
```

### Access from Node.js Server

```env
NETWORK_SHARE_PATH=\\\\server.domain.com\\Payslips
```

## Linux NFS Mount Example

### Mount NFS Share

```bash
# Create mount point
sudo mkdir -p /mnt/network/payslips

# Add to /etc/fstab for persistent mount
echo "nfs-server:/export/payslips /mnt/network/payslips nfs defaults 0 0" | sudo tee -a /etc/fstab

# Mount
sudo mount -a

# Set permissions
sudo chown nodeuser:nodegroup /mnt/network/payslips
sudo chmod 755 /mnt/network/payslips
```

### Configuration

```env
NETWORK_SHARE_PATH=/mnt/network/payslips
```

## Security Considerations

1. **Encryption**: Use SMB3 encryption for Windows shares
2. **Access Logs**: Enable audit logging for file access
3. **Least Privilege**: Grant only necessary permissions
4. **Network Isolation**: Place share on isolated network segment
5. **Regular Reviews**: Audit access permissions quarterly

## Support

If you encounter issues:
1. Check server startup logs for validation details
2. Review `backend/logs/error.log` for errors
3. Test network share access manually
4. Verify firewall rules allow SMB/NFS traffic
5. Contact your network administrator for share access issues

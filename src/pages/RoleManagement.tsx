import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Shield, UserPlus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { roleManagementService, type UserWithRoles } from "@/services/roleManagementService";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RoleManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<'employee' | 'hr' | 'manager'>('employee');
  const [roleToDelete, setRoleToDelete] = useState<{ userId: number; roleId: number; role: string } | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { role: currentUserRole, loading: roleLoading } = useUserRole();

  const canManage = currentUserRole === 'hr';

  useEffect(() => {
    if (canManage) {
      loadUsers();
    } else if (!roleLoading) {
      setLoading(false);
    }
  }, [canManage, roleLoading]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await roleManagementService.getUsersWithRoles();
      setUsers(data);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error(error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      await roleManagementService.assignRole(selectedUser.id, selectedRole);
      toast.success(`${selectedRole.toUpperCase()} role assigned to ${selectedUser.full_name}`);
      setAssignDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to assign role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToDelete) return;

    try {
      setSubmitting(true);
      await roleManagementService.removeRole(roleToDelete.roleId);
      toast.success('Role removed successfully');
      setRoleToDelete(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove role');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'hr':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'employee':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">Access Denied</p>
            <p>You need HR role to access the role management panel.</p>
            <p className="text-sm mt-2">Your current role: <span className="font-mono font-bold">{currentUserRole}</span></p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <Shield className="h-8 w-8 text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
          <CardDescription>
            Assign or remove roles for users in the system. Each user must have at least one role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono">{user.id}</TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.department || '-'}</TableCell>
                  <TableCell>{user.position || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((roleInfo) => (
                          <div key={roleInfo.role_id} className="flex items-center gap-1">
                            <Badge variant={getRoleBadgeVariant(roleInfo.role)}>
                              {roleInfo.role}
                            </Badge>
                            {user.roles.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5"
                                onClick={() => setRoleToDelete({ 
                                  userId: user.id, 
                                  roleId: roleInfo.role_id, 
                                  role: roleInfo.role 
                                })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={assignDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                      setAssignDialogOpen(open);
                      if (!open) setSelectedUser(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Role</DialogTitle>
                          <DialogDescription>
                            Assign a new role to {user.full_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'employee' | 'hr' | 'manager')}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-2">
                            Current roles: {user.roles.map(r => r.role).join(', ') || 'None'}
                          </p>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={submitting}>
                            Cancel
                          </Button>
                          <Button onClick={handleAssignRole} disabled={submitting}>
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Assigning...
                              </>
                            ) : (
                              'Assign Role'
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-muted-foreground">
                Users will appear here once they are added to the system
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the <strong>{roleToDelete?.role}</strong> role? 
              The user will need to log out and log back in for the change to take effect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveRole} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

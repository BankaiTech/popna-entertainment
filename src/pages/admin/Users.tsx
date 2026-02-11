import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { usersApi } from '@/api/users';
import type { User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'employee'>('employee');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await usersApi.getAll();
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setAddName('');
    setAddUsername('');
    setAddPassword('');
    setAddRole('employee');
    setAddError('');
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    setAddError('');
  };

  const handleAddSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const name = addName.trim();
    const username = addUsername.trim();
    const password = addPassword;

    if (!name) {
      setAddError('Name is required');
      return;
    }
    if (!username) {
      setAddError('Username is required');
      return;
    }
    if (!password) {
      setAddError('Password is required');
      return;
    }

    setAddSaving(true);
    try {
      await usersApi.create({ organizationId: MOCK_ORGANIZATION_ID, name, username, password, role: addRole });
      await loadUsers();
      handleCloseAdd();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddSaving(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage admin and employee users</p>
        </div>
        <Button onClick={handleOpenAdd} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">User List ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users yet. Add one to get started.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">ID</th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Name</th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Username</th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Role</th>
                      <th className="text-left px-3 py-2 text-sm font-medium text-foreground">Created Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border hover:bg-muted/50 transition-colors",
                          idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{u.id}</td>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{u.name}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{u.username}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground capitalize">{u.role}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 dark:text-foreground">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-muted-foreground">ID: {u.id}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Username: </span>
                      <span className="font-medium">{u.username}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Role: </span>
                      <span className="capitalize">{u.role}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Created: {formatDate(u.createdAt)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog - mobile-friendly */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div
            className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-xl shadow-lg flex flex-col max-h-[90vh] sm:max-h-[85vh]"
            role="dialog"
            aria-labelledby="add-user-title"
            aria-modal="true"
          >
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
              <h2 id="add-user-title" className="text-lg font-semibold">Add User</h2>
            </div>
            <form onSubmit={handleAddSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Full name"
                    required
                    disabled={addSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username <span className="text-destructive">*</span></label>
                  <Input
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder="Unique username"
                    required
                    disabled={addSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password <span className="text-destructive">*</span></label>
                  <Input
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={addSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as 'admin' | 'employee')}
                    disabled={addSaving}
                  >
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </Select>
                </div>
                {addError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {addError}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseAdd} className="w-full sm:w-auto" disabled={addSaving}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={addSaving}>
                  {addSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;

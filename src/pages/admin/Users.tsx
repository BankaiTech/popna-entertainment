import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { usersApi } from '@/api/users';
import type { User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { Plus, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const itemsPerPage = 10;
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'employee'>('employee');
  const [addStatus, setAddStatus] = useState<'active' | 'inactive'>('active');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

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
    setAddStatus('active');
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
      await usersApi.create({ organizationId: MOCK_ORGANIZATION_ID, name, username, password, role: addRole, status: addStatus });
      await loadUsers();
      handleCloseAdd();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddSaving(false);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    setEditError('');
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setEditError('');
    const name = editName.trim();
    const username = editUsername.trim();

    if (!name) {
      setEditError('Name is required');
      return;
    }
    if (!username) {
      setEditError('Username is required');
      return;
    }

    setEditSaving(true);
    try {
      const updates: Partial<Omit<User, 'id' | 'createdAt'>> = {
        name,
        username,
        role: editRole,
        status: editStatus,
      };
      if (editPassword) {
        updates.password = editPassword;
      }
      await usersApi.update(editingUser.id, updates);
      await loadUsers();
      handleCloseEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  // Filter users by status
  const filteredUsers = useMemo(() => {
    if (statusFilter === 'all') return users;
    return users.filter((u) => u.status === statusFilter);
  }, [users, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Calculate user counts
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const employeeCount = users.filter((u) => u.role === 'employee').length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const inactiveCount = users.filter((u) => u.status === 'inactive').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-0.5">Users</h1>
          <p className="text-xs text-muted-foreground">Manage admin and employee users</p>
        </div>
        <Button onClick={handleOpenAdd} className="w-full sm:w-auto" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* User Count Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Users
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-2xl font-bold text-foreground mb-0.5">
              <AnimatedCounter value={users.length} duration={1500} />
            </div>
            <p className="text-xs text-muted-foreground">
              {users.length === 0 ? 'No users' : users.length === 1 ? '1 user' : `${users.length} users`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Admins
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-2xl font-bold text-foreground mb-0.5">
              <AnimatedCounter value={adminCount} duration={1500} />
            </div>
            <p className="text-xs text-muted-foreground">
              {adminCount === 0 ? '0 Admin' : adminCount === 1 ? '1 Admin' : `${adminCount} Admins`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Employees
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-2xl font-bold text-foreground mb-0.5">
              <AnimatedCounter value={employeeCount} duration={1500} />
            </div>
            <p className="text-xs text-muted-foreground">
              {employeeCount === 0 ? '0 Employee' : employeeCount === 1 ? '1 Employee' : `${employeeCount} Employees`}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-2xl font-bold text-foreground mb-0.5">
              <AnimatedCounter value={activeCount} duration={1500} />
            </div>
            <p className="text-xs text-muted-foreground">
              {inactiveCount} Inactive
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setStatusFilter('all');
            setCurrentPage(1);
          }}
        >
          All ({users.length})
        </Button>
        <Button
          variant={statusFilter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setStatusFilter('active');
            setCurrentPage(1);
          }}
        >
          Active ({activeCount})
        </Button>
        <Button
          variant={statusFilter === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setStatusFilter('inactive');
            setCurrentPage(1);
          }}
        >
          Inactive ({inactiveCount})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">ID</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Username</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Role</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Created Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={cn(
                          "border-b border-border hover:bg-muted/50 transition-colors",
                          idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'
                        )}
                      >
                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{u.id}</td>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{u.name}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{u.username}</td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600 capitalize">{u.role}</td>
                        <td className="px-3 py-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          )}>
                            {u.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{formatDate(u.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3 p-3">
                {paginatedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="bg-card border border-border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{u.name}</span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      )}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)} className="w-full">
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {filteredUsers.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={filteredUsers.length}
          />
        )}
      </Card>

      {/* Add User Dialog - mobile-friendly */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div
            className="w-full sm:max-w-md bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border"
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
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as 'active' | 'inactive')}
                    disabled={addSaving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
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

      {/* Edit User Dialog - mobile-friendly */}
      {isEditOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div
            className="w-full sm:max-w-md bg-card rounded-t-modal sm:rounded-modal shadow-soft-xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border border-border"
            role="dialog"
            aria-labelledby="edit-user-title"
            aria-modal="true"
          >
            <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border">
              <h2 id="edit-user-title" className="text-lg font-semibold">Edit User</h2>
            </div>
            <form onSubmit={handleEditSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name <span className="text-destructive">*</span></label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full name"
                    required
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username <span className="text-destructive">*</span></label>
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Unique username"
                    required
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    disabled={editSaving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank to keep current password</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'employee')}
                    disabled={editSaving}
                  >
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    disabled={editSaving}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {/* Replace with backend enforcement later */}
                    Inactive users cannot login
                  </p>
                </div>
                {editError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {editError}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2 px-4 sm:px-6 py-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseEdit} className="w-full sm:w-auto" disabled={editSaving}>
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={editSaving}>
                  {editSaving ? 'Saving...' : 'Update'}
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

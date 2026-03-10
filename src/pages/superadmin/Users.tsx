import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { superadminUsersApi } from '@/api/superadminUsers';
import { useAuthStore } from '@/store/useAuthStore';
import type { SuperAdminUser, SAPermissionKey, SuperAdminRole } from '@/models/types';
import { ALL_SA_PERMISSIONS } from '@/models/types';
import { Plus, UserCog, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const SA_PERMISSION_LABELS: Record<SAPermissionKey, string> = {
  sa_dashboard: 'Dashboard',
  sa_organizations_view: 'View Organizations',
  sa_organizations_add: 'Add Organizations',
  sa_organizations_edit: 'Edit Organizations',
  sa_organizations_inactive: 'Inactive Organizations',
  sa_signup_requests: 'Signup Requests',
  sa_users: 'Users Management',
};

const SuperAdminUsers = () => {
  const { t } = useTranslation();
  const { hasSAPermission, username: currentUsername } = useAuthStore();
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SuperAdminUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const itemsPerPage = 10;

  // Add form state
  const [addError, setAddError] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<SuperAdminRole>('manager');
  const [addStatus, setAddStatus] = useState<'active' | 'inactive'>('active');
  const [addPermissions, setAddPermissions] = useState<SAPermissionKey[]>(['sa_dashboard']);

  // Edit form state
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<SuperAdminRole>('manager');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editPermissions, setEditPermissions] = useState<SAPermissionKey[]>([]);

  if (!hasSAPermission('sa_users')) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await superadminUsersApi.getAll();
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleOpenAdd = () => {
    setAddName(''); setAddUsername(''); setAddPassword('');
    setAddRole('manager'); setAddStatus('active');
    setAddPermissions(['sa_dashboard']); setAddError('');
    setIsAddOpen(true);
  };

  const handleCloseAdd = () => { setIsAddOpen(false); setAddError(''); };

  const handleAddSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    const name = addName.trim();
    const username = addUsername.trim();
    if (!name) { setAddError(t('users.validation.nameRequired', 'Name is required')); return; }
    if (!username) { setAddError(t('users.validation.usernameRequired', 'Username is required')); return; }
    if (!addPassword) { setAddError(t('users.validation.passwordRequired', 'Password is required')); return; }

    setAddSaving(true);
    try {
      await superadminUsersApi.create({
        name, username, password: addPassword,
        role: addRole, status: addStatus,
        allowedPermissions: addRole === 'manager' ? addPermissions : undefined,
      });
      await loadUsers();
      handleCloseAdd();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('users.errors.addFailed', 'Failed to add user'));
    } finally {
      setAddSaving(false);
    }
  };

  const handleOpenEdit = (user: SuperAdminUser) => {
    setEditingUser(user);
    setEditName(user.name); setEditUsername(user.username); setEditPassword('');
    setEditRole(user.role); setEditStatus(user.status);
    setEditPermissions(user.allowedPermissions || []);
    setEditError('');
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => { setIsEditOpen(false); setEditingUser(null); setEditError(''); };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    const name = editName.trim();
    const username = editUsername.trim();
    if (!name) { setEditError(t('users.validation.nameRequired', 'Name is required')); return; }
    if (!username) { setEditError(t('users.validation.usernameRequired', 'Username is required')); return; }

    setEditSaving(true);
    try {
      const updates: Partial<Omit<SuperAdminUser, 'id' | 'createdAt'>> = {
        name, username, role: editRole, status: editStatus,
        allowedPermissions: editRole === 'manager' ? editPermissions : undefined,
      };
      if (editPassword) updates.password = editPassword;
      await superadminUsersApi.update(editingUser.id, updates);
      await loadUsers();
      handleCloseEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('users.errors.updateFailed', 'Failed to update user'));
    } finally {
      setEditSaving(false);
    }
  };

  const togglePermission = (perms: SAPermissionKey[], setPerms: (p: SAPermissionKey[]) => void, perm: SAPermissionKey) => {
    setPerms(perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm]);
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'all') return users;
    return users.filter((u) => u.status === statusFilter);
  }, [users, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
  const managerCount = users.filter((u) => u.role === 'manager').length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const inactiveCount = users.filter((u) => u.status === 'inactive').length;

  const PermissionCheckboxes = ({ permissions, setPermissions }: { permissions: SAPermissionKey[]; setPermissions: (p: SAPermissionKey[]) => void }) => (
    <div>
      <label className="block text-sm font-medium mb-2">
        <Shield className="w-4 h-4 inline mr-1" />
        {t('superadminUsers.permissions', 'Permissions')}
      </label>
      <p className="text-xs text-muted-foreground mb-3">{t('superadminUsers.permissionsHint', 'Select what this manager can access')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_SA_PERMISSIONS.map((perm) => (
          <label
            key={perm}
            className={cn(
              'flex items-center gap-3 p-3 sm:p-2 rounded-lg border cursor-pointer transition-all text-sm min-h-[48px] sm:min-h-0 touch-manipulation',
              permissions.includes(perm)
                ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-600'
            )}
          >
            <input
              type="checkbox"
              checked={permissions.includes(perm)}
              onChange={() => togglePermission(permissions, setPermissions, perm)}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500 w-5 h-5 sm:w-4 sm:h-4 flex-shrink-0"
            />
            <span className="truncate">{SA_PERMISSION_LABELS[perm]}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            {t('superadminUsers.title', 'Users')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('superadminUsers.subtitle', 'Manage super admin and manager accounts')}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: t('users.stats.totalUsers', 'Total Users'), value: users.length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: t('superadminUsers.superAdmins', 'Super Admins'), value: superAdminCount, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('superadminUsers.managers', 'Managers'), value: managerCount, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: t('common.active', 'Active'), value: activeCount, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('common.inactive', 'Inactive'), value: inactiveCount, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <Card key={i} className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
              <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</CardTitle>
              <div className={cn('p-2 rounded-lg group-hover:scale-110 transition-transform duration-300', stat.bg)}>
                <UserCog className={cn('w-4 h-4', stat.color)} />
              </div>
            </CardHeader>
            <CardContent className="pb-3 px-3">
              <div className="text-lg font-bold text-foreground"><AnimatedCounter value={stat.value} duration={1500} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs + Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-2">
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {status === 'all' ? t('common.all', 'All') : status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
            </button>
          ))}
        </div>
        <Button onClick={handleOpenAdd} size="xs">
          <Plus className="w-3.5 h-3.5" />
          {t('users.addUser', 'Add User')}
        </Button>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('users.loading', 'Loading users...')}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('users.noResults', 'No users found.')}</div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('users.colId', 'ID')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('users.colName', 'Name')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('users.colUsername', 'Username')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-36">{t('users.colRole', 'Role')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('users.colStatus', 'Status')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('superadminUsers.permissions', 'Permissions')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('users.colCreatedDate', 'Created')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('users.colActions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((u, idx) => (
                      <tr key={u.id} className={cn('border-b border-border hover:bg-muted/50 transition-colors', idx % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-muted/20')}>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{u.id}</td>
                        <td className="px-3 py-2 text-sm font-medium text-foreground">{u.name}</td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{u.username}</td>
                        <td className="px-3 py-2 text-sm">
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                            u.role === 'super_admin'
                              ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700'
                          )}>
                            {u.role === 'super_admin' ? t('superadminUsers.roleSuperAdmin', 'Super Admin') : t('superadminUsers.roleManager', 'Manager')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', u.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300')}>
                            {u.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {u.role === 'manager' && u.allowedPermissions ? (
                            <div className="flex flex-wrap gap-1">
                              {u.allowedPermissions.map((p) => (
                                <span key={p} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] rounded font-medium">
                                  {SA_PERMISSION_LABELS[p]}
                                </span>
                              ))}
                            </div>
                          ) : u.role === 'super_admin' ? (
                            <span className="text-xs text-muted-foreground italic">{t('superadminUsers.fullAccess', 'Full access')}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(u.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            disabled={u.username === currentUsername}
                          >
                            {t('common.edit', 'Edit')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden space-y-3 p-3">
                {paginatedUsers.map((u) => (
                  <div key={u.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium">{u.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', u.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300')}>
                          {u.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('users.colUsername', 'Username')}: </span>
                      <span className="font-medium">{u.username}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('users.colRole', 'Role')}: </span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                        u.role === 'super_admin'
                          ? 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700'
                      )}>
                        {u.role === 'super_admin' ? t('superadminUsers.roleSuperAdmin', 'Super Admin') : t('superadminUsers.roleManager', 'Manager')}
                      </span>
                    </div>
                    {u.role === 'manager' && u.allowedPermissions && u.allowedPermissions.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground block mb-1">{t('superadminUsers.permissions', 'Permissions')}:</span>
                        <div className="flex flex-wrap gap-1">
                          {u.allowedPermissions.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px] rounded font-medium">
                              {SA_PERMISSION_LABELS[p]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{t('users.created', 'Created')}: {formatDate(u.createdAt)}</div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)} className="w-full" disabled={u.username === currentUsername}>
                      {t('common.edit', 'Edit')}
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
        {filteredUsers.length > itemsPerPage && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredUsers.length} />
        )}
      </Card>

      {/* Add User Dialog */}
      {isAddOpen && (
        <Dialog open={isAddOpen} onClose={handleCloseAdd} size="lg">
          <DialogHeader title={t('users.addUser', 'Add User')} onClose={handleCloseAdd} />
          <form onSubmit={handleAddSave} className="flex flex-col flex-1 min-h-0">
            <DialogBody>
              <div className="px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.name', 'Name')} <span className="text-destructive">*</span></label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={t('users.placeholders.fullName', 'Full name')} required disabled={addSaving} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.username', 'Username')} <span className="text-destructive">*</span></label>
                  <Input value={addUsername} onChange={(e) => setAddUsername(e.target.value)} placeholder={t('users.placeholders.uniqueUsername', 'Unique username')} required disabled={addSaving} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.password', 'Password')} <span className="text-destructive">*</span></label>
                  <Input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} placeholder="••••••••" required disabled={addSaving} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.role', 'Role')}</label>
                  <Select value={addRole} onChange={(e) => setAddRole(e.target.value as SuperAdminRole)} disabled={addSaving}>
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.status', 'Status')}</label>
                  <Select value={addStatus} onChange={(e) => setAddStatus(e.target.value as 'active' | 'inactive')} disabled={addSaving}>
                    <option value="active">{t('common.active', 'Active')}</option>
                    <option value="inactive">{t('common.inactive', 'Inactive')}</option>
                  </Select>
                </div>
                {addRole === 'manager' && (
                  <PermissionCheckboxes permissions={addPermissions} setPermissions={setAddPermissions} />
                )}
                {addError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">{addError}</div>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseAdd} className="w-full sm:w-auto" disabled={addSaving}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={addSaving}>
                {addSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {isEditOpen && editingUser && (
        <Dialog open={isEditOpen} onClose={handleCloseEdit} size="lg">
          <DialogHeader title={t('users.editUser', 'Edit User')} onClose={handleCloseEdit} />
          <form onSubmit={handleEditSave} className="flex flex-col flex-1 min-h-0">
            <DialogBody>
              <div className="px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.name', 'Name')} <span className="text-destructive">*</span></label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={t('users.placeholders.fullName', 'Full name')} required disabled={editSaving} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.username', 'Username')} <span className="text-destructive">*</span></label>
                  <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder={t('users.placeholders.uniqueUsername', 'Unique username')} required disabled={editSaving} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.password', 'Password')}</label>
                  <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder={t('users.placeholders.leaveBlank', 'Leave blank to keep current')} disabled={editSaving} />
                  <p className="text-xs text-muted-foreground mt-1">{t('users.hints.keepPassword', 'Leave blank to keep current password')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.role', 'Role')}</label>
                  <Select value={editRole} onChange={(e) => setEditRole(e.target.value as SuperAdminRole)} disabled={editSaving}>
                    <option value="super_admin">Super Admin</option>
                    <option value="manager">Manager</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.status', 'Status')}</label>
                  <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')} disabled={editSaving}>
                    <option value="active">{t('common.active', 'Active')}</option>
                    <option value="inactive">{t('common.inactive', 'Inactive')}</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{t('users.hints.inactiveLogin', 'Inactive users cannot login')}</p>
                </div>
                {editRole === 'manager' && (
                  <PermissionCheckboxes permissions={editPermissions} setPermissions={setEditPermissions} />
                )}
                {editError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">{editError}</div>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseEdit} className="w-full sm:w-auto" disabled={editSaving}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={editSaving}>
                {editSaving ? t('common.saving', 'Saving...') : t('common.update', 'Update')}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}
    </div>
  );
};

export default SuperAdminUsers;

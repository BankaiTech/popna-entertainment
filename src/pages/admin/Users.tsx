import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/Dialog';
import { usersApi } from '@/api/users';
import type { User } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { Plus, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminUsers = () => {
  const { t } = useTranslation();
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
      setAddError(t('users.validation.nameRequired', 'Name is required'));
      return;
    }
    if (!username) {
      setAddError(t('users.validation.usernameRequired', 'Username is required'));
      return;
    }
    if (!password) {
      setAddError(t('users.validation.passwordRequired', 'Password is required'));
      return;
    }

    setAddSaving(true);
    try {
      await usersApi.create({ organizationId: MOCK_ORGANIZATION_ID, name, username, password, role: addRole, status: addStatus });
      await loadUsers();
      handleCloseAdd();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : t('users.errors.addFailed', 'Failed to add user'));
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
      setEditError(t('users.validation.nameRequired', 'Name is required'));
      return;
    }
    if (!username) {
      setEditError(t('users.validation.usernameRequired', 'Username is required'));
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
      setEditError(err instanceof Error ? err.message : t('users.errors.updateFailed', 'Failed to update user'));
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

  // Summary card counts (analytics only; filters are separate data control)
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const employeeCount = users.filter((u) => u.role === 'employee').length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const inactiveCount = users.filter((u) => u.status === 'inactive').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground mb-0.5">{t('users.title', 'Users')}</h1>
          <p className="text-xs text-muted-foreground">{t('users.subtitle', 'Manage admin and employee users')}</p>
        </div>
        <Button onClick={handleOpenAdd} className="w-full sm:w-auto" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          {t('users.addUser', 'Add User')}
        </Button>
      </div>

      {/* Summary cards = analytics only; filters below = data control. Removed duplicate user count display for cleaner UX */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('users.stats.totalUsers', 'Total Users')}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-lg font-bold text-foreground">
              <AnimatedCounter value={users.length} duration={1500} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('users.stats.admins', 'Admins')}
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-lg font-bold text-foreground">
              <AnimatedCounter value={adminCount} duration={1500} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('users.stats.employees', 'Employees')}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-lg font-bold text-foreground">
              <AnimatedCounter value={employeeCount} duration={1500} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('users.stats.active', 'Active')}
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-lg font-bold text-foreground">
              <AnimatedCounter value={activeCount} duration={1500} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group hover:-translate-y-0.5 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('users.stats.inactive', 'Inactive')}
            </CardTitle>
            <div className="p-2 rounded-lg bg-slate-50 group-hover:scale-110 transition-transform duration-300">
              <UserCog className="w-4 h-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 px-3">
            <div className="text-lg font-bold text-foreground">
              <AnimatedCounter value={inactiveCount} duration={1500} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter — simple tabs, no counts; data control only */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            statusFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {t('common.all', 'All')}
        </button>
        <button
          type="button"
          onClick={() => { setStatusFilter('active'); setCurrentPage(1); }}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            statusFilter === 'active'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {t('common.active', 'Active')}
        </button>
        <button
          type="button"
          onClick={() => { setStatusFilter('inactive'); setCurrentPage(1); }}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            statusFilter === 'inactive'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {t('common.inactive', 'Inactive')}
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">{t('users.loading', 'Loading users...')}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('users.noResults', 'No users found.')}</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-14">{t('users.colId', 'ID')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-36">{t('users.colName', 'Name')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('users.colUsername', 'Username')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('users.colRole', 'Role')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('users.colStatus', 'Status')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('users.colCreatedDate', 'Created Date')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('users.colActions', 'Actions')}</th>
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
                            {u.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm font-normal text-gray-600">{formatDate(u.createdAt)}</td>
                        <td className="px-3 py-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)}>
                            {t('common.edit', 'Edit')}
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
                        {u.status === 'active' ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('users.colUsername', 'Username')}: </span>
                      <span className="font-medium">{u.username}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">{t('users.colRole', 'Role')}: </span>
                      <span className="capitalize">{u.role}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{t('users.created', 'Created')}: {formatDate(u.createdAt)}</div>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(u)} className="w-full">
                      {t('common.edit', 'Edit')}
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

      {/* Add User Dialog */}
      {isAddOpen && (
        <Dialog open={isAddOpen} onClose={handleCloseAdd}>
          <DialogHeader title={t('users.addUser', 'Add User')} onClose={handleCloseAdd} />
          <form onSubmit={handleAddSave} className="flex flex-col flex-1 min-h-0">
            <DialogBody>
              <div className="px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.name', 'Name')} <span className="text-destructive">*</span></label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder={t('users.placeholders.fullName', 'Full name')}
                    required
                    disabled={addSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.username', 'Username')} <span className="text-destructive">*</span></label>
                  <Input
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value)}
                    placeholder={t('users.placeholders.uniqueUsername', 'Unique username')}
                    required
                    disabled={addSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.password', 'Password')} <span className="text-destructive">*</span></label>
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
                  <label className="block text-sm font-medium mb-1">{t('users.fields.role', 'Role')}</label>
                  <Select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as 'admin' | 'employee')}
                    disabled={addSaving}
                  >
                    <option value="admin">{t('users.roles.admin', 'Admin')}</option>
                    <option value="employee">{t('users.roles.employee', 'Employee')}</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.status', 'Status')}</label>
                  <Select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as 'active' | 'inactive')}
                    disabled={addSaving}
                  >
                    <option value="active">{t('common.active', 'Active')}</option>
                    <option value="inactive">{t('common.inactive', 'Inactive')}</option>
                  </Select>
                </div>
                {addError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {addError}
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseAdd} className="w-full sm:w-auto" disabled={addSaving}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={addSaving}>
                {addSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      {isEditOpen && editingUser && (
        <Dialog open={isEditOpen} onClose={handleCloseEdit}>
          <DialogHeader title={t('users.editUser', 'Edit User')} onClose={handleCloseEdit} />
          <form onSubmit={handleEditSave} className="flex flex-col flex-1 min-h-0">
            <DialogBody>
              <div className="px-4 sm:px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.name', 'Name')} <span className="text-destructive">*</span></label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t('users.placeholders.fullName', 'Full name')}
                    required
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.username', 'Username')} <span className="text-destructive">*</span></label>
                  <Input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder={t('users.placeholders.uniqueUsername', 'Unique username')}
                    required
                    disabled={editSaving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.password', 'Password')}</label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={t('users.placeholders.leaveBlank', 'Leave blank to keep current')}
                    disabled={editSaving}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('users.hints.keepPassword', 'Leave blank to keep current password')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.role', 'Role')}</label>
                  <Select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as 'admin' | 'employee')}
                    disabled={editSaving}
                  >
                    <option value="admin">{t('users.roles.admin', 'Admin')}</option>
                    <option value="employee">{t('users.roles.employee', 'Employee')}</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('users.fields.status', 'Status')}</label>
                  <Select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                    disabled={editSaving}
                  >
                    <option value="active">{t('common.active', 'Active')}</option>
                    <option value="inactive">{t('common.inactive', 'Inactive')}</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('users.hints.inactiveLogin', 'Inactive users cannot login')}
                  </p>
                </div>
                {editError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {editError}
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={handleCloseEdit} className="w-full sm:w-auto" disabled={editSaving}>
                {t('common.cancel', 'Cancel')}
              </Button>
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

export default AdminUsers;

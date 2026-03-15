import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardHeading, CardToolbar } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { auditTrailApi } from '@/api/auditTrail';
import type { AuditEntry, AuditAction } from '@/models/types';
import { Search } from 'lucide-react';

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'login', 'logout', 'export'];

const ACTION_COLORS: Record<AuditAction, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  login: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  export: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function AuditTrail() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [usernameFilter, setUsernameFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const list = await auditTrailApi.getAll({
        username: usernameFilter || undefined,
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setEntries(list);
      setLoading(false);
    };
    load();
  }, [usernameFilter, entityFilter, actionFilter, fromDate, toDate]);

  const entities = useMemo(() => {
    const set = new Set(entries.map((e) => e.entity));
    return Array.from(set).sort();
  }, [entries]);

  const formatTime = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3 sm:px-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardHeading className="p-0 w-full md:w-auto md:min-w-0 shrink-0">
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none shrink-0" />
              <Input
                placeholder={t('auditTrail.usernamePlaceholder', 'Search by username...')}
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                className="pl-9 h-9 text-sm w-full min-w-0"
              />
            </div>
          </CardHeading>
          <CardToolbar className="flex flex-col gap-2 w-full min-w-0 sm:flex-row sm:items-center sm:gap-3 sm:w-auto">
            <Select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 text-sm w-full min-w-0 sm:w-40"
            >
              <option value="">{t('auditTrail.allEntities', 'All Modules')}</option>
              {entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </Select>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
              className="h-9 text-sm w-full min-w-0 sm:w-36"
            >
              <option value="">{t('auditTrail.allActions', 'All Actions')}</option>
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{t(`auditTrail.action_${a}`, a)}</option>
              ))}
            </Select>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-sm w-full min-w-0 sm:w-36"
              title={t('common.fromDate', 'From date')}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-sm w-full min-w-0 sm:w-36"
              title={t('common.toDate', 'To date')}
            />
          </CardToolbar>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t('common.loading', 'Loading...')}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">{t('auditTrail.noEntries', 'No audit entries found')}</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border bg-muted/30">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-36">{t('auditTrail.timestamp', 'Time')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-28">{t('auditTrail.user', 'User')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-24">{t('auditTrail.action', 'Action')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground w-32">{t('auditTrail.entity', 'Module')}</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground">{t('auditTrail.details', 'Details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => (
                      <tr
                        key={e.id}
                        className={`border-b border-border hover:bg-muted/50 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-muted/20'}`}
                      >
                        <td className="py-2 px-3 text-sm text-muted-foreground whitespace-nowrap">{formatTime(e.timestamp)}</td>
                        <td className="py-2 px-3 text-sm font-medium text-foreground">{e.username}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[e.action] ?? 'bg-gray-100 text-gray-700'}`}>
                            {t(`auditTrail.action_${e.action}`, e.action)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-sm text-foreground">{e.entity}{e.entityId ? ` #${e.entityId}` : ''}</td>
                        <td className="py-2 px-3 text-sm text-muted-foreground max-w-xs truncate">{e.details ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3 p-3">
                {entries.map((e) => (
                  <div key={e.id} className="bg-card border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{e.username}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[e.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {t(`auditTrail.action_${e.action}`, e.action)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{e.entity}{e.entityId ? ` #${e.entityId}` : ''}</div>
                    {e.details && <div className="text-xs text-muted-foreground line-clamp-2">{e.details}</div>}
                    <div className="text-xs text-muted-foreground">{formatTime(e.timestamp)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

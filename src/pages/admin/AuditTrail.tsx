import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardHeading } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { auditTrailApi } from '@/api/auditTrail';
import type { AuditEntry, AuditAction } from '@/models/types';
import { Activity } from 'lucide-react';

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'login', 'logout', 'export'];

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardHeading>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {t('auditTrail.title', 'Audit Trail')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auditTrail.subtitle', 'Activity log with filtering by user, module, action and date range.')}
            </p>
          </CardHeading>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('auditTrail.user', 'User')}</label>
              <Input
                placeholder={t('auditTrail.usernamePlaceholder', 'Username')}
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('auditTrail.entity', 'Entity / Module')}</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm w-40"
              >
                <option value="">{t('common.all', 'All')}</option>
                {entities.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('auditTrail.action', 'Action')}</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as AuditAction | '')}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm w-36"
              >
                <option value="">{t('common.all', 'All')}</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.fromDate', 'From date')}</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('common.toDate', 'To date')}</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-8">{t('common.loading', 'Loading...')}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t('auditTrail.noEntries', 'No audit entries found')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('auditTrail.timestamp', 'Time')}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('auditTrail.user', 'User')}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('auditTrail.action', 'Action')}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('auditTrail.entity', 'Entity')}</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500 dark:text-gray-400">{t('auditTrail.details', 'Details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatTime(e.timestamp)}</td>
                      <td className="py-2 px-2 text-gray-900 dark:text-gray-100">{e.username}</td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {e.action}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-700 dark:text-gray-300">{e.entity}{e.entityId ? ` #${e.entityId}` : ''}</td>
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400 max-w-[300px] truncate">{e.details ?? '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

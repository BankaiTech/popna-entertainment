import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Plus, Search, Trash2, Pencil, UserPlus } from 'lucide-react';
import type { Lead, LeadStage } from '@/models/types';
import { useLeadsStore } from '@/store/useLeadsStore';
import LeadModal from '@/components/LeadModal';
import { formatCurrencyINR } from '@/lib/utils';


const Leads = () => {
  const { t } = useTranslation();
  const { leads, loading, fetchLeads, addLead, updateLead, deleteLead } = useLeadsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        l.mobile.includes(q) ||
        (l.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [leads, searchQuery]);



  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(start, start + itemsPerPage);
  }, [filteredLeads, currentPage]);
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleAdd = () => { setEditingLead(null); setIsModalOpen(true); };
  const handleEdit = (lead: Lead) => { setEditingLead(lead); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingLead(null); };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('leads.deleteConfirm', 'Are you sure you want to delete this lead?'))) {
      await deleteLead(id);
    }
  };



  const stageLabel = (s: LeadStage) => t(`leads.stage${s.charAt(0).toUpperCase() + s.slice(1)}`, s);

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="py-2.5 px-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('leads.searchPlaceholder', 'Search leads...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button onClick={handleAdd} size="xs" className="shrink-0 w-full sm:w-auto ml-auto">
              <Plus className="w-3.5 h-3.5" />
              {t('leads.addLead', 'Add Lead')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-8 text-gray-500 flex flex-col items-center gap-2">
              <UserPlus className="w-10 h-10 text-gray-400" />
              {t('leads.noLeads', 'No leads found')}
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('leads.name', 'Name')}</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('leads.mobile', 'Mobile')}</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('leads.stage', 'Stage')}</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('leads.source', 'Source')}</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('leads.value', 'Value')}</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400">{t('common.actions', 'Actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedLeads.map((lead) => (
                          <tr key={lead.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-3 font-medium text-gray-900 dark:text-gray-100">{lead.name}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{lead.mobile}</td>
                            <td className="py-3 px-3">{stageLabel(lead.stage)}</td>
                            <td className="py-3 px-3 text-gray-600 dark:text-gray-400">{lead.source}</td>
                            <td className="py-3 px-3 text-right">{lead.value != null && lead.value > 0 ? formatCurrencyINR(lead.value) : '–'}</td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleEdit(lead)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-3">
                    {paginatedLeads.map((lead) => (
                      <div key={lead.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{lead.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{lead.mobile} • {stageLabel(lead.stage)}</p>
                        {lead.value != null && lead.value > 0 && <p className="text-sm font-medium text-primary mt-1">{formatCurrencyINR(lead.value)}</p>}
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <button onClick={() => handleEdit(lead)} className="px-2 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">{t('common.edit', 'Edit')}</button>
                          <button onClick={() => handleDelete(lead.id)} className="px-2 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40">{t('common.delete', 'Delete')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                  )}
            </>
          )}
        </CardContent>
      </Card>
      <LeadModal isOpen={isModalOpen} onClose={handleClose} lead={editingLead} onSave={addLead} onUpdate={updateLead} />
    </div>
  );
};

export default Leads;

import type { AuditAction } from '@/models/types';
import { MOCK_ORGANIZATION_ID } from '@/models/types';
import { auditTrailApi } from '@/api/auditTrail';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Log an audit entry. Call from stores or components after create/update/delete/export.
 * Reads current user from useAuthStore (username); userId defaults to 1 for mock.
 */
export async function logAudit(
  action: AuditAction,
  entity: string,
  entityId?: string,
  details?: string
): Promise<void> {
  try {
    const state = useAuthStore.getState();
    const username = state.username ?? 'system';
    const userId = 1; // Mock: in real app get from auth context
    await auditTrailApi.add({
      organizationId: MOCK_ORGANIZATION_ID,
      userId,
      username,
      action,
      entity,
      entityId,
      details,
    });
  } catch {
    // Non-blocking; avoid breaking caller
  }
}

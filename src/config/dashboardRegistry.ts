import { lazy } from 'react';
import type { DashboardWidgetKey } from './industryTemplates';

export interface WidgetRegistryEntry {
  component: React.LazyExoticComponent<React.ComponentType>;
  layout: 'kpi' | 'chart' | 'table' | 'section';
}

const w = (path: string, layout: WidgetRegistryEntry['layout']): WidgetRegistryEntry => ({
  component: lazy(() => import(`@/components/dashboard/widgets/${path}.tsx`)),
  layout,
});

export const WIDGET_REGISTRY: Record<DashboardWidgetKey, WidgetRegistryEntry> = {
  // ── Common KPIs ──
  revenue: w('RevenueWidget', 'kpi'),
  todaySales: w('TodaySalesWidget', 'kpi'),
  contacts: w('ContactsWidget', 'kpi'),
  lowStock: w('LowStockWidget', 'kpi'),
  pendingInvoices: w('PendingInvoicesWidget', 'kpi'),
  complaints: w('ComplaintsWidget', 'kpi'),
  appointments: w('AppointmentsWidget', 'kpi'),
  expiringSoon: w('ExpiringSoonWidget', 'kpi'),

  // ── ISP ──
  ispMrr: w('IspMrrWidget', 'kpi'),
  ispChurnRate: w('IspChurnRateWidget', 'kpi'),
  ispConnectionRequests: w('IspConnectionRequestsWidget', 'kpi'),
  ispOpenTickets: w('IspOpenTicketsWidget', 'kpi'),
  ispOverduePayments: w('IspOverduePaymentsWidget', 'kpi'),
  ispSubscriberGrowthChart: w('IspSubscriberGrowthChartWidget', 'chart'),
  ispAreaDistributionChart: w('IspAreaDistributionChartWidget', 'chart'),

  // ── Retail ──
  retailAvgOrderValue: w('RetailAvgOrderWidget', 'kpi'),
  retailItemsSoldToday: w('RetailItemsSoldWidget', 'kpi'),
  retailTopSellingChart: w('RetailTopSellingChartWidget', 'chart'),
  retailSalesByCategoryChart: w('RetailSalesByCategoryChartWidget', 'chart'),

  // ── Restaurant ──
  restaurantOrdersToday: w('RestaurantOrdersWidget', 'kpi'),
  restaurantAvgBillValue: w('RestaurantAvgBillWidget', 'kpi'),
  restaurantTableOccupancy: w('RestaurantTableOccupancyWidget', 'kpi'),
  restaurantPopularDishesChart: w('RestaurantPopularDishesChartWidget', 'chart'),
  restaurantPeakHoursChart: w('RestaurantPeakHoursChartWidget', 'chart'),

  // ── Salon/Spa ──
  salonAvgServiceValue: w('SalonAvgServiceWidget', 'kpi'),
  salonStylistUtilization: w('SalonStylistUtilWidget', 'kpi'),
  salonClientRetention: w('SalonClientRetentionWidget', 'kpi'),
  salonPopularServicesChart: w('SalonPopularServicesChartWidget', 'chart'),

  // ── Grocery ──
  groceryAvgBasketSize: w('GroceryAvgBasketWidget', 'kpi'),
  groceryFastMovingItems: w('GroceryFastMovingWidget', 'kpi'),
  groceryCategorySalesChart: w('GroceryCategorySalesChartWidget', 'chart'),
  groceryWastageChart: w('GroceryWastageChartWidget', 'chart'),

  // ── Healthcare ──
  healthcarePatientsToday: w('HealthcarePatientWidget', 'kpi'),
  healthcarePrescriptionsFilled: w('HealthcarePrescriptionsWidget', 'kpi'),
  healthcareMedicineAlerts: w('HealthcareMedicineAlertsWidget', 'kpi'),
  healthcareAppointmentScheduleChart: w('HealthcareAppointmentScheduleChartWidget', 'chart'),

  // ── Gym/Fitness ──
  gymActiveMembers: w('GymActiveMembersWidget', 'kpi'),
  gymCheckInsToday: w('GymCheckInsWidget', 'kpi'),
  gymExpiringMemberships: w('GymMembershipExpiringWidget', 'kpi'),
  gymNewSignups: w('GymNewSignupsWidget', 'kpi'),
  gymPeakHoursChart: w('GymPeakHoursChartWidget', 'chart'),

  // ── Electronics ──
  electronicsWarrantyClaims: w('ElectronicsWarrantyWidget', 'kpi'),
  electronicsRepairJobs: w('ElectronicsRepairJobsWidget', 'kpi'),
  electronicsTopRevenueChart: w('ElectronicsTopRevenueChartWidget', 'chart'),

  // ── Shared Charts ──
  revenueChart: w('RevenueChartWidget', 'chart'),
  invoiceStatusPie: w('InvoiceStatusPieWidget', 'chart'),

  // ── Shared Tables ──
  recentSalesTable: w('RecentSalesWidget', 'table'),
  recentContactsTable: w('RecentContactsWidget', 'table'),

  // ── Shared Sections ──
  financialOverview: w('FinancialOverviewWidget', 'section'),
  paymentAging: w('PaymentAgingWidget', 'section'),
  inventoryByCategory: w('InventoryByCategoryWidget', 'section'),
};

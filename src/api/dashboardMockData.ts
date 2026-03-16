// Industry-specific mock data for dashboard widgets

function generateMonthlyTrend(months: number, baseValue: number, growthRate: number) {
  const data = [];
  let value = baseValue;
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    value = Math.round(value * (1 + growthRate + (Math.random() - 0.5) * 0.02));
    data.push({ name: label, value });
  }
  return data;
}

// ── ISP Mock Data ──
export function getIspMockData() {
  return {
    mrr: 847500,
    mrrTrend: { value: 4.2, isPositive: true },
    churnRate: 2.1,
    churnTrend: { value: 0.3, isPositive: false },
    connectionRequests: { pending: 12, approved: 8 },
    openTickets: 23,
    overduePayments: 45600,
    subscriberGrowth: generateMonthlyTrend(6, 1100, 0.03),
    areaDistribution: [
      { name: 'Downtown', value: 320 },
      { name: 'Suburb East', value: 280 },
      { name: 'Industrial Zone', value: 195 },
      { name: 'Old City', value: 240 },
      { name: 'Highway Area', value: 165 },
    ],
  };
}

// ── Retail Mock Data ──
export function getRetailMockData() {
  return {
    avgOrderValue: 680,
    avgOrderTrend: { value: 5.1, isPositive: true },
    itemsSoldToday: 47,
    topSelling: [
      { name: 'Wireless Earbuds', revenue: 28500, quantity: 42 },
      { name: 'Phone Cases', revenue: 18900, quantity: 63 },
      { name: 'USB-C Cable', revenue: 12400, quantity: 87 },
      { name: 'Screen Guard', revenue: 9800, quantity: 49 },
      { name: 'Power Bank', revenue: 8600, quantity: 17 },
    ],
    salesByCategory: [
      { name: 'Electronics', value: 45200 },
      { name: 'Accessories', value: 28900 },
      { name: 'Clothing', value: 18700 },
      { name: 'Stationery', value: 8400 },
      { name: 'General', value: 5200 },
    ],
  };
}

// ── Restaurant Mock Data ──
export function getRestaurantMockData() {
  return {
    ordersToday: 84,
    avgBillValue: 420,
    avgBillTrend: { value: 3.8, isPositive: true },
    tableOccupancy: 72,
    popularDishes: [
      { name: 'Butter Chicken', orders: 28, revenue: 11200 },
      { name: 'Paneer Tikka', orders: 22, revenue: 6600 },
      { name: 'Biryani', orders: 35, revenue: 10500 },
      { name: 'Dal Makhani', orders: 18, revenue: 3600 },
      { name: 'Naan Basket', orders: 42, revenue: 4200 },
    ],
    peakHours: [
      { hour: '11AM', orders: 8 },
      { hour: '12PM', orders: 18 },
      { hour: '1PM', orders: 24 },
      { hour: '2PM', orders: 15 },
      { hour: '6PM', orders: 12 },
      { hour: '7PM', orders: 22 },
      { hour: '8PM', orders: 28 },
      { hour: '9PM', orders: 20 },
      { hour: '10PM', orders: 10 },
    ],
  };
}

// ── Salon/Spa Mock Data ──
export function getSalonMockData() {
  return {
    avgServiceValue: 850,
    avgServiceTrend: { value: 2.5, isPositive: true },
    stylistUtilization: 78,
    clientRetention: 85,
    popularServices: [
      { name: 'Hair Cut & Style', bookings: 45, revenue: 22500 },
      { name: 'Full Body Spa', bookings: 18, revenue: 36000 },
      { name: 'Facial Treatment', bookings: 32, revenue: 25600 },
      { name: 'Manicure + Pedicure', bookings: 28, revenue: 14000 },
      { name: 'Hair Colouring', bookings: 15, revenue: 22500 },
    ],
  };
}

// ── Grocery Mock Data ──
export function getGroceryMockData() {
  return {
    avgBasketSize: 340,
    avgBasketTrend: { value: 1.8, isPositive: true },
    fastMovingItems: 12,
    categorySales: [
      { name: 'Staples', value: 42800 },
      { name: 'Dairy', value: 28500 },
      { name: 'Fruits & Veg', value: 22400 },
      { name: 'Snacks', value: 18900 },
      { name: 'Beverages', value: 15200 },
      { name: 'Personal Care', value: 8400 },
    ],
    wastageData: [
      { name: 'Week 1', value: 2400 },
      { name: 'Week 2', value: 1800 },
      { name: 'Week 3', value: 3100 },
      { name: 'Week 4', value: 2200 },
    ],
  };
}

// ── Healthcare Mock Data ──
export function getHealthcareMockData() {
  return {
    patientsToday: 32,
    prescriptionsFilled: 48,
    medicineAlerts: 7,
    appointmentSchedule: [
      { hour: '9AM', count: 4 },
      { hour: '10AM', count: 6 },
      { hour: '11AM', count: 5 },
      { hour: '12PM', count: 3 },
      { hour: '2PM', count: 5 },
      { hour: '3PM', count: 4 },
      { hour: '4PM', count: 6 },
      { hour: '5PM', count: 3 },
    ],
  };
}

// ── Gym Mock Data ──
export function getGymMockData() {
  return {
    activeMembers: 342,
    activeMembersTrend: { value: 6.2, isPositive: true },
    checkInsToday: 67,
    expiringMemberships: 18,
    newSignups: 12,
    newSignupsTrend: { value: 15, isPositive: true },
    peakHours: [
      { hour: '6AM', count: 28 },
      { hour: '7AM', count: 42 },
      { hour: '8AM', count: 35 },
      { hour: '9AM', count: 18 },
      { hour: '10AM', count: 12 },
      { hour: '5PM', count: 32 },
      { hour: '6PM', count: 45 },
      { hour: '7PM', count: 38 },
      { hour: '8PM', count: 22 },
    ],
  };
}

// ── Electronics Mock Data ──
export function getElectronicsMockData() {
  return {
    warrantyClaims: 8,
    repairJobs: 14,
    topByRevenue: [
      { name: 'iPhone 15', revenue: 125000, quantity: 5 },
      { name: 'Samsung S24', revenue: 98000, quantity: 4 },
      { name: 'MacBook Air', revenue: 85000, quantity: 2 },
      { name: 'AirPods Pro', revenue: 42000, quantity: 12 },
      { name: 'iPad 10th Gen', revenue: 38000, quantity: 3 },
    ],
  };
}

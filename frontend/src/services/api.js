import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/errorMessage';

function resolveBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;

  if (import.meta.env.PROD && !configuredUrl) {
    throw new Error('VITE_API_URL is required for production builds');
  }

  if (import.meta.env.PROD && /localhost|127\.0\.0\.1/.test(configuredUrl)) {
    throw new Error('VITE_API_URL must point to the production backend in production builds');
  }

  return (configuredUrl || 'http://localhost:5000').replace(/\/+$/, '');
}

const baseUrl = resolveBaseUrl();

const apiClient = axios.create({ baseURL: baseUrl, withCredentials: true });

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      toast.error(getErrorMessage(error));
      if (window.location.pathname !== '/login') window.location.href = '/login';
    } else if (error.response?.status >= 500 || error.code === 'ERR_NETWORK') {
      toast.error(getErrorMessage(error));
    }
    return Promise.reject(error);
  },
);

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
});

const baseQueryWithAuth = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    localStorage.removeItem('user');
    toast.error(getErrorMessage(result.error));
    if (window.location.pathname !== '/login') window.location.href = '/login';
  } else if (result.error?.status >= 500 || result.error?.status === 'FETCH_ERROR') {
    toast.error(getErrorMessage(result.error));
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Orders', 'Sales', 'Debts', 'Dashboard', 'Reports', 'Notifications', 'Settings', 'User', 'Backups'],
  endpoints: (builder) => ({
    login: builder.mutation({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) }),
    logout: builder.mutation({ query: () => ({ url: '/auth/logout', method: 'POST' }) }),
    me: builder.query({ query: () => '/users/me', providesTags: ['User'] }),
    updateMe: builder.mutation({ query: (body) => ({ url: '/users/me', method: 'PATCH', body }), invalidatesTags: ['User'] }),
    changePassword: builder.mutation({ query: (body) => ({ url: '/users/me/change-password', method: 'POST', body }) }),
    settings: builder.query({ query: () => '/settings', providesTags: ['Settings'] }),
    publicSettings: builder.query({ query: () => '/settings/public', providesTags: ['Settings'] }),
    updateSettings: builder.mutation({ query: (body) => ({ url: '/settings', method: 'PATCH', body }), invalidatesTags: ['Settings'] }),
    testGoogleSheets: builder.mutation({ query: () => ({ url: '/google-sheets/test', method: 'POST' }) }),
    dashboard: builder.query({ query: () => '/dashboard', providesTags: ['Dashboard'] }),
    adminNotifications: builder.query({ query: () => '/notifications/admin', providesTags: ['Notifications'] }),
    resolveNotification: builder.mutation({ query: (id) => ({ url: `/notifications/${id}/resolve`, method: 'PATCH' }), invalidatesTags: ['Notifications'] }),
    resolveSentNotifications: builder.mutation({ query: () => ({ url: '/notifications/sent/resolve', method: 'PATCH' }), invalidatesTags: ['Notifications'] }),
    orders: builder.query({ query: (params) => ({ url: '/orders', params }), providesTags: ['Orders'] }),
    createOrder: builder.mutation({ query: (body) => ({ url: '/orders', method: 'POST', body }), invalidatesTags: ['Orders', 'Dashboard', 'Notifications'] }),
    updateOrder: builder.mutation({ query: ({ id, ...body }) => ({ url: `/orders/${id}`, method: 'PATCH', body }), invalidatesTags: ['Orders', 'Dashboard', 'Notifications'] }),
    updateOrderStatus: builder.mutation({ query: ({ id, status }) => ({ url: `/orders/${id}/status`, method: 'PATCH', body: { status } }), invalidatesTags: ['Orders', 'Dashboard', 'Notifications'] }),
    deleteOrder: builder.mutation({ query: (id) => ({ url: `/orders/${id}`, method: 'DELETE' }), invalidatesTags: ['Orders', 'Dashboard', 'Notifications'] }),
    bulkDeleteOrders: builder.mutation({ query: (body) => ({ url: '/orders/bulk', method: 'DELETE', body }), invalidatesTags: ['Orders', 'Dashboard', 'Notifications'] }),
    payOrderDebt: builder.mutation({ query: ({ id, ...body }) => ({ url: `/orders/${id}/pay-debt`, method: 'POST', body }), invalidatesTags: ['Orders', 'Debts', 'Dashboard', 'Notifications'] }),
    paySaleDebt: builder.mutation({ query: ({ id, ...body }) => ({ url: `/sales/${id}/pay-debt`, method: 'POST', body }), invalidatesTags: ['Sales', 'Debts', 'Dashboard', 'Notifications'] }),
    sendOrderDebtReminder: builder.mutation({ query: (id) => ({ url: `/orders/${id}/send-debt-reminder`, method: 'POST' }), invalidatesTags: ['Notifications'] }),
    sendSaleDebtReminder: builder.mutation({ query: (id) => ({ url: `/sales/${id}/send-debt-reminder`, method: 'POST' }), invalidatesTags: ['Notifications'] }),
    sales: builder.query({ query: (params) => ({ url: '/sales', params }), providesTags: ['Sales'] }),
    createSale: builder.mutation({ query: (body) => ({ url: '/sales', method: 'POST', body }), invalidatesTags: ['Sales', 'Dashboard', 'Reports', 'Notifications'] }),
    updateSale: builder.mutation({ query: ({ id, ...body }) => ({ url: `/sales/${id}`, method: 'PATCH', body }), invalidatesTags: ['Sales', 'Dashboard', 'Reports', 'Notifications'] }),
    deleteSale: builder.mutation({ query: (id) => ({ url: `/sales/${id}`, method: 'DELETE' }), invalidatesTags: ['Sales', 'Dashboard', 'Reports', 'Notifications'] }),
    bulkDeleteSales: builder.mutation({ query: (body) => ({ url: '/sales/bulk', method: 'DELETE', body }), invalidatesTags: ['Sales', 'Dashboard', 'Reports', 'Notifications'] }),
    debts: builder.query({ query: (params) => ({ url: '/debts', params }), providesTags: ['Debts'] }),
    debtsStats: builder.query({ query: () => '/debts/stats', providesTags: ['Debts'] }),
    reportDaily: builder.query({ query: () => '/reports/daily', providesTags: ['Reports'] }),
    reportWeekly: builder.query({ query: () => '/reports/weekly', providesTags: ['Reports'] }),
    reportMonthly: builder.query({ query: () => '/reports/monthly', providesTags: ['Reports'] }),
    reportYearly: builder.query({ query: () => '/reports/yearly', providesTags: ['Reports'] }),
    reportOverview: builder.query({ query: () => '/reports/overview', providesTags: ['Reports'] }),
    backupFiles: builder.query({ query: () => '/backups/files', providesTags: ['Backups'] }),
    deletedRecords: builder.query({ query: () => '/backups/deleted-records', providesTags: ['Backups'] }),
    createBackup: builder.mutation({ query: () => ({ url: '/backups/create', method: 'POST' }), invalidatesTags: ['Backups'] }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useSettingsQuery,
  usePublicSettingsQuery,
  useUpdateSettingsMutation,
  useTestGoogleSheetsMutation,
  useDashboardQuery,
  useAdminNotificationsQuery,
  useResolveNotificationMutation,
  useResolveSentNotificationsMutation,
  useOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useBulkDeleteOrdersMutation,
  usePayOrderDebtMutation,
  usePaySaleDebtMutation,
  useSendOrderDebtReminderMutation,
  useSendSaleDebtReminderMutation,
  useSalesQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useBulkDeleteSalesMutation,
  useDebtsQuery,
  useDebtsStatsQuery,
  useReportDailyQuery,
  useReportWeeklyQuery,
  useReportMonthlyQuery,
  useReportYearlyQuery,
  useReportOverviewQuery,
  useBackupFilesQuery,
  useDeletedRecordsQuery,
  useCreateBackupMutation,
} = api;

export default apiClient;

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ordersApi = createApi({
  reducerPath: "ordersApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://onza-api.ibm.kg/api/order",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.auth?.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["DeskRequests",],
  endpoints: (builder) => ({
    scanClientQr: builder.mutation({
      query: (qrCode) => ({
        url: "/smart/issue-token-order",
        method: "POST",
        body: {
          token: qrCode
        },
      }),
      invalidatesTags: ['DeskRequests'],
    }),
    createPickupRequest: builder.mutation({
      query: (parcelIds) => ({
        url: "/smart/pickup-request",
        method: "POST",
        body: {
          token: parcelIds,
        },
      }),
      invalidatesTags: ["DeskRequests"],
    }),
    getDeskRequests: builder.query({
      query: ({ deskId }) => ({
        url: "/smart/desk-requests",
        method: "GET",
      }),
      providesTags: ["DeskRequests"],
    }),
    getActivePickupSession: builder.query({
      query: () => ({
        url: `/get/issue-token`,
      }),
      invalidatesTags: ["DeskRequests"],
    }),
    generatePickupQr: builder.mutation({
      query: (userGuid) => ({
        url: "/generate-pvz",
        method: "POST",
        body: { user_guid: userGuid },
      }),
      invalidatesTags: ["DeskRequests"],
    }),
    issueOrder: builder.mutation({
      query: ({ qrToken, userGuid }) => ({
        url: "/smart/issue-order",
        method: "POST",
        body: { token: qrToken },
      }),
      invalidatesTags: ["DeskRequests"],
    }),
    getIssueOrders: builder.query({
      query: (token) => ({
        url: `/get/orders-by-token`,
        params: { token },
      }),
      providesTags: ["DeskRequests"],
    }),
  }),
});

export const {
  useScanClientQrMutation,
  useCreatePickupRequestMutation,
  useGetDeskRequestsQuery,
  useGeneratePickupQrMutation,
  useIssueOrderMutation,
  useGetActivePickupSessionQuery,
  useLazyGetIssueOrdersQuery,
  useGetIssueOrdersQuery
} = ordersApi;

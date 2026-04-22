import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const ordersApi = createApi({
  reducerPath: "ordersApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://onza-api.ibm.kg/api/order",
    prepareHeaders: (headers, { getState }) => {
      const token = getState()?.auth?.token;
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["DeskRequests", "ClientParcels", "PickupQr"],
  endpoints: (builder) => ({
    scanClientQr: builder.mutation({
      query: (qrCode) => ({
        url: "/smart/scan-qr",
        method: "POST",
        body: {
          token: qrCode
        },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "ClientParcels", id: arg?.qrCode }],
    }),
    createPickupRequest: builder.mutation({
      query: ({ user, parcelIds }) => ({
        url: "/smart/pickup-request",
        method: "POST",
        body: {
          user_guid: user?.id,
          parcel_ids: parcelIds,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "DeskRequests", id: arg.user.deskId }],
    }),
    getDeskRequests: builder.query({
      query: ({ deskId }) => ({
        url: "/smart/desk-requests",
        method: "GET",
        params: { desk_id: deskId },
      }),
      providesTags: (_result, _error, arg) => [{ type: "DeskRequests", id: arg.deskId }],
    }),
    getActivePickupSession: builder.query({
      query: () => ({
        url: `/get/issue-token`,
      }),
      invalidatesTags: ["order"],
    }),
    generatePickupQr: builder.mutation({
      query: (userGuid) => ({
        url: "/generate-pvz",
        method: "POST",
        body: { user_guid: userGuid },
      }),
      invalidatesTags: ["PickupQr"],
    }),
    issueOrder: builder.mutation({
      query: ({ qrToken, userGuid }) => ({
        url: "/smart/issue-order",
        method: "POST",
        body: { token: qrToken },
      }),
      invalidatesTags: ["PickupQr", "DeskRequests", "ClientParcels"],
    }),
    getIssueOrders: builder.query({
      query: (token) => ({
        url: `/get/orders-by-token`,
        params: { token },
      }),
      invalidatesTags: ["order"],
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
  useGetIssueOrdersQuery,
} = ordersApi;

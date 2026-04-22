import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://onza-api.ibm.kg/api/admin/auth",
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: ({ login, password }) => ({
        url: "/login",
        method: "POST",
        body: { login, password },
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;

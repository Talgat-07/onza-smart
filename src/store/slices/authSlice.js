import { createSlice } from "@reduxjs/toolkit";

const STORAGE_KEY = "onza_auth";

const getInitialState = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(rawData);
    return {
      token: parsed?.token ?? null,
      user: parsed?.user ?? null,
    };
  } catch {
    return { token: null, user: null };
  }
};

const persistState = (state) => {
  if (!state.token) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      token: state.token,
      user: state.user,
    }),
  );
};

const authSlice = createSlice({
  name: "auth",
  initialState: getInitialState(),
  reducers: {
    setCredentials(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      persistState(state);
    },
    logout(state) {
      state.token = null;
      state.user = null;
      persistState(state);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const addAuth = setCredentials;
export default authSlice.reducer;

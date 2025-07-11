import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import API_BASE_URL from "../config";

export const fetchClientSettings = createAsyncThunk(
  "clientSettings/fetchClientSettings",
  async (clientID: number) => {
    const response = await axios.get(
      `${API_BASE_URL}/api/auth/settings/${clientID}`
    );
    return response.data; // return the fetched settings
  }
);

const clientSettingsSlice = createSlice({
  name: "clientSettings",
  initialState: {
    settings: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchClientSettings.rejected, (state, action) => {
        state.loading = false;
      });
  },
});

export default clientSettingsSlice.reducer;

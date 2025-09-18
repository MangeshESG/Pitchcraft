// src/slices/clientSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ClientState {
  clientId: string | null;
}

const initialState: ClientState = {
  clientId: null,
};

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {
    setClientId: (state, action: PayloadAction<string>) => {
      state.clientId = action.payload;
    },
    clearClientId: (state) => {
      state.clientId = null;
    },
  },
});

export const { setClientId, clearClientId } = clientSlice.actions;
export default clientSlice.reducer;

// slices/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  token: string | null;
  username: string | null;
  userId: string | null;
  userRole: string | null;
  firstName: string | null;
  lastName: string | null;
  ipAddress?: string | null;              // NEW
  browserName?: string | null;            // NEW
  browserVersion?: string | null;         // NEW
}

const initialState: AuthState = {
  token: null,
  username: null,
  userId: null,
  userRole: null,
  firstName: null,
  lastName: null,
  ipAddress: null,       // NEW
  browserName: null,     // NEW
  browserVersion: null,  // NEW
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    clearToken: (state) => {
      state.token = null;
      state.username = null;
      state.userId = null;
      state.firstName = null;
      state.lastName = null;
    },
    saveUserName: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
    },
    saveUserRole: (state, action: PayloadAction<string>) => {
      state.userRole = action.payload;
    },
    saveUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    },
    saveFirstName: (state, action: PayloadAction<string>) => {
      state.firstName = action.payload;
    },
    saveLastName: (state, action: PayloadAction<string>) => {
      state.lastName = action.payload;
    },
    
    clearUsername: (state) => {
      state.username = null;
    },

    saveLoginDeviceInfo: (
      state,
      action: PayloadAction<{
        ipAddress: string;
        browserName: string;
        browserVersion: string;
      }>
    ) => {
      state.ipAddress = action.payload.ipAddress;
      state.browserName = action.payload.browserName;
      state.browserVersion = action.payload.browserVersion;
    },
  },
});

export const { setToken, clearToken, saveUserName, saveUserRole, saveUserId,saveFirstName,saveLoginDeviceInfo ,
  saveLastName, clearUsername } =
  authSlice.actions;
export default authSlice.reducer;

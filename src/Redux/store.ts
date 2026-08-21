import { configureStore } from "@reduxjs/toolkit";
import authReducer, { AuthState } from "../slices/authSLice";
import storage from "redux-persist/lib/storage"; // Defaults to localStorage
import { persistReducer, persistStore } from "redux-persist";
import type { PersistConfig } from "redux-persist";
import clientSettingsReducer from "../slices/clientSettingsSlice";
import clientReducer from "../slices/clientSlice"; // adjust path
import panelReducer from "../slices/panelSlice";

// Typed explicitly: without the AuthState generic, redux-persist's older
// signature cannot infer the state from redux 5's Reducer type and `state.auth`
// collapses to `PersistPartial`, hiding every auth field from RootState.
const persistConfig: PersistConfig<AuthState> = {
  key: "auth",
  storage,
};

const persistedAuthReducer = persistReducer<AuthState>(persistConfig, authReducer);

const store = configureStore({
  reducer: {
        clientSettings: clientSettingsReducer,
         client: clientReducer,
         panel: panelReducer,
    auth: persistedAuthReducer, // Use persisted reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"], // Ignore redux-persist actions
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const persistor = persistStore(store); // Persistor instance

export default store;


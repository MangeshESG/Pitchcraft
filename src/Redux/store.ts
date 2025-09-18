import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../slices/authSLice";
import storage from "redux-persist/lib/storage"; // Defaults to localStorage
import { persistReducer, persistStore } from "redux-persist";
import clientSettingsReducer from "../slices/clientSettingsSlice";
import clientReducer from "../slices/clientSlice"; // adjust path

const persistConfig = {
  key: "auth",
  storage,
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
        clientSettings: clientSettingsReducer,
         client: clientReducer,

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


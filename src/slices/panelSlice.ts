import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PanelState {
  activePanel: string | null;
}

const initialState: PanelState = {
  activePanel: null,
};

const panelSlice = createSlice({
  name: "panel",
  initialState,
  reducers: {
    openPanel: (state, action: PayloadAction<string>) => {
      state.activePanel = action.payload;
    },
    closePanel: (state) => {
      state.activePanel = null;
    },
  },
});

export const { openPanel, closePanel } = panelSlice.actions;
export default panelSlice.reducer;
import React, { createContext, useContext } from "react";

/**
 * Whether the grid is showing each cell's detail inline instead of on hover.
 *
 * The toggle lives in the table's toolbar but the detail belongs to the cells,
 * which are rendered by formatters the table knows nothing about — a context is
 * the only way the two can meet without every grid threading a flag through
 * every formatter it builds.
 *
 * Off is the default everywhere: the expanded rows are for working through a
 * list of corrections, the collapsed ones for scanning four hundred contacts.
 */
const GridDetailModeContext = createContext(false);

export const GridDetailModeProvider: React.FC<{
  value: boolean;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <GridDetailModeContext.Provider value={value}>
    {children}
  </GridDetailModeContext.Provider>
);

export const useGridDetailMode = (): boolean => useContext(GridDetailModeContext);

export default GridDetailModeContext;

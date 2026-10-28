import React, { createContext, useContext } from "react";

/**
 * How much of each cell's detail the grid writes into the column instead of
 * leaving it on hover.
 *
 * - "off"        — detail on hover only, the default everywhere.
 * - "all"        — every cell expanded.
 * - "updated"    — only the scores a person has overruled by hand.
 * - "incomplete" — only the scores short of 100; a clean 100 stays a number.
 *
 * The three filters exist because the expanded layout is for working through
 * corrections, and on a well-checked list almost every card it opens says
 * "no issues were reported" — the rows actually worth reading are the ones
 * somebody changed, or the ones that did not come back clean.
 */
export type GridDetailMode = "off" | "all" | "updated" | "incomplete";

/**
 * The control lives in the table's toolbar but the detail belongs to the
 * cells, which are rendered by formatters the table knows nothing about — a
 * context is the only way the two can meet without every grid threading a
 * flag through every formatter it builds.
 */
const GridDetailModeContext = createContext<GridDetailMode>("off");

export const GridDetailModeProvider: React.FC<{
  value: GridDetailMode;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <GridDetailModeContext.Provider value={value}>
    {children}
  </GridDetailModeContext.Provider>
);

/**
 * Which cells are expanded. A cell decides for itself whether it is one of
 * them — only the cell knows its own score and whether a person set it.
 */
export const useGridDetailMode = (): GridDetailMode => useContext(GridDetailModeContext);

/**
 * Whether the grid is in a detail mode at all, for the containers that lay
 * cells out but have no score of their own to filter on.
 */
export const useGridDetailOn = (): boolean => useContext(GridDetailModeContext) !== "off";

export default GridDetailModeContext;

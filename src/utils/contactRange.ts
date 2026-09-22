// UI contact numbers are one-based and both ends are inclusive.
export const parseContactRange = (from: string, to: string, count: number) => {
  const start = Number(from);
  const end = Number(to);
  if (!from.trim() || !to.trim() || !Number.isInteger(start) || !Number.isInteger(end)) {
    throw new Error("Enter whole contact numbers for From and To");
  }
  if (start < 1 || end < start || end > count) {
    throw new Error(`Choose a range from 1 to ${count}, with To at least equal to From`);
  }
  return { startIndex: start - 1, endIndex: end - 1 };
};

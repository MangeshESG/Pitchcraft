export const isReplyOrFollowUpCategory = (category?: string | null): boolean => {
  const normalized = (category || "")
    .toLowerCase()
    .replace(/[\s\u002d\u2013\u2014]+/g, "");

  return ["emailfollowup", "emailreply", "followup", "reply"].includes(normalized);
};

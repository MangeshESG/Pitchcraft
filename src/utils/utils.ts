export const sortByAscending = (data: any) => {
  return [...data].sort((a, b) => {
    if (a.title < b.title) return -1;
    if (a.title > b.title) return 1;
    return a.body.localeCompare(b.body);
  });
};

export const copyToClipboard = (value: string): Promise<boolean> => {
  return new Promise((res, rej) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        res(true);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        rej(false);
      });
  });
};
export const generateSystemPrompt = (
  scrappedText: string,
  companyName: string,
  jobTitle: string,
  name: string,
  outputSummary: string
): string => {
  let systemPrompt = `
        You are tasked with creating a pitch for companies in an email format. 
        The pitch should maintain consistent formatting, including appropriate paragraph breaks and spacing throughout the pitch. 
        Avoid making the pitch sound like an advertisement. 
        If you are unsure about any dynamic values such as the company location, job title, or any other specific detail required to create the pitch, return an empty string ('') instead of generating a response. 
        Additionally, if you cannot format the pitch according to the specified guidelines or ensure proper line spacing and paragraph breaks, return an empty string ('').
        Avoid bullet points and asterisks. Ensure that the final output is well-structured and easy to read. If you don't have enough data about the company, look for it online.
    `;

  if (scrappedText && scrappedText.trim() !== "") {
    systemPrompt += `\n\nFollowing is the data scrapped from ${companyName}'s website:\n${scrappedText}`;
    systemPrompt += `\nUse the information to tailor your response to ${companyName}.`;
    systemPrompt += `\nUse the information to tailor your response to ${name} with job title ${jobTitle}. `;
    systemPrompt += `\nReplace {search_output_summary} in the prompt with ${outputSummary}`;
  } else {
    systemPrompt += `\n\nTailor your response to ${companyName}.`;
    systemPrompt += `\nTailor your response to ${name} with job title ${jobTitle}. `;
    systemPrompt += `\nReplace {search_output_summary} in the prompt with ${outputSummary}`;
  }

  return systemPrompt;
};

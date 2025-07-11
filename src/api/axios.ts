import axios from "axios";
import { nanoid } from "nanoid";

export const getPrompts = async (url: string): Promise<any[]> => {
  try {
    const response = await axios.get(url); // No token needed
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
};

export const createPrompts = async (url: string, data: any): Promise<any> => {
  if (!data?.title || !data?.body) {
    console.error("Invalid data sent to API:", data);
    return null;
  }

  try {
    const response = await axios.post(
      url,
      {
        title: data.title,
        body: data.body,
        userId: nanoid(),
        id: nanoid(),
      },
      {
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error creating prompt:", error);
    return null;
  }
};

export const deletePrompt = async (
  url: string,
  id: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${url}${id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete prompt");

    return true;
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return false;
  }
};

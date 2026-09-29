import { postAsSuperAdmin } from "./superAdminRequest";

/**
 * Creating a client account from the admin page, for onboarding someone
 * without walking them through sign-up. The API gives the new account the
 * default custom fields and a Basic subscription, exactly as sign-up does.
 */

export interface AdminCreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  companyName: string;
  jobTitle: string;
}

export interface AdminCreatedUser {
  userId: number;
}

export const createUserByAdmin = async (
  input: AdminCreateUserInput,
): Promise<AdminCreatedUser> => {
  const json = await postAsSuperAdmin<any>(
    "/api/login/admin/create-user",
    input,
    "Could not create the account.",
  );

  return { userId: Number(json?.userId ?? json?.UserId ?? 0) };
};

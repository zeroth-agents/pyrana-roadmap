import { auth } from "../../../auth";

export interface SessionUser {
  id: string;
  name: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!process.env.AUTH_MICROSOFT_ENTRA_ID_ID) {
    return { id: "dev-user", name: "Dev User" };
  }
  const session = await auth();
  if (!session?.user?.id || !session.user.name) return null;
  return { id: session.user.id, name: session.user.name };
}

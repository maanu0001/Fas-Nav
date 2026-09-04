import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Vergleicht auch dann, wenn kein Hash existiert, um Timing-Angriffe
 * zur Benutzer-Enumeration zu erschweren.
 */
const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO.7nQe1p2sWNjHkPB7t3Lz1yKr8p1t2y";

export async function verifyPasswordSafe(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

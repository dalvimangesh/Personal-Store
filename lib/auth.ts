import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'default-secret-key-change-me';
const encodedKey = new TextEncoder().encode(secretKey);

export async function createSession(payload: any, expiresIn: string = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

export async function verifySession(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    return null;
  }
}


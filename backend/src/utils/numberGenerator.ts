import crypto from 'crypto';

export function generateSequenceNumber(prefix: string): string {
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${prefix}-${new Date().getFullYear()}-${timestamp}-${randomSuffix}`;
}

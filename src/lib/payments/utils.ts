export function getAppBaseUrl() {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'http://localhost:3000';
}


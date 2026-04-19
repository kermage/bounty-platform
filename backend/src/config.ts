export const config = {
  port: Number(process.env.PORT ?? 3000),
  network: process.env.NETWORK ?? 'Preview',
  database: {
    url: process.env.DATABASE_URL ?? '',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
    jwtExpiry: process.env.JWT_EXPIRY ?? '7d',
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  blockchain: {
    blockfrostApiKey: process.env.BLOCKFROST_API_KEY ?? '',
  },
};

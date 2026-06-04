function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

export function validateEnv() {
  const NODE_ENV = process.env.NODE_ENV ?? "development";
  if (NODE_ENV === "production") {
    required("JWT_SECRET");
    required("CORS_ORIGIN");
    required("POSTGRES_PASSWORD");
  }
  return {
    NODE_ENV,
    PORT: parseInt(process.env.PORT ?? "3001", 10),
  };
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET ?? "dev-insecure-secret-change-me";
}

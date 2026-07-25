export type EnvStatus = {
  ok: boolean;
  missing: string[];
  placeholders: string[];
};

const requiredEnv = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "APP_ENV"] as const;

export function getEnvStatus(): EnvStatus {
  const missing: string[] = [];
  const placeholders: string[] = [];

  for (const key of requiredEnv) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else if (value.includes("replace-with")) {
      placeholders.push(key);
    }
  }

  return {
    ok: missing.length === 0 && placeholders.length === 0,
    missing,
    placeholders
  };
}

export function getPublicAppEnvironment() {
  return process.env.APP_ENV || process.env.NODE_ENV || "unknown";
}

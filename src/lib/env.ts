const REQUIRED_ENV_VARS = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

/**
 * Fails fast with a clear message if a required environment variable is
 * missing, instead of letting the app start in a broken or insecure state
 * (e.g. NextAuth silently signing sessions with a hardcoded fallback
 * secret). Imported once for its side effect by src/lib/prisma.ts and
 * src/lib/auth.ts, so it runs before either dependency is used.
 */
function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. Copy .env.example to .env and set real values before starting the app.`
    );
  }
}

validateEnv();

import { z } from 'zod';

// Treats an empty or missing env var as undefined — for optional external services.
const optionalStr = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_TYPE: z.enum(['postgres', 'sqlite']).default('postgres'),
  DATABASE_URL: z.string().min(1),

  SESSION_COOKIE_NAME: z.string().min(1).default('kawal_session'),
  SESSION_INACTIVITY_DAYS: z.coerce.number().int().positive().default(30),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),

  GOOGLE_OAUTH_CLIENT_ID: optionalStr,
  GOOGLE_OAUTH_CLIENT_SECRET: optionalStr,
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),

  WEB_ORIGIN: z.string().url(),

  GEMINI_API_KEY: optionalStr,

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.') || '<root>'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

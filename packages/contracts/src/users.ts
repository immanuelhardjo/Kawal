import { z } from 'zod';

export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  pictureUrl: z.string().url().nullable(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

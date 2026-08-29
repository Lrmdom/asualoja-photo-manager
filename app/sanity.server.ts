import { createClient } from '@sanity/client';
import { z } from 'zod';

const schema = z.object({
  SANITY_PROJECT_ID: z.string(),
  SANITY_DATASET: z.string(),
  SANITY_TOKEN: z.string().optional(),
});

const env = schema.parse(process.env);

export const sanityClient = createClient({
  projectId: env.SANITY_PROJECT_ID,
  dataset: env.SANITY_DATASET,
  token: env.SANITY_TOKEN,
  useCdn: false, // Required for write operations
  apiVersion: '2024-05-01',
});

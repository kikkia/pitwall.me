import { z } from 'zod';

export const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const LayoutsSchema = z.record(z.string(), z.array(z.any()));

export const SettingsSchema = z.object({
  websocketDelay: z.number().optional(),
  gridFloat: z.boolean().optional(),
  pages: z.array(PageSchema).optional(),
  activePageId: z.string().optional(),
  layouts: LayoutsSchema.optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
import { z } from "zod";

export const ColumnConfigSchema = z.object({
  attribute: z.string().min(1),
  width: z.number().int().positive().optional(),
  label: z.string().min(1).optional(),
});

export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;

export const ColumnsConfigSchema = z.record(
  z.string(),
  z.array(ColumnConfigSchema),
);

export type ColumnsConfig = z.infer<typeof ColumnsConfigSchema>;

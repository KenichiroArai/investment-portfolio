import { z } from "zod";

const portfolioKindSchema = z.enum(["ideco", "nisa", "taxable", "satellite"]);

export const createPortfolioSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  kind: portfolioKindSchema,
});

export const updatePortfolioSchema = z.object({
  name: z.string().min(1).max(256),
  kind: portfolioKindSchema,
});

export const createClassificationSchemeSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
});

export const updateClassificationSchemeSchema = z.object({
  name: z.string().min(1).max(256),
});

export const createClassificationValueSchema = z.object({
  code: z.string().min(1).max(64),
  name: z.string().min(1).max(256),
  sortOrder: z.number().int().optional(),
});

export const updateClassificationValueSchema = z.object({
  name: z.string().min(1).max(256),
  sortOrder: z.number().int(),
});

export const createInstrumentSchema = z.object({
  name: z.string().min(1).max(512),
  instrumentType: z.string().min(1).max(64).optional(),
  currency: z.string().length(3).optional(),
  externalId: z.string().max(128).nullable().optional(),
});

export const updateInstrumentSchema = z.object({
  name: z.string().min(1).max(512),
  instrumentType: z.string().min(1).max(64).optional(),
  currency: z.string().length(3).optional(),
  externalId: z.string().max(128).nullable().optional(),
});

export const setInstrumentClassificationsSchema = z.object({
  classificationValueIds: z.array(z.string().uuid()),
});

export const holdingLineMetricInputSchema = z.object({
  code: z.string().min(1).max(64),
  integerValue: z.number().int().nullable().optional(),
  realValue: z.number().nullable().optional(),
  textValue: z.string().max(512).nullable().optional(),
});

export const portfolioSnapshotMetricInputSchema = z.object({
  code: z.string().min(1).max(64),
  integerValue: z.number().int().nullable().optional(),
  realValue: z.number().nullable().optional(),
  textValue: z.string().max(512).nullable().optional(),
});

export const holdingLineInputSchema = z.object({
  instrumentId: z.string().uuid(),
  quantity: z.number().positive(),
  marketValueMinor: z.number().int().nonnegative(),
  bookValueMinor: z.number().int().nonnegative().nullable().optional(),
  sortOrder: z.number().int().positive().nullable().optional(),
  metrics: z.array(holdingLineMetricInputSchema).optional(),
});

export const replaceCurrentSnapshotSchema = z.object({
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lines: z.array(holdingLineInputSchema),
  metrics: z.array(portfolioSnapshotMetricInputSchema).optional(),
});

export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type CreateClassificationSchemeInput = z.infer<
  typeof createClassificationSchemeSchema
>;
export type UpdateClassificationSchemeInput = z.infer<
  typeof updateClassificationSchemeSchema
>;
export type CreateClassificationValueInput = z.infer<
  typeof createClassificationValueSchema
>;
export type UpdateClassificationValueInput = z.infer<
  typeof updateClassificationValueSchema
>;
export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
export type UpdateInstrumentInput = z.infer<typeof updateInstrumentSchema>;
export type SetInstrumentClassificationsInput = z.infer<
  typeof setInstrumentClassificationsSchema
>;
export type ReplaceCurrentSnapshotInput = z.infer<
  typeof replaceCurrentSnapshotSchema
>;

export const snapshotTrendsQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type SnapshotTrendsQueryInput = z.infer<typeof snapshotTrendsQuerySchema>;

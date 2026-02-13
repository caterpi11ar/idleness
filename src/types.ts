import type { ZodType } from 'zod'

export interface ViperOptions<TSchema extends ZodType = ZodType> {
  schema?: TSchema
  keyDelimiter?: string
}

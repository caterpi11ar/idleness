import type { ZodType } from 'zod'
import type { ViperOptions } from './types'
import { Viper } from './viper'

export type { ViperOptions } from './types'
export { Viper } from './viper'

export function createViper<T extends ZodType>(options?: ViperOptions<T>): Viper<T> {
  return new Viper(options)
}

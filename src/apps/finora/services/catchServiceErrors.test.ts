import { describe, expect, it } from 'vitest'
import { catchServiceErrors } from './catchServiceErrors'

describe('catchServiceErrors', () => {
  it('passes a result through untouched', async () => {
    await expect(catchServiceErrors(async () => ({ data: 42, error: null }))).resolves.toEqual({
      data: 42,
      error: null,
    })
  })

  it('turns a thrown Error into an error result', async () => {
    const result = await catchServiceErrors(async () => {
      throw new RangeError('Amount 10.005 is not a finite value with at most 2 decimals')
    })

    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(RangeError)
  })

  it('wraps anything else that is thrown in an Error', async () => {
    const result = await catchServiceErrors(async () => {
      throw 'boom'
    })

    expect(result.error).toEqual(new Error('boom'))
  })
})

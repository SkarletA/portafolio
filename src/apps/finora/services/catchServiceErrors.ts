// Money arithmetic throws a RangeError for an amount with more than 2 decimals
// (docs/adr/005-money-arithmetic-in-the-client.md). Services report failures as
// `{ data: null, error }`, so the hooks that call them can show their error
// state; without this a throw would escape as an unhandled rejection and leave
// the screen loading.
export async function catchServiceErrors<Result extends { data: unknown; error: unknown }>(
  load: () => Promise<Result>
): Promise<Result | { data: null; error: Error }> {
  try {
    return await load()
  } catch (caught) {
    return { data: null, error: caught instanceof Error ? caught : new Error(String(caught)) }
  }
}

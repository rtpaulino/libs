export function excludeNil<T>(obj: T): obj is NonNullable<T> {
  return !!obj;
}

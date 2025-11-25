export function plural(val: number) {
  return Math.abs(Math.trunc(val)) === 1 ? '' : 's';
}

export function join(parts: string[]) {
  if (parts.length === 0) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return (
    parts.slice(0, parts.length - 1).join(', ') +
    ' and ' +
    parts[parts.length - 1]
  );
}

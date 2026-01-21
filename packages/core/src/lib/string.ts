export function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }
  return Array.from(duplicates);
}

/**
 * Truncates a string to a maximum length, removing newlines and adding ellipsis if needed
 * @param text - The input string to truncate
 * @param maxLength - The maximum length (default: 80)
 * @returns The truncated string with ellipsis if it was shortened
 */
export function truncateWithEllipsis(
  text: string,
  maxLength: number = 80,
): string {
  // Remove newlines and replace with spaces
  const cleanedText = text.replace(/\n/g, ' ').trim();

  // If the text is shorter than or equal to maxLength, return as is
  if (cleanedText.length <= maxLength) {
    return cleanedText;
  }

  // Truncate and add ellipsis
  return cleanedText.substring(0, maxLength - 3) + '...';
}

/**
 * Extracts content between two strings from the input text, including the start and end strings
 * @param input - The input string (can be multiline)
 * @param startString - The string that marks the beginning of the content to extract
 * @param endString - The string that marks the end of the content to extract
 * @returns The extracted content including startString and endString
 * @throws Error if startString or endString is not found in the input
 */
export function extractBetween(
  input: string,
  startString: string,
  endString: string,
): string {
  if (startString === '') {
    throw new Error('Start string "" not found in input');
  }

  if (endString === '') {
    throw new Error('End string "" not found in input after start string');
  }

  const startIndex = input.indexOf(startString);
  if (startIndex === -1) {
    throw new Error(`Start string "${startString}" not found in input`);
  }

  const contentStart = startIndex + startString.length;
  const endIndex = input.indexOf(endString, contentStart);
  if (endIndex === -1) {
    throw new Error(
      `End string "${endString}" not found in input after start string`,
    );
  }

  return input.substring(startIndex, endIndex + endString.length);
}

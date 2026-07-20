import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Class-name composition helper used by shadcn/ui primitives.
 * Combines `clsx` (conditional joining) with `tailwind-merge`
 * (de-duplicates conflicting Tailwind utilities, last write wins).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

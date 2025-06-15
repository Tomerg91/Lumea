import crypto from 'crypto';

export type MaskStrategy = 'redact' | 'hash' | 'partial' | 'none';

export interface MaskOptions {
  /** How many characters to show at the start (for 'partial' strategy) */
  visiblePrefix?: number;
  /** How many characters to show at the end (for 'partial' strategy) */
  visibleSuffix?: number;
  /** Hash algorithm for 'hash' strategy (default sha256) */
  hashAlgorithm?: string;
}

export interface FieldMaskRule {
  /** Dot-notation path in the object */
  path: string;
  strategy: MaskStrategy;
  options?: MaskOptions;
}

/**
 * Apply masking/redaction rules to a plain JS object (recursively clones object).
 * The original object is not mutated.
 */
export function applyMask<T extends Record<string, any>>(data: T, rules: FieldMaskRule[]): T {
  const clone: any = JSON.parse(JSON.stringify(data));
  for (const rule of rules) {
    const segments = rule.path.split('.');
    let target: any = clone;
    for (let i = 0; i < segments.length - 1 && target != null; i++) {
      target = target[segments[i]];
    }
    if (target == null) continue;
    const key = segments[segments.length - 1];
    if (!(key in target)) continue;

    const value = target[key];
    target[key] = maskValue(value, rule.strategy, rule.options);
  }
  return clone;
}

function maskValue(value: any, strategy: MaskStrategy, options: MaskOptions = {}): any {
  if (value == null) return value;
  switch (strategy) {
    case 'redact':
      return '[REDACTED]';
    case 'hash':
      return crypto.createHash(options.hashAlgorithm || 'sha256').update(String(value)).digest('hex');
    case 'partial':
      return partialMask(String(value), options.visiblePrefix ?? 0, options.visibleSuffix ?? 4);
    case 'none':
    default:
      return value;
  }
}

function partialMask(str: string, visiblePrefix: number, visibleSuffix: number) {
  if (str.length <= visiblePrefix + visibleSuffix) {
    return '*'.repeat(str.length);
  }
  const prefix = str.substring(0, visiblePrefix);
  const suffix = str.substring(str.length - visibleSuffix);
  const hidden = '*'.repeat(str.length - visiblePrefix - visibleSuffix);
  return `${prefix}${hidden}${suffix}`;
}

/**
 * Convenience helper: given user consent flag, either return value as-is or redact.
 */
export function redactIfNoConsent<T>(value: T, hasConsent: boolean): T | string {
  return hasConsent ? value : '[REDACTED]';
} 
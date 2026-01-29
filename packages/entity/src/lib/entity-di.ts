import {
  EntityDIFallbackFn,
  EntityDIProvider,
  EntityDIToken,
} from './types.js';

/**
 * Dependency Injection container for Entities
 * This is a simple implementation, it does not cache instances.
 * When using "factory", it will always be called.
 */
export class EntityDI {
  private static providers: EntityDIProvider[] = [];

  private static fallbackFn: EntityDIFallbackFn | undefined = undefined;

  static configure({
    providers,
    fallbackFn,
  }: {
    providers?: EntityDIProvider[];
    fallbackFn?: EntityDIFallbackFn;
  }) {
    if (providers) {
      EntityDI.providers = providers;
    }
    if (fallbackFn) {
      EntityDI.fallbackFn = fallbackFn;
    }
  }

  static async get<T>(token: EntityDIToken<T>): Promise<T> {
    const provider = EntityDI.providers.find((p) => p.provide === token);
    if (provider) {
      if (provider.useValue !== undefined) {
        return provider.useValue;
      } else if (provider.useFactory) {
        return await provider.useFactory();
      }
    }

    if (EntityDI.fallbackFn) {
      const result = await EntityDI.fallbackFn(token);
      if (result) {
        return result;
      }
    }

    const tokenName =
      (typeof token === 'object' || typeof token === 'function') &&
      'name' in token
        ? token.name
        : String(token);

    throw new Error(`No provider found for token: ${tokenName}`);
  }
}

import { Inject } from '@nestjs/common';
import { RedlockService } from './redlock.service.js';

export function Redlock<T extends (...args: never[]) => unknown>(
  key: string | string[],
  ttl = 100,
): (
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>,
  ) => {
    const keys = getKeys(key);
    // Guard against undefined descriptor
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(
        `@Redlock can only be applied to methods. Property ${String(propertyKey)} is not a method.`,
      );
    }

    Inject(RedlockService)(target, RedlockService.name);

    const originalMethod = descriptor.value;

    // Create wrapper method (always async since redlock operations are async)
    const wrappedMethod = async function (
      this: Record<string, unknown>,
      ...args: Parameters<T>
    ) {
      const redlockService = this[RedlockService.name] as
        | RedlockService
        | undefined;

      if (!redlockService) {
        throw new Error(
          `RedlockService not found. Ensure the RedlockModule is imported in the same module as the class using @Redlock or isGlobal is true`,
        );
      }

      return await redlockService.withLock(keys, ttl, () =>
        Promise.resolve(originalMethod.apply(this, args)),
      );
    };

    // Metadata preservation
    // 1. Preserve the original method name
    Object.defineProperty(wrappedMethod, 'name', {
      value: originalMethod.name,
      configurable: true,
    });

    // 2. Preserve the original method's parameter count (arity)
    Object.defineProperty(wrappedMethod, 'length', {
      value: originalMethod.length,
      configurable: true,
    });

    // 3. Copy prototype properties if needed
    Object.setPrototypeOf(wrappedMethod, Object.getPrototypeOf(originalMethod));

    // 4. Preserve custom properties
    const originalPropertyNames = Object.getOwnPropertyNames(originalMethod);
    for (const key of originalPropertyNames) {
      if (key !== 'name' && key !== 'length' && key !== 'prototype') {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(
            originalMethod,
            key,
          );
          if (descriptor) {
            Object.defineProperty(wrappedMethod, key, descriptor);
          }
        } catch {
          // 5. Some properties might not be configurable, skip them
          console.warn(`Could not copy property ${key} from original method`);
        }
      }
    }

    descriptor.value = wrappedMethod as T;
    return descriptor;
  };
}

function getKeys(key: string | string[]): string[] {
  if (Array.isArray(key)) {
    return key;
  } else if (typeof key === 'string') {
    return [key];
  } else {
    throw new Error(
      `Invalid key type: ${typeof key}. Expected string or string[].`,
    );
  }
}

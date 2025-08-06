import { Inject } from "@nestjs/common";
import { RedlockService } from "./redlock.service";

// 7. Better TypeScript types
export function Redlock<T extends (...args: any[]) => any>(
  keys: string[],
  ttl = 100
): (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => void {
  return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => {
    // Guard against undefined descriptor
    if (!descriptor || typeof descriptor.value !== 'function') {
      throw new Error(`@Redlock can only be applied to methods. Property ${String(propertyKey)} is not a method.`);
    }

    Inject(RedlockService)(target, RedlockService.name);

    const originalMethod = descriptor.value;

    // Create wrapper method (always async since redlock operations are async)
    const wrappedMethod = async function (this: any, ...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const that = this;

      // 9. Dependency injection edge case handling
      const redlockService = (this as any)[RedlockService.name] as RedlockService;
      
      if (!redlockService) {
        throw new Error(`RedlockService not found. Ensure the RedlockModule is imported in the same module as the class using @Redlock or isGlobal is true`);
      }

      return await redlockService
        .withLock(keys, ttl, () => originalMethod.apply(that, args));
    };

    // Metadata preservation
    // 1. Preserve the original method name
    Object.defineProperty(wrappedMethod, 'name', {
      value: originalMethod.name,
      configurable: true
    });

    // 2. Preserve the original method's parameter count (arity)
    Object.defineProperty(wrappedMethod, 'length', {
      value: originalMethod.length,
      configurable: true
    });

    // 3. Copy prototype properties if needed
    Object.setPrototypeOf(wrappedMethod, Object.getPrototypeOf(originalMethod));

    // 4. Preserve custom properties
    const originalPropertyNames = Object.getOwnPropertyNames(originalMethod);
    for (const key of originalPropertyNames) {
      if (key !== 'name' && key !== 'length' && key !== 'prototype') {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(originalMethod, key);
          if (descriptor) {
            Object.defineProperty(wrappedMethod, key, descriptor);
          }
        } catch (error) {
          // 5. Some properties might not be configurable, skip them
          console.warn(`Could not copy property ${key} from original method`);
        }
      }
    }

    descriptor.value = wrappedMethod as T;
    return descriptor;
  };
}

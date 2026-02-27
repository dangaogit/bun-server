/**
 * 装饰器组合工具
 * 将多个装饰器合并为一个可复用的装饰器
 */
export function applyDecorators(
  ...decorators: Array<ClassDecorator | MethodDecorator | PropertyDecorator>
): ClassDecorator & MethodDecorator & PropertyDecorator {
  return ((
    target: unknown,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    for (const decorator of decorators.reverse()) {
      if (descriptor) {
        const result = (decorator as MethodDecorator)(
          target as object,
          propertyKey!,
          descriptor,
        );
        if (result) {
          descriptor = result as PropertyDescriptor;
        }
      } else if (propertyKey) {
        (decorator as PropertyDecorator)(target as object, propertyKey);
      } else {
        (decorator as ClassDecorator)(target as Function);
      }
    }
    return descriptor;
  }) as ClassDecorator & MethodDecorator & PropertyDecorator;
}

import { ClassType } from "@deepkit/core";
import { ClassApiTypeInterface as DecoratorApi } from "@deepkit/type";

export abstract class PrettifiedDecoratorApi<Meta = null>
  implements DecoratorApi<Meta>
{
  abstract meta: Meta;
  get t(): Meta {
    return this.meta;
  }

  abstract onDecorate(
    type: ClassType<unknown>,
    property?: string,
    parameterIndexOrDescriptor?: number | PropertyDescriptor,
  ): void;
  onDecorator(
    classType: ClassType<any>,
    property?: string,
    parameterIndexOrDescriptor?: number | PropertyDescriptor,
  ): void {
    this.onDecorate(classType, property, parameterIndexOrDescriptor);
  }
}

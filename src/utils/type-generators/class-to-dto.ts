type PickNonFunction<T> = {
  [k in keyof T]: T[k] extends Function ? never : k;
}[keyof T];

// Removes function definitions from class.
export type ClassToDto<T> = Pick<T, PickNonFunction<T>>;

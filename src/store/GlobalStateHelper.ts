type Primitive = string | number | boolean | symbol | undefined | null

type Flatten<T, Path extends string = ''> = {
    [K in keyof T]: T[K] extends Primitive | Array<any> | Map<any, any>
        ? { [P in `${Path}${K & string}`]: T[K] }
        : Flatten<T[K], `${Path}${K & string}.`>
}[keyof T]

type Merge<T> = (T extends any ? (x: T) => void : never) extends (x: infer R) => void ? R : never

export type FlattenType<T> = Merge<Flatten<T>>

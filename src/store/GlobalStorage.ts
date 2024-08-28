import { Sync } from "./GlobalState";

export type StorageType = "chrome" | "local";

export const GlobalStorage = {
  get: (key: string, cb: (result: any) => void) => {
    const results = localStorage.getItem(key);
    cb(results ? JSON.parse(results) : undefined);
  },
  getAll: (cb: (items: { [key: string]: any }) => void) => {
    cb(
      parseItems(
        filterNonSyncKeys(arrayToObject(Object.entries({ ...localStorage })))
      )
    );
  },
  set: (key: string, newValue: any) => {
    console.log("set local", key, newValue);
    localStorage.setItem(key, JSON.stringify(newValue));
  },
  on: (cb: (key: string, newValue: any) => void) => {
    addEventListener("storage", () => {
      GlobalStorage.getAll((items) => {
        Object.entries(filterNonSyncKeys(items)).forEach(([key, newValue]) => {
          newValue && cb(key, newValue);
        });
      });
    });
  },
};

const parseItems = (items: { [key: string]: any }): { [key: string]: any } => {
  return Object.fromEntries(
    Object.entries(items).map(([key, value]) => [
      key,
      JSON.parse(value as string),
    ])
  );
};

const filterNonSyncKeys = (items: {
  [key: string]: any;
}): { [key: string]: any } => {
  const filteredEntries = Object.entries(items).filter(([key]) =>
    Sync.includes(key as any)
  );
  return arrayToObject(filteredEntries);
};

const arrayToObject = (array: Array<[string, any]>): { [key: string]: any } => {
  return array.reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

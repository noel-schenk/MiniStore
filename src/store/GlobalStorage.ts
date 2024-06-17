import { MiniDebounce, Sync } from "./GlobalState";
import { debounce } from "./utility";

const chromeExtensionNamespace = "local";
export type StorageType = "chrome" | "local";

export const GlobalStorage = {
  storage: (chrome?.storage ? "chrome" : "local") as StorageType,
  get: (key: string, cb: (result: any) => void) => {
    stS({
      chrome: () => {
        chrome.storage[chromeExtensionNamespace].get([key as string], (items) =>
          cb(items[key])
        );
      },
      local: () => {
        const results = localStorage.getItem(key);
        cb(results ? JSON.parse(results) : undefined);
      },
    });
  },
  getAll: (cb: (items: { [key: string]: any }) => void) => {
    stS({
      chrome: () => {
        chrome.storage[chromeExtensionNamespace].get(null, (items) =>
          cb(filterNonSyncKeys(items))
        );
      },
      local: () => {
        cb(
          parseItems(
            filterNonSyncKeys(
              arrayToObject(Object.entries({ ...localStorage }))
            )
          )
        );
      },
    });
  },
  set: (key: string, newValue: any) => {
    console.log("set", key, newValue);
    stS({
      chrome: () => {
        const setStorage = () =>
          chrome.storage[chromeExtensionNamespace].set({
            [key]: newValue,
          });

        if (MiniDebounce.includes(key as any)) debounce(setStorage, 100, key);
        else debounce(setStorage, 1000, key);
      },
      local: () => {
        console.log("set local", key, newValue);
        localStorage.setItem(key, JSON.stringify(newValue));
      },
    });
  },
  on: (cb: (key: string, newValue: any) => void) => {
    stS({
      chrome: () => {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === chromeExtensionNamespace) {
            Object.entries(filterNonSyncKeys(changes)).forEach(
              ([key, change]) => {
                cb(key, change.newValue);
              }
            );
          }
        });
      },
      local: () => {
        addEventListener("storage", () => {
          GlobalStorage.getAll((items) => {
            Object.entries(filterNonSyncKeys(items)).forEach(
              ([key, newValue]) => {
                newValue && cb(key, newValue);
              }
            );
          });
        });
      },
    });
  },
};

/**
 * Storage Selector
 * @param cbs
 * @returns
 */
const stS = (cbs: { chrome: () => any; local: () => any }) => {
  if (GlobalStorage.storage === "chrome") return cbs.chrome();
  if (GlobalStorage.storage === "local") return cbs.local();
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

console.log("Using Storage Type: ", GlobalStorage.storage);

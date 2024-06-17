import { StoreApi, UseBoundStore, create } from "zustand";
import { flatten } from "flatten-anything";
import { FlattenType } from "./GlobalStateHelper";
import deepEqual from "fast-deep-equal";
import { GlobalStorage } from "./GlobalStorage";
import rfdc from "rfdc";

// Properties available in the state
const _GlobalState = {
  loaded: false,
  test: {
    test: ["test", "test2"],
    test2: "test2",
    test3: "test3",
  },
};

// Properties to Sync to the store chrome.storage if exists else localStorage
export const Sync = new Array<keyof State>(
  "test.test",
  "test.test2",
  "test.test3"
);

// Tags Sync properties to Sync faster to the localState (can lead to recursion errors)
export const MiniDebounce = new Array<(typeof Sync)[number]>(
  "test.test",
  "test.test2"
);

// Helper to update Global Storage only if the value is new for extra recursion proofing
const updateGlobalStorageIfAppropriate = (key: keyof State, newValue: any) => {
  if (!Sync.includes(key)) return;
  GlobalStorage.get(key, (result) => {
    deepEqual(result?.[key], newValue) || GlobalStorage.set(key, newValue);
  });
};

// Init GlobalState functions
export type State = FlattenType<typeof _GlobalState>;

const GlobalState = flatten(_GlobalState) as State;

const globalSet = (state: State, key: keyof State, value: any) => {
  const newState = { ...state, [key]: value };
  updateGlobalStorageIfAppropriate(key, value);
  return newState;
};

interface Store extends State {
  set: <K extends keyof State>(key: K, value: State[K]) => void;
  get: <T extends keyof State>(key: T) => State[T];
  subscribe: (key: keyof State, callback: (value: any) => void) => () => void;
  update: <T extends keyof State>(key: T) => void;
}

const basicGlobalState = create<Store>((set, get, api) => ({
  ...GlobalState,
  set: (key: keyof State, value: any) =>
    set((state: any) => globalSet(state, key, value)),
  get: (key) => get()[key],
  subscribe: (key, callback) => {
    const listener = (state: State, prevState: State) => {
      if (deepEqual(state[key], prevState[key])) return;
      callback(state[key]);
    };
    return api.subscribe(listener);
  },
  update: (key) => {
    const newValue = rfdc()(get()[key]);
    set((state: any) => globalSet(state, key, newValue));
  },
}));

type ExtendedStore = Omit<UseBoundStore<StoreApi<Store>>, "subscribe"> & {
  (): Store;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
  get: <T extends keyof State>(key: T) => State[T];
  subscribe: <K extends keyof State>(
    key: K,
    callback: (value: State[K]) => any
  ) => void;
  oldSubscribe: (
    listener: (state: Store, prevState: Store) => void
  ) => () => void;
  update: <K extends keyof State>(key: K) => void;
};

const useGlobalState = basicGlobalState as any as ExtendedStore;
useGlobalState.oldSubscribe = basicGlobalState.subscribe;

useGlobalState.set = <K extends keyof State>(key: K, value: State[K]) => {
  useGlobalState.setState({ [key]: value });
  updateGlobalStorageIfAppropriate(key, value);
};

useGlobalState.update = <K extends keyof State>(key: K) => {
  const newValue = rfdc()(useGlobalState.get(key));
  useGlobalState.setState({ [key]: newValue });
  updateGlobalStorageIfAppropriate(key, newValue);
};

useGlobalState.get = <T extends keyof State>(key: T) =>
  useGlobalState.getState()[key];
useGlobalState.subscribe = <K extends keyof State>(
  key: K,
  callback: (value: State[K]) => any
) => {
  useGlobalState.oldSubscribe((state, prevState) => {
    if (deepEqual(state[key], prevState[key])) return;
    callback(state[key]);
  });
};

// Load initial state from Global Storage
GlobalStorage.getAll((items) => {
  Object.keys(items).forEach((key) => {
    useGlobalState.set(key as keyof State, items[key]);
  });
  useGlobalState.set("loaded", true);
});

// Listen for changes in Global Storage and update the store
GlobalStorage.on((key: string, newValue: any) => {
  deepEqual(useGlobalState.get(key as keyof State), newValue) ||
    useGlobalState.set(key as keyof State, newValue);
});

export default useGlobalState;

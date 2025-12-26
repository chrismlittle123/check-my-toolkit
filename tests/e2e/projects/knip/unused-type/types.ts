// This type is used by main.ts
export type UsedType = {
  id: number;
};

// This type is exported but never used
export type UnusedType = {
  name: string;
};

// This interface is exported but never used
export interface UnusedInterface {
  value: string;
}

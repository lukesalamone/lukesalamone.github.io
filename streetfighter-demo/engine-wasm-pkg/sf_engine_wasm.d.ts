/* tslint:disable */
/* eslint-disable */
export function metadata_json(): string;
export class GameEnv {
  free(): void;
  constructor(max_ticks: number);
  /**
   * act = [move, jump, offense, shield] (offense: 0=none 1=attack 2=grab).
   * Returns done.
   */
  step(act_p: Int32Array, act_a: Int32Array): boolean;
  tick(): number;
  obs_a(): Float32Array;
  obs_p(): Float32Array;
  reset(x_p: number, x_a: number): void;
  /**
   * Flat [player fields…, cpu fields…] per STATE_FIELDS.
   */
  state(): Float64Array;
  /**
   * Override a balance tunable (takes effect at the next reset).
   * Throws on unknown keys.
   */
  set_param(key: string, value: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_gameenv_free: (a: number, b: number) => void;
  readonly gameenv_new: (a: number) => number;
  readonly gameenv_obs_a: (a: number) => [number, number];
  readonly gameenv_obs_p: (a: number) => [number, number];
  readonly gameenv_reset: (a: number, b: number, c: number) => void;
  readonly gameenv_set_param: (a: number, b: number, c: number, d: number) => [number, number];
  readonly gameenv_state: (a: number) => [number, number];
  readonly gameenv_step: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly gameenv_tick: (a: number) => number;
  readonly metadata_json: () => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

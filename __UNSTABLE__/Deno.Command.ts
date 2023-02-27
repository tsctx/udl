// deno-lint-ignore-file ban-ts-comment
export interface CommandOptions {
  /** Arguments to pass to the process. */
  args?: string[];
  /**
   * The working directory of the process.
   *
   * If not specified, the `cwd` of the parent process is used.
   */
  cwd?: string | URL;
  /**
   * Clear environmental variables from parent process.
   *
   * Doesn't guarantee that only `env` variables are present, as the OS may
   * set environmental variables for processes.
   *
   * @default {false}
   */
  clearEnv?: boolean;
  /** Environmental variables to pass to the subprocess. */
  env?: Record<string, string>;
  /**
   * Sets the child process’s user ID. This translates to a setuid call in the
   * child process. Failure in the set uid call will cause the spawn to fail.
   */
  uid?: number;
  /** Similar to `uid`, but sets the group ID of the child process. */
  gid?: number;
  /**
   * An {@linkcode AbortSignal} that allows closing the process using the
   * corresponding {@linkcode AbortController} by sending the process a
   * SIGTERM signal.
   *
   * Not supported in {@linkcode Deno.spawnSync}.
   */
  signal?: AbortSignal;

  /** How `stdin` of the spawned process should be handled.
   *
   * Defaults to `"null"`. */
  stdin?: "piped" | "inherit" | "null";
  /** How `stdout` of the spawned process should be handled.
   *
   * Defaults to `"piped"` for `output` & `outputSync`,
   * and `"inherit"` for `spawn`. */
  stdout?: "piped" | "inherit" | "null";
  /** How `stderr` of the spawned process should be handled.
   *
   * Defaults to `"piped"` for `output` & `outputSync`,
   * and `"inherit"` for `spawn`. */
  stderr?: "piped" | "inherit" | "null";

  /** Skips quoting and escaping of the arguments on windows. This option
   * is ignored on non-windows platforms.
   *
   * @default {false} */
  windowsRawArguments?: boolean;
}
interface CommandStatus {
  /** If the child process exits with a 0 status code, `success` will be set
   * to `true`, otherwise `false`. */
  success: boolean;
  /** The exit code of the child process. */
  code: number;
  /** The signal associated with the child process. */
  signal: Deno.Signal | null;
}
interface CommandOutput extends CommandStatus {
  /** The buffered output from the child process' `stdout`. */
  readonly stdout: Uint8Array;
  /** The buffered output from the child process' `stderr`. */
  readonly stderr: Uint8Array;
}
export class _Command {
  declare private _process?: Deno.Process<Deno.RunOptions>;
  declare private _closed: boolean;
  declare private _command: string | URL;
  declare private _options?: CommandOptions;
  constructor(command: string | URL, options?: CommandOptions) {
    this._closed = false;
    this._command = command;
    this._options = options;
    options?.signal?.addEventListener(
      "abort",
      () => {
        this._closed = true;
        this._process?.close();
      },
      {
        once: true,
      },
    );
  }
  private _run() {
    if (this._closed || this._process) return;
    this._process = Deno.run({
      cmd: [this._command.toString(), ...(this._options?.args || [])],
      cwd: this._options?.cwd?.toString(),
      env: this._options?.env,
      stderr: this._options?.stderr,
      stdin: this._options?.stdin,
      stdout: this._options?.stdout,
      //@ts-ignore
      clearEnv: this._options?.clearEnv,
      //@ts-ignore
      gid: this._options?.gid,
      //@ts-ignore
      uid: this._options?.uid,
    });
  }
  /**
   * Executes the {@linkcode Deno.Command}, waiting for it to finish and
   * collecting all of its output.
   * If `spawn()` was called, calling this function will collect the remaining
   * output.
   *
   * Will throw an error if `stdin: "piped"` is set.
   *
   * If options `stdout` or `stderr` are not set to `"piped"`, accessing the
   * corresponding field on {@linkcode Deno.CommandOutput} will throw a `TypeError`.
   */
  public async output(): Promise<CommandOutput> {
    this._run();
    const status = await this._process!.status().then(
      (r) => ({
        success: r.success,
        code: r.code,
        signal: r.signal || null,
      } as CommandStatus),
    );
    const [stderr, stdout] = await Promise.all([
      new Response(this._process!.stderr?.readable).arrayBuffer(),
      new Response(this._process!.stdout?.readable).arrayBuffer(),
    ]);
    return {
      ...status,
      stderr: new Uint8Array(stderr),
      stdout: new Uint8Array(stdout),
    };
  }
  /**
   * Synchronously executes the {@linkcode Deno.Command}, waiting for it to
   * finish and collecting all of its output.
   *
   * Will throw an error if `stdin: "piped"` is set.
   *
   * If options `stdout` or `stderr` are not set to `"piped"`, accessing the
   * corresponding field on {@linkcode Deno.CommandOutput} will throw a `TypeError`.
   */
  outputSync(): CommandOutput {
    throw new Error(
      "`Command.outputSync` is not supported. Use `Command.output`.",
    );
  }
  /**
   * Spawns a streamable subprocess, allowing to use the other methods.
   */
  spawn(): _ChildProcess {
    const cp = Object.create(_ChildProcess.prototype) as _ChildProcess;
    //@ts-ignore
    cp._process = this._process;
    //@ts-ignore
    cp._command = this;
    return cp;
  }
}
class _ChildProcess {
  declare private _process: Deno.Process<Deno.RunOptions>;
  declare private _command: _Command;
  private constructor() {
    throw new TypeError("Illegal constructor");
  }
  private _run() {
    //@ts-ignore
    this._command._run();
  }
  public get stderr() {
    this._run();
    return this._process.stderr?.readable;
  }
  public get stdout() {
    this._run()
    return this._process.stdout?.readable;
  }
  public get stdin() {
    this._run()
    return this._process.stdin?.writable;
  }
  public get pid() {
    this._run();
    return this._process.pid;
  }
  /** Waits for the child to exit completely, returning all its output and
   * status. */
  public async output(): Promise<CommandOutput> {
    this._run()
    const status = await this.status;
    const [stderr, stdout] = await Promise.all([
      new Response(this.stderr).arrayBuffer(),
      new Response(this.stdout).arrayBuffer(),
    ]);
    return {
      ...status,
      stderr: new Uint8Array(stderr),
      stdout: new Uint8Array(stdout),
    };
  }
  /** Kills the process with given {@linkcode Deno.Signal}.
   *
   * @param [signo="SIGTERM"]
   */
  public kill(signo?: Deno.Signal | undefined): void {
    this._run()
    this._process.kill(signo);
  }
  /** Get the status of the child. */
  public get status() {
    this._run();
    return this._process.status().then(
      (r) => ({
        success: r.success,
        code: r.code,
        signal: r.signal || null,
      } as CommandStatus),
    );
  }
  /** Ensure that the status of the child process prevents the Deno process
   * from exiting. */
  public ref(): void {
    this._run();
    throw new Error("Not supported");
  }
  /** Ensure that the status of the child process does not block the Deno
   * process from exiting. */
  public unref(): void {
    this._run();
    throw new Error("Not supported");
  }
}
import { getVersion } from "./_utils.ts";
export const Command: typeof _Command = function Command(
  command: string | URL,
  options?: CommandOptions,
): _Command {
  if ("Command" in Deno) {
    //@ts-ignore
    return new Deno.Command(command, options);
    //@ts-ignore
  } else if (typeof Deno.internal !== "undefined" && Deno.internal in Deno) {
    //@ts-ignore
    if (Deno[Deno.internal].nodeUnstable?.Command) {
      //@ts-ignore
      return new Deno[Deno.internal].nodeUnstable.Command(command, options);
    }
  }
  const version = getVersion(Deno.version.deno)!;
  if (
    !((parseInt(version.major, 10) <= 1) &&
      (parseInt(version.minor, 10) < 31))
  ) {
    console.log(`
\x1b[31mWarning: Deno.Command subprocess API is stable with v1.31\x1b[0m
\x1b[95mDeno v1.31 has been released!\x1b[0m
`);
  }
  return new _Command(command, options);
} as unknown as typeof _Command;

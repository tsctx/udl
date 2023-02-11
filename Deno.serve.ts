// deno-lint-ignore-file ban-ts-comment
import * as std_server from "https://deno.land/std@0.177.0/http/server.ts";

export type ServeHandler = (request: Request) => Response | Promise<Response>;

/** **UNSTABLE**: New API, yet to be vetted.
 *
 * @category HTTP Server
 */
export interface ServeInit {
  /** The handler to invoke to process each incoming request. */
  handler: ServeHandler;
}
/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Options which can be set when calling {@linkcode Deno.serve}.
 *
 * @category HTTP Server
 */
export interface ServeOptions extends Partial<Deno.ListenOptions> {
  /** An {@linkcode AbortSignal} to close the server and all connections. */
  signal?: AbortSignal;

  /** Sets `SO_REUSEPORT` on POSIX systems. */
  reusePort?: boolean;

  /** The handler to invoke when route handlers throw an error. */
  onError?: (error: unknown) => Response | Promise<Response>;

  /** The callback which is called when the server starts listening. */
  onListen?: (params: { hostname: string; port: number }) => void;
}
/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Additional options which are used when opening a TLS (HTTPS) server.
 *
 * @category HTTP Server
 */
export interface ServeTlsOptions extends ServeOptions {
  /** Server private key in PEM format */
  cert: string;

  /** Cert chain in PEM format */
  key: string;
}
async function _serve(
  handler: ServeHandler,
  options?: Partial<ServeTlsOptions>
) {
  let server: Deno.Listener | Deno.TlsListener;
  let closed = false;
  if (options && options.key && options.cert) {
    server = Deno.listenTls({
      port: options.port || 9000,
      hostname: options.hostname || "127.0.0.1",
      key: options.key,
      cert: options.cert,
      transport: "tcp",
      reusePort: options.reusePort,
    });
  } else {
    server = Deno.listen({
      port: options?.port || 9000,
      hostname: options?.hostname || "127.0.0.1",
      transport: "tcp",
      //@ts-ignore
      reusePort: options?.reusePort,
    });
  }
  options?.signal?.addEventListener(
    "abort",
    () => {
      closed = true;
      server.close();
    },
    {
      once: true,
    }
  );
  for await (const conn of server) {
    const httpRequest = Deno.serveHttp(conn);
    (async () => {
      for await (const requestEvent of httpRequest) {
        if (closed) {
          break;
        }
        let response: Response;
        try {
          response = await handler(requestEvent.request);
          if (response.bodyUsed && response.body !== null) {
            throw new TypeError("Response body already consumed.");
          }
        } catch (error) {
          if (options?.onError) {
            response = await options.onError(error);
          } else {
            response = new Response("Internal Server Error", {
              status: 500,
              statusText: "Internal Server Error",
            });
          }
        }
        try {
          await requestEvent.respondWith(response);
        } catch (_error) {
          // pass
        }
      }
    })();
  }
}


/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Serves HTTP requests with the given handler.
 *
 * You can specify an object with a port and hostname option, which is the
 * address to listen on. The default is port `9000` on hostname `"127.0.0.1"`.
 *
 * The below example serves with the port `9000`.
 *
 * ```ts
 * Deno.serve((_req) => new Response("Hello, world"));
 * ```
 *
 * You can change the address to listen on using the `hostname` and `port`
 * options. The below example serves on port `3000`.
 *
 * ```ts
 * Deno.serve({ port: 3000 }, (_req) => new Response("Hello, world"));
 * ```
 *
 * You can stop the server with an {@linkcode AbortSignal}. The abort signal
 * needs to be passed as the `signal` option in the options bag. The server
 * aborts when the abort signal is aborted. To wait for the server to close,
 * await the promise returned from the `Deno.serve` API.
 *
 * ```ts
 * const ac = new AbortController();
 *
 * Deno.serve({ signal: ac.signal }, (_req) => new Response("Hello, world"))
 *  .then(() => console.log("Server closed"));
 *
 * console.log("Closing server...");
 * ac.abort();
 * ```
 *
 * By default `Deno.serve` prints the message
 * `Listening on http://<hostname>:<port>/` on listening. If you like to
 * change this behavior, you can specify a custom `onListen` callback.
 *
 * ```ts
 * Deno.serve({
 *   onListen({ port, hostname }) {
 *     console.log(`Server started at http://${hostname}:${port}`);
 *     // ... more info specific to your server ..
 *   },
 *   handler: (_req) => new Response("Hello, world"),
 * });
 * ```
 *
 * To enable TLS you must specify the `key` and `cert` options.
 *
 * ```ts
 * const cert = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n";
 * const key = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n";
 * Deno.serve({ cert, key }, (_req) => new Response("Hello, world"));
 * ```
 *
 * @category HTTP Server
 */
export function serve(
  handler: ServeHandler,
  options?: ServeOptions | ServeTlsOptions
): Promise<void>;

/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Serves HTTP requests with the given handler.
 *
 * You can specify an object with a port and hostname option, which is the
 * address to listen on. The default is port `9000` on hostname `"127.0.0.1"`.
 *
 * The below example serves with the port `9000`.
 *
 * ```ts
 * Deno.serve((_req) => new Response("Hello, world"));
 * ```
 *
 * You can change the address to listen on using the `hostname` and `port`
 * options. The below example serves on port `3000`.
 *
 * ```ts
 * Deno.serve({ port: 3000 }, (_req) => new Response("Hello, world"));
 * ```
 *
 * You can stop the server with an {@linkcode AbortSignal}. The abort signal
 * needs to be passed as the `signal` option in the options bag. The server
 * aborts when the abort signal is aborted. To wait for the server to close,
 * await the promise returned from the `Deno.serve` API.
 *
 * ```ts
 * const ac = new AbortController();
 *
 * Deno.serve({ signal: ac.signal }, (_req) => new Response("Hello, world"))
 *  .then(() => console.log("Server closed"));
 *
 * console.log("Closing server...");
 * ac.abort();
 * ```
 *
 * By default `Deno.serve` prints the message
 * `Listening on http://<hostname>:<port>/` on listening. If you like to
 * change this behavior, you can specify a custom `onListen` callback.
 *
 * ```ts
 * Deno.serve({
 *   onListen({ port, hostname }) {
 *     console.log(`Server started at http://${hostname}:${port}`);
 *     // ... more info specific to your server ..
 *   },
 *   handler: (_req) => new Response("Hello, world"),
 * });
 * ```
 *
 * To enable TLS you must specify the `key` and `cert` options.
 *
 * ```ts
 * const cert = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n";
 * const key = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n";
 * Deno.serve({ cert, key }, (_req) => new Response("Hello, world"));
 * ```
 *
 * @category HTTP Server
 */
export function serve(
  options: ServeOptions | ServeTlsOptions,
  handler: ServeHandler
): Promise<void>;

/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Serves HTTP requests with the given handler.
 *
 * You can specify an object with a port and hostname option, which is the
 * address to listen on. The default is port `9000` on hostname `"127.0.0.1"`.
 *
 * The below example serves with the port `9000`.
 *
 * ```ts
 * Deno.serve((_req) => new Response("Hello, world"));
 * ```
 *
 * You can change the address to listen on using the `hostname` and `port`
 * options. The below example serves on port `3000`.
 *
 * ```ts
 * Deno.serve({ port: 3000 }, (_req) => new Response("Hello, world"));
 * ```
 *
 * You can stop the server with an {@linkcode AbortSignal}. The abort signal
 * needs to be passed as the `signal` option in the options bag. The server
 * aborts when the abort signal is aborted. To wait for the server to close,
 * await the promise returned from the `Deno.serve` API.
 *
 * ```ts
 * const ac = new AbortController();
 *
 * Deno.serve({ signal: ac.signal }, (_req) => new Response("Hello, world"))
 *  .then(() => console.log("Server closed"));
 *
 * console.log("Closing server...");
 * ac.abort();
 * ```
 *
 * By default `Deno.serve` prints the message
 * `Listening on http://<hostname>:<port>/` on listening. If you like to
 * change this behavior, you can specify a custom `onListen` callback.
 *
 * ```ts
 * Deno.serve({
 *   onListen({ port, hostname }) {
 *     console.log(`Server started at http://${hostname}:${port}`);
 *     // ... more info specific to your server ..
 *   },
 *   handler: (_req) => new Response("Hello, world"),
 * });
 * ```
 *
 * To enable TLS you must specify the `key` and `cert` options.
 *
 * ```ts
 * const cert = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n";
 * const key = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n";
 * Deno.serve({ cert, key }, (_req) => new Response("Hello, world"));
 * ```
 *
 * @category HTTP Server
 */
export function serve(
  options: ServeInit & (ServeOptions | ServeTlsOptions)
): Promise<void>;

export function serve(
  args1: (ServeOptions | ServeTlsOptions) | ServeHandler | (ServeInit & (ServeOptions | ServeTlsOptions)),
  args2?: (ServeOptions | ServeTlsOptions) | ServeHandler
): Promise<void> {
  let handler: ServeHandler, options: ServeOptions; 
  if (typeof args1 === "function") {
    handler = args1;
    options = args2 as ServeOptions;
  } else if (typeof args2 === "function") {
    handler = args2;
    options = args1;
  } else {
    options = args1;
    if (typeof (args1 as ServeInit).handler !== "function") {
      throw new TypeError("A handler function must be provided.")
    }
    handler = (args1 as ServeInit).handler;
  }
  if ("serve" in Deno) {
    //@ts-ignore
    return Deno.serve(handler, options);
    //@ts-ignore
  } else if (typeof Deno.internal !== "undefined" && Deno.internal in Deno) {
    //@ts-ignore
    if (Deno[Deno.internal].nodeUnstable?.serve) {
      //@ts-ignore
      return Deno[Deno.internal].nodeUnstable.serve(handler, options);
    }
  }
  if (options?.reusePort) {
    return _serve(handler, options);
  }
  if ((options as ServeTlsOptions)?.key && (options as ServeTlsOptions)?.cert) {
    return std_server.serveTls(handler, {
      hostname: options?.hostname || "127.0.0.1",
      port: options?.port || 9000,
      signal: options?.signal,
      onListen: options?.onListen || undefined,
      onError: options?.onError,
      key: (options as ServeTlsOptions).key,
      cert: (options as ServeTlsOptions).cert,
    });
  } else {
    return std_server.serve(handler, {
      hostname: options?.hostname || "127.0.0.1",
      port: options?.port || 9000,
      signal: options?.signal,
      onListen: options?.onListen || undefined,
      onError: options?.onError,
    });
  }
}

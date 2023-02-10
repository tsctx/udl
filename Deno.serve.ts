// deno-lint-ignore-file ban-ts-comment
import * as std_server from "https://deno.land/std@0.177.0/http/server.ts";

type ServeHandler = (request: Request) => Response | Promise<Response>;
interface ServeOptions extends Partial<Deno.ListenOptions> {
  /** An {@linkcode AbortSignal} to close the server and all connections. */
  signal?: AbortSignal;

  /** Sets `SO_REUSEPORT` on POSIX systems. */
  reusePort?: boolean;

  /** The handler to invoke when route handlers throw an error. */
  onError?: (error: unknown) => Response | Promise<Response>;

  /** The callback which is called when the server starts listening. */
  onListen?: (params: { hostname: string; port: number }) => void;
}
interface ServeTlsOptions extends ServeOptions {
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
export function serve(
  handler: ServeHandler,
  options?: ServeOptions | ServeTlsOptions
) {
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

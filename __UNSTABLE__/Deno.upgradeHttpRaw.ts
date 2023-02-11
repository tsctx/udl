// deno-lint-ignore-file ban-ts-comment

/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Allows "hijacking" the connection that the request is associated with.
 * This can be used to implement protocols that build on top of HTTP (eg.
 * {@linkcode WebSocket}).
 *
 * Unlike {@linkcode Deno.upgradeHttp} this function does not require that you
 * respond to the request with a {@linkcode Response} object. Instead this
 * function returns the underlying connection and first packet received
 * immediately, and then the caller is responsible for writing the response to
 * the connection.
 *
 * This method can only be called on requests originating the
 * {@linkcode Deno.serve} server.
 *
 * @category HTTP Server
 */
export function upgradeHttpRaw(request: Request): [Deno.Conn, Uint8Array] {
  if ("upgradeHttpRaw" in Deno) {
    //@ts-ignore
    return Deno.upgradeHttpRaw(request) as unknown as [Deno.Conn, Uint8Array];
    //@ts-ignore
  } else if (typeof Deno.internal !== "undefined" && Deno.internal in Deno) {
    //@ts-ignore
    if (Deno[Deno.internal].nodeUnstable?.upgradeHttpRaw) {
      //@ts-ignore
      return Deno[Deno.internal].nodeUnstable.upgradeHttpRaw(request) as unknown as [Deno.Conn, Uint8Array];
    }
  }
  throw new TypeError("Use `upgradeHttp` instead.");
}

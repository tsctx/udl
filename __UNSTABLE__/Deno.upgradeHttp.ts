// deno-lint-ignore-file ban-ts-comment

/** **UNSTABLE**: New API, yet to be vetted.
 *
 * Allows "hijacking" the connection that the request is associated with. This
 * can be used to implement protocols that build on top of HTTP (eg.
 * {@linkcode WebSocket}).
 *
 * The returned promise returns underlying connection and first packet
 * received. The promise shouldn't be awaited before responding to the
 * `request`, otherwise event loop might deadlock.
 *
 * ```ts
 * function handler(req: Request): Response {
 *   Deno.upgradeHttp(req).then(([conn, firstPacket]) => {
 *     // ...
 *   });
 *   return new Response(null, { status: 101 });
 * }
 * ```
 *
 * This method can only be called on requests originating the
 * {@linkcode Deno.serveHttp} server.
 *
 * @category HTTP Server
 */
export function upgradeHttp(
  request: Request
): Promise<[Deno.Conn, Uint8Array]> {
  if ("upgradeHttp" in Deno) {
    //@ts-ignore
    return Deno.upgradeHttp(request) as unknown as Promise<
      [Deno.Conn, Uint8Array]
    >;
  }
  throw new TypeError("Not Supported");
}

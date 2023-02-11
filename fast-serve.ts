export async function serve(
  handler: (req: Request) => Response | Promise<Response>,
  options: Deno.TcpListenOptions & {
    /** Server private key in PEM format */ key?: string;
    /** Cert chain in PEM format */ cert?: string;
  }
) {
  let secure = false;
  if (options.key && options.cert) {
    secure = true;
  }
  const server = (secure ? Deno.listenTls : Deno.listen)(options);

  for await (const conn of server) {
    (async () => {
      const httpConn = Deno.serveHttp(conn);
      for await (const { request, respondWith } of httpConn) {
        const response = await handler(request);
        if (response) {
          respondWith(response);
        } else {
          respondWith(
            new Response("Internal Server Error", {
              status: 500,
              statusText: "Internal Server Error",
            })
          );
        }
      }
    })();
  }
}

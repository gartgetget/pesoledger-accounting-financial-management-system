import { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../backend/index";

if (!(globalThis as any).__unhandledRejectionHooked) {
  (globalThis as any).__unhandledRejectionHooked = true;
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection:", err);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise<void>((resolve) => {
    let done = false;
    const finish = (send: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      send();
      resolve();
    };

    const serverReq: any = {
      method: req.method,
      url: req.url || "/",
      headers: req.headers,
      body: req.body ?? {},
      query: req.query,
      params: {},
      _body: true,
      httpVersion: "1.1",
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      complete: true,
      rawHeaders: [],
      trailers: {},
      socket: { remoteAddress: "127.0.0.1", encrypted: false },
      connection: { remoteAddress: "127.0.0.1" },
      get: (name: string) => (req.headers as any)[name],
      setEncoding() { return this; },
      pause() { return this; },
      resume() { return this; },
      setTimeout() { return this; },
      destroy() { return this; },
      on() { return this; },
      once() { return this; },
      emit() { return false; },
      removeListener() { return this; },
      removeAllListeners() { return this; },
      pipe() { return this; },
    };

    let writtenBody = "";

    const serverRes: any = {
      statusCode: 200,
      writableEnded: false,
      finished: false,
      socket: { remoteAddress: "127.0.0.1" },
      setHeader(name: string, value: any) {
        res.setHeader(name, value);
        return this;
      },
      getHeader(name: string) {
        return res.getHeader(name);
      },
      getHeaders() {
        return res.getHeaders();
      },
      getHeaderNames() {
        return res.getHeaderNames();
      },
      hasHeader(name: string) {
        return res.hasHeader(name);
      },
      removeHeader(name: string) {
        res.removeHeader(name);
      },
      writeHead(code: number, headers?: any) {
        this.statusCode = code;
        if (headers && typeof headers === "object") {
          if (Array.isArray(headers)) {
            for (let i = 0; i < headers.length; i += 2) {
              res.setHeader(headers[i], headers[i + 1]);
            }
          } else {
            for (const [k, v] of Object.entries(headers as Record<string, string>)) {
              res.setHeader(k, v as string);
            }
          }
        }
        return this;
      },
      write(chunk: any) {
        const str = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
        writtenBody += str;
        return true;
      },
      end(chunk?: any) {
        if (this.writableEnded) return this;
        this.writableEnded = true;
        this.finished = true;
        const code = this.statusCode || 200;
        if (chunk) {
          const str = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
          writtenBody += str;
        }
        const body = writtenBody;
        finish(() => {
          try {
            const parsed = JSON.parse(body);
            res.status(code).json(parsed);
          } catch {
            res.status(code).send(body || "{}");
          }
        });
        return this;
      },
      on() { return this; },
      once() { return this; },
      emit() { return false; },
      removeListener() { return this; },
    };

    Object.defineProperty(serverRes, "headersSent", {
      get: () => serverRes.writableEnded,
      configurable: true,
    });
    Object.defineProperty(serverRes, "writableFinished", {
      get: () => serverRes.finished,
      configurable: true,
    });

    const timeout = setTimeout(() => {
      finish(() => {
        res.status(504).json({
          message: "Gateway Timeout: the server did not receive a response in time",
        });
      });
    }, 28000);

    try {
      app(serverReq, serverRes);
    } catch (e: any) {
      finish(() => {
        res.status(500).json({
          message: "Internal server error",
          error: e.message,
        });
      });
    }
  });
}

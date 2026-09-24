import { Router } from "express";

const wrapAsync = (fn: any) => {
  if (fn && fn.constructor && fn.constructor.name === "AsyncFunction") {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  return fn;
};

export function createRouter() {
  const router = Router();
  for (const method of ["get", "post", "put", "delete", "patch"] as const) {
    const original = (router as any)[method].bind(router);
    (router as any)[method] = (...args: any[]) =>
      original(...args.map(wrapAsync));
  }
  const originalUse = (router as any).use.bind(router);
  (router as any).use = (...args: any[]) =>
    originalUse(...args.map(wrapAsync));
  return router;
}

export default createRouter;

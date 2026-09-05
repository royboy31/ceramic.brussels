import type { APIContext } from 'astro';
import type { Env, SessionUser } from './http';

/**
 * Runs a Pages Function inside an Astro endpoint.
 *
 * The admin API is written as Cloudflare Pages Functions in `functions/`,
 * which is what Pages runs when the site is a plain static build. Once the
 * build carries a Worker (PREVIEW_RUNTIME=1), Pages ignores `functions/`
 * entirely and every request under `/api/` reaches Astro instead. Rather
 * than keep two copies of the API, the Astro endpoints in src/pages/api/
 * import the very same functions and call them through this shim, which
 * hands them the context shape they were written against.
 */

export interface ShimData extends Record<string, unknown> {
  user: SessionUser | null;
}

type Handler = (context: any) => Response | Promise<Response>;

interface ShimOptions {
  env: Env;
  data: ShimData;
  params?: Record<string, string>;
  /** What `context.next()` resolves to once every handler has passed. */
  next: () => Promise<Response>;
}

/**
 * Runs `handlers` as a chain, the way Pages runs `_middleware.ts` exports:
 * each one may answer directly or call `next()` to continue.
 */
export function runPagesChain(handlers: Handler[], astro: APIContext, options: ShimOptions): Promise<Response> {
  const { env, data, params = {}, next } = options;
  const cfContext = (astro.locals as any).cfContext as { waitUntil?: (p: Promise<unknown>) => void } | undefined;

  const step = (i: number): (() => Promise<Response>) => async () => {
    if (i >= handlers.length) return next();
    const context = {
      request: astro.request,
      env,
      data,
      params,
      functionPath: astro.url.pathname,
      next: step(i + 1),
      waitUntil: (p: Promise<unknown>) => cfContext?.waitUntil?.(p),
      passThroughOnException: () => {},
    };
    return handlers[i](context);
  };

  return step(0)();
}

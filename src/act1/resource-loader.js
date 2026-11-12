/** Fetch and consume a resource within one deadline, including a stalled body. */
export class ResourceTimeoutError extends Error {
  constructor(url, timeoutMs) {
    super(`Timeout after ${timeoutMs} ms: ${url}`);
    this.name = 'TimeoutError';
    this.code = 'RESOURCE_TIMEOUT';
  }
}

export class ResourceHttpError extends Error {
  constructor(url, status) {
    super(`HTTP ${status}: ${url}`);
    this.name = 'ResourceHttpError';
    this.status = status;
  }
}

class ResourceNetworkError extends Error {
  constructor(url, cause) {
    super(`Network/body error: ${url}: ${cause?.message || cause}`, { cause });
    this.name = 'ResourceNetworkError';
  }
}

function abortReason(signal) {
  return signal?.reason ?? new DOMException('Resource load cancelled', 'AbortError');
}

function retryable(error) {
  return error instanceof ResourceTimeoutError || error instanceof ResourceNetworkError ||
    error instanceof ResourceHttpError && (error.status === 408 || error.status === 429 || error.status >= 500 && error.status <= 599);
}

function attemptBytes(url, options) {
  const { signal, timeoutMs, fetchImpl, setTimeoutFn, clearTimeoutFn, requestOptions } = options;
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false, timer;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeoutFn(timer);
      signal?.removeEventListener('abort', parentAborted);
      callback(value);
    };
    const parentAborted = () => {
      const error = abortReason(signal);
      finish(reject, error);
      controller.abort(error);
    };
    signal?.addEventListener('abort', parentAborted, { once: true });
    timer = setTimeoutFn(() => {
      const error = new ResourceTimeoutError(String(url), timeoutMs);
      // Reject independently of fetch: some transports never settle on abort.
      finish(reject, error);
      controller.abort(error);
    }, timeoutMs);
    if (signal?.aborted) { parentAborted(); return; }
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) throw abortReason(controller.signal);
      let response;
      try { response = await fetchImpl(url, { ...requestOptions, signal: controller.signal }); }
      catch (error) {
        if (controller.signal.aborted) throw abortReason(controller.signal);
        throw new ResourceNetworkError(String(url), error);
      }
      if (controller.signal.aborted) throw abortReason(controller.signal);
      if (!response.ok) {
        // A failed HTTP body need not be downloaded before the retry.
        controller.abort();
        throw new ResourceHttpError(String(url), response.status);
      }
      let bytes;
      try { bytes = await response.arrayBuffer(); }
      catch (error) {
        if (controller.signal.aborted) throw abortReason(controller.signal);
        throw new ResourceNetworkError(String(url), error);
      }
      if (controller.signal.aborted) throw abortReason(controller.signal);
      return bytes;
    }).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

/**
 * Returns ArrayBuffer. onRetry receives {url, attempt, nextAttempt, error}.
 * Integrity/schema checks happen outside this function and are never retried.
 * Injectable transport/timers make stalled headers and bodies testable quickly.
 */
export async function fetchBytes(url, {
  signal, timeoutMs = 30000, retries = 1, onRetry,
  fetchImpl = globalThis.fetch,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
  ...requestOptions
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('Resource deadline must be positive');
  if (!Number.isInteger(retries) || retries < 0) throw new RangeError('Resource retries must be a non-negative integer');
  for (let attempt = 0; ; attempt++) {
    try { return await attemptBytes(url, { signal, timeoutMs, fetchImpl, setTimeoutFn, clearTimeoutFn, requestOptions }); }
    catch (error) {
      if (signal?.aborted) throw abortReason(signal);
      if (attempt >= retries || !retryable(error)) throw error;
      onRetry?.({ url: String(url), attempt: attempt + 1, nextAttempt: attempt + 2, error });
      if (signal?.aborted) throw abortReason(signal);
    }
  }
}

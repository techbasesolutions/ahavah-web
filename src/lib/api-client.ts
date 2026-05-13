/**
 * Thin fetch wrapper for the ahavah-api backend.
 *
 * Sets `credentials: 'include'` on every request so the `duo_session`
 * httpOnly cookie travels both ways. Returns parsed JSON typed as T.
 * Throws `ApiError` (with `.status` + `.body` + `.message`) on non-2xx.
 *
 * NO retry logic, NO caching, NO request deduplication. Keep it small.
 * If a feature needs retry/cache, do it at the hook layer (`useDiscoverDeck`,
 * `useInbox`, etc.), not in the transport.
 *
 * Base URL comes from `NEXT_PUBLIC_API_BASE_URL` at build time. In dev,
 * defaults to `http://localhost:5000` (the docker-compose default for the
 * api service).
 *
 * Multipart uploads use XMLHttpRequest (not fetch) because browsers do
 * not expose upload progress on `fetch()`. The `postMultipart` method has
 * the same return shape as `post` plus an optional `onProgress` callback.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body: unknown = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      isJson && body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${res.status} on ${res.url}`;
    throw new ApiError(res.status, body, message);
  }

  return body as T;
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  payload?: unknown,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const init: RequestInit = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (payload !== undefined) {
    init.body = JSON.stringify(payload);
  }
  const res = await fetch(url, init);
  return parseResponse<T>(res);
}

export type ProgressEvent = {
  loadedBytes: number;
  totalBytes: number;
};

export type MultipartOptions = {
  onProgress?: (event: ProgressEvent) => void;
};

function postMultipart<T>(
  path: string,
  formData: FormData,
  options?: MultipartOptions,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    if (options?.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          options.onProgress!({
            loadedBytes: e.loaded,
            totalBytes: e.total,
          });
        }
      };
    }

    xhr.onload = () => {
      const contentType = xhr.getResponseHeader("content-type") ?? "";
      const isJson = contentType.includes("application/json");
      let body: unknown = xhr.responseText;
      if (isJson) {
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          // Non-parseable JSON — leave body as raw text.
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as T);
      } else {
        const message =
          isJson && body && typeof body === "object" && "message" in body
            ? String((body as { message: unknown }).message)
            : `HTTP ${xhr.status} on ${url}`;
        reject(new ApiError(xhr.status, body, message));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError(0, null, `Network error on ${url}`));
    };

    xhr.send(formData);
  });
}

export const apiClient = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postMultipart,
};

export type ApiClient = typeof apiClient;

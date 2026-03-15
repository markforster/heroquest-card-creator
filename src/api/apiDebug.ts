"use client";

import type { AxiosError, AxiosResponse } from "axios";

import { isDebugToolsEnabled } from "@/lib/env";

type ApiLogEnvelope = {
  path?: string;
  request: {
    method?: string;
    params?: unknown;
    data?: unknown;
    headers?: unknown;
  };
  response: {
    status?: number;
    statusText?: string;
    headers?: unknown;
    data?: unknown;
  };
};

export function shouldLogFakeApi(): boolean {
  return isDebugToolsEnabled();
}

function getPath(response: AxiosResponse): string | undefined {
  const baseUrl = response.config.baseURL ?? "";
  const url = response.config.url ?? "";
  if (!baseUrl && !url) return undefined;
  if (!baseUrl) return url;
  if (!url) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

function isIndexedDbSource(headers: unknown): boolean {
  if (!headers || typeof headers !== "object") return false;
  const headerValue = (headers as Record<string, unknown>)["x-hqcc-source"];
  return typeof headerValue === "string" && headerValue.toLowerCase() === "indexeddb";
}

export function logFakeApiResponse(response: AxiosResponse): AxiosResponse {
  if (!isIndexedDbSource(response.headers)) return response;

  const payload: ApiLogEnvelope = {
    path: getPath(response),
    request: {
      method: response.config.method,
      params: response.config.params,
      data: response.config.data,
      headers: response.config.headers,
    },
    response: {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    },
  };

  console.debug("[api:local]", payload);
  return response;
}

export function logFakeApiError(error: AxiosError): Promise<never> {
  const response = error.response;
  if (response && isIndexedDbSource(response.headers)) {
    const payload: ApiLogEnvelope = {
      path: getPath(response),
      request: {
        method: response.config.method,
        params: response.config.params,
        data: response.config.data,
        headers: response.config.headers,
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      },
    };

    console.debug("[api:local]", payload);
  }

  return Promise.reject(error);
}

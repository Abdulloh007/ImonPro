import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

type ElectronBinaryPayload = {
  __electronBinary: true
  base64: string
  type?: string
}

type ElectronHttpResponse<T = unknown> = {
  data: T | ElectronBinaryPayload
  status: number
  statusText: string
  headers: Record<string, string>
  ok: boolean
}

type ElectronHttpBridge = {
  request: <T = unknown>(request: {
    url: string
    method?: string
    headers?: Record<string, string>
    data?: unknown
    responseType?: AxiosRequestConfig['responseType']
    timeout?: number
  }) => Promise<ElectronHttpResponse<T>>
}

declare global {
  interface Window {
    electronHttp?: ElectronHttpBridge
  }
}

function binaryPayloadToBlob(payload: ElectronBinaryPayload) {
  const binary = atob(payload.base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: payload.type || 'application/octet-stream' })
}

function binaryPayloadToArrayBuffer(payload: ElectronBinaryPayload) {
  const binary = atob(payload.base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

function normalizeHeaders(headers: AxiosRequestConfig['headers']) {
  if (!headers) {
    return {}
  }

  if (typeof (headers as { toJSON?: () => unknown }).toJSON === 'function') {
    return (headers as { toJSON: () => Record<string, string> }).toJSON()
  }

  return headers as Record<string, string>
}

function hasHeader(headers: Record<string, string>, headerName: string) {
  return Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase())
}

function setHeaderIfMissing(headers: Record<string, string>, headerName: string, value: string) {
  if (!hasHeader(headers, headerName)) {
    headers[headerName] = value
  }
}

function serializeElectronData(data: unknown, headers: Record<string, string>) {
  if (data == null) {
    return undefined
  }

  if (data instanceof URLSearchParams) {
    setHeaderIfMissing(headers, 'Content-Type', 'application/x-www-form-urlencoded;charset=utf-8')
    return data.toString()
  }

  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return Array.from(data.entries()).map(([key, value]) => ({
      key,
      value: value instanceof File
        ? {
            __electronFile: true,
            name: value.name,
            type: value.type,
            size: value.size
          }
        : value
    }))
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return data
  }

  if (typeof data === 'string' || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    return data
  }

  setHeaderIfMissing(headers, 'Content-Type', 'application/json;charset=utf-8')
  return JSON.stringify(data)
}

function sanitizeHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase() === 'authorization' ? '[masked]' : value
    ])
  )
}

function logElectronRequestError(payload: {
  url: string
  method?: string
  headers: Record<string, string>
  data?: unknown
  response?: ElectronHttpResponse | AxiosResponse
  error?: unknown
}) {
  console.error('[Electron HTTP] Request failed', {
    url: payload.url,
    method: payload.method || 'GET',
    headers: sanitizeHeaders(payload.headers),
    requestData: payload.data,
    status: payload.response?.status,
    statusText: payload.response?.statusText,
    responseHeaders: payload.response?.headers,
    responseData: payload.response?.data,
    error: payload.error
  })
}

async function request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  if (!window.electronHttp) {
    return axios.request<T>(config)
  }

  const url = axios.getUri(config)
  const headers = normalizeHeaders(config.headers)
  const requestData = serializeElectronData(config.data, headers)
  let response: ElectronHttpResponse<T>

  try {
    response = await window.electronHttp.request<T>({
      url,
      method: config.method,
      headers,
      data: requestData,
      responseType: config.responseType,
      timeout: config.timeout
    })
  } catch (error) {
    logElectronRequestError({
      url,
      method: config.method,
      headers,
      data: requestData,
      error
    })
    throw error
  }

  const data = response.data && typeof response.data === 'object' && '__electronBinary' in response.data
    ? config.responseType === 'arraybuffer'
      ? binaryPayloadToArrayBuffer(response.data)
      : binaryPayloadToBlob(response.data)
    : response.data

  const axiosResponse = {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config,
    request: null
  } as AxiosResponse<T>

  if (!response.ok) {
    const error = Object.assign(new Error(`Request failed with status code ${response.status}`), {
      response: axiosResponse,
      config,
      request: null
    })
    logElectronRequestError({
      url,
      method: config.method,
      headers,
      data: requestData,
      response: axiosResponse,
      error
    })
    throw error
  }

  return axiosResponse
}

export default {
  request,
  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: 'GET', url })
  },
  post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: 'POST', url, data })
  },
  put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: 'PUT', url, data })
  },
  patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: 'PATCH', url, data })
  },
  delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return request<T>({ ...config, method: 'DELETE', url })
  }
}

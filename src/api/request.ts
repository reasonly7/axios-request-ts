import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import { message as msg } from 'ant-design-vue'

export interface IResponseData<T> {
  data: T
  code: number
  success: boolean
  message?: string
}

export const getApiPrefix = () => import.meta.env.VITE_APP_API_PREFIX

/**
 * 接口响应值类型;
 * 当接口请求正常时，返回 T;
 * 当接口请求异常时，返回 undefined;
 */
export type ResponseType<T> = Promise<T | undefined>

/**
 * 基于 Axios 封装的 Http 请求类，在 Axios 的基础上，它还具有以下特性:
 * @特性1 在请求拦截器中处理授权;
 * @特性2 在响应拦截器中"分层处理"各种异常;
 * @特性3 接口不再返回 AxiosResponse, 而是返回 AxiosResponse.data.data,
 * 同时添加了一个"逃生舱"，用于返回 AxiosResponse，即:request.request({ ..., withAxiosResponse: true });
 * @特性4 内置了取消请求的方法:request.createAbortController;
 */
export class HttpRequest {
  /**
   * 这是 Axios 实例;
   * 在想要获取 AxiosResponse 时使用，比如:
   * 它会返回 AxiosResponse 包裹的 ResponseType
   */
  readonly instance: AxiosInstance

  constructor(config: AxiosRequestConfig) {
    this.instance = axios.create(config)

    // 请求拦截
    this.instance.interceptors.request.use(
      (config) => {
        // 这里添加授权相关的信息
        return config
      },

      (error: AxiosError) => {
        msg.error(`${error}(${error.status})`)
        console.error(error)
      },
    )

    // 响应拦截
    this.instance.interceptors.response.use(
      (response: AxiosResponse & { config: { withAxiosResponse?: boolean } }) => {
        // 非JSON类型，直接返回
        if (!response.headers['content-type']?.toString().includes('application/json')) {
          if (!response.config.withAxiosResponse) {
            return response.data
          } else {
            return response
          }
        }

        const { success, code: svrCode, message: svrMsg } = response.data as IResponseData<unknown>

        if (!success) {
          // 第一层: 自定义错误提示及错误码
          msg.error(`${svrMsg}(${svrCode})`)
        } else if (svrMsg) {
          // 操作成功的提示，比如“登录成功”
          msg.info(svrMsg)
        }

        // 实际使用时，大多数情况都不会用到 response, 所以默认只返回 response.data
        // 又因为后端规范了 ResponseData 的数据结构: IResponseData 👆🏻, 所以只需要返回 response.data.data 即可
        if (!response.config.withAxiosResponse) {
          return response.data.data
        } else {
          return response
        }
      },

      (error: AxiosError) => {
        let message = ''

        // 第二层: 异常 HTTP Status 下的自定义错误提示及错误码
        if (error.response?.data) {
          const {
            code: svrCode,
            message: svrMsg,
            success,
          } = error.response.data as IResponseData<unknown>
          if (success === false) {
            message = `${svrMsg}(${svrCode})`
          } else {
            // Error 时，success 必为 false，若为 true，则为 BUG
            message = '你找到了一个 BUG，请尽快联系管理员!(BUG)'
          }
        }
        // 第三层: HTTP Status & Status Text
        else if (error.response) {
          switch (error.response.status) {
            case 400:
              message = '请求错误(400)'
              break
            case 401:
              message = '未授权，请重新登录(401)'
              // 可以在这里触发重新登录逻辑
              break
            case 403:
              message = '拒绝访问(403)'
              break
            case 404:
              message = '请求的资源不存在(404)'
              break
            case 405:
              message = '请求方法不允许(405)'
              break
            case 408:
              message = '请求超时(408)'
              break
            case 500:
              message = '服务器内部错误(500)'
              break
            case 501:
              message = '服务未实现(501)'
              break
            case 502:
              message = '网关错误(502)'
              break
            case 503:
              message = '服务不可用(503)'
              break
            case 504:
              message = '网关超时(504)'
              break
            case 505:
              message = 'HTTP 版本不受支持(505)'
              break
            default:
              message = `${error.response.statusText}(${error.response.status})`
          }
        }
        // 第四层: 请求无响应
        else if (error.message || error.code) {
          message = `${error.message}(${error.code})`
        }
        // 第五层: 未知异常
        else {
          message = `${error}(???)`
        }

        msg.error(message)
        console.error(error)

        // return undefined
      },
    )
  }

  /**
   * 创建一个取消控制器;
   * 用于在某些情况下取消请求;
   */
  createAbortController() {
    return new AbortController()
  }

  getUri(...params: Parameters<AxiosInstance['getUri']>): string {
    return this.instance.getUri.call(this, ...params) as string
  }

  request<T = unknown, R = AxiosResponse<T>, D = unknown>(
    config: AxiosRequestConfig<D> & { withAxiosResponse?: boolean },
  ): Promise<R> {
    return this.instance.request.call(this, config) as Promise<R>
  }

  get<T>(...params: Parameters<AxiosInstance['get']>): ResponseType<T> {
    return this.instance.get.call(this, ...params) as ResponseType<T>
  }

  post<T>(...params: Parameters<AxiosInstance['post']>): ResponseType<T> {
    return this.instance.post.call(this, ...params) as ResponseType<T>
  }

  put<T>(...params: Parameters<AxiosInstance['put']>): ResponseType<T> {
    return this.instance.put.call(this, ...params) as ResponseType<T>
  }

  patch<T>(...params: Parameters<AxiosInstance['patch']>): ResponseType<T> {
    return this.instance.patch.call(this, ...params) as ResponseType<T>
  }

  delete<T>(...params: Parameters<AxiosInstance['delete']>): ResponseType<T> {
    return this.instance.delete.call(this, ...params) as ResponseType<T>
  }

  postForm<T>(...params: Parameters<AxiosInstance['postForm']>): ResponseType<T> {
    return this.instance.postForm.call(this, ...params) as ResponseType<T>
  }

  putForm<T>(...params: Parameters<AxiosInstance['putForm']>): ResponseType<T> {
    return this.instance.putForm.call(this, ...params) as ResponseType<T>
  }

  patchForm<T>(...params: Parameters<AxiosInstance['patchForm']>): ResponseType<T> {
    return this.instance.patchForm.call(this, ...params) as ResponseType<T>
  }
}

export const request = new HttpRequest({
  baseURL: getApiPrefix(),
  timeout: 30 * 1000,
})

declare module 'js-cookie' {
  type SameSite = 'strict' | 'lax' | 'none'

  interface CookieAttributes {
    expires?: number | Date
    path?: string
    sameSite?: SameSite
    secure?: boolean
  }

  const Cookies: {
    get(name: string): string | undefined
    set(name: string, value: string, attributes?: CookieAttributes): string | undefined
    remove(name: string, attributes?: CookieAttributes): void
  }

  export default Cookies
}

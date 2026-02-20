import type { TokenStorage } from './types'

export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null

  getAccessToken(): string | null {
    return this.accessToken
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }

  clearAccessToken(): void {
    this.accessToken = null
  }
}

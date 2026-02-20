export type PasswordPolicyResult = {
  score: number
  valid: boolean
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  let score = 0

  if (password.length >= 8) {
    score += 1
  }

  if (password.length >= 12) {
    score += 1
  }

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
    score += 1
  }

  if (/\d/.test(password)) {
    score += 1
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1
  }

  return {
    score,
    valid: password.length >= 8 && password.length <= 128 && score >= 3,
  }
}

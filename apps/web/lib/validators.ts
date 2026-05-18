export function isValidCuit(cuit: string): boolean {
  const digits = cuit.replace(/\D/g, '')
  if (digits.length !== 11) return false
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = multipliers.reduce((acc, m, i) => acc + parseInt(digits[i]) * m, 0)
  const remainder = sum % 11
  const check = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder
  return check === parseInt(digits[10])
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

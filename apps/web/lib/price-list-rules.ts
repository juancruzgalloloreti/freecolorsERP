export const CORE_PRICE_LIST_CODES = ['LP1', 'LP2', 'LP3', 'LP4', 'LP5', 'CR', 'CU'] as const

export function priceListCode(name: string) {
  const upper = String(name || '').toUpperCase()
  return CORE_PRICE_LIST_CODES.find((prefix) => upper.startsWith(`${prefix} `) || upper.startsWith(`${prefix} -`)) || null
}

export function isCorePriceList(list: { name: string }) {
  return Boolean(priceListCode(list.name))
}

export function corePriceLists<T extends { name: string }>(lists: T[]) {
  return lists.filter(isCorePriceList)
}

export function isAutomaticPriceList(name: string) {
  return ['LP2', 'LP3', 'LP4', 'LP5'].includes(priceListCode(name) || '')
}

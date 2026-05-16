export function formatMemoryFromKb(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null

  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} GB`
  }

  if (value >= 1024) {
    return `${(value / 1024).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })} MB`
  }

  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} KB`
}

export function formatMemoryLimitFromMb(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return formatMemoryFromKb(value * 1024)
}

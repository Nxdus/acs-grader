type LetsGoGlobalState = typeof globalThis & {
  __acsLetsGoEnabled?: boolean
}

const globalState = globalThis as LetsGoGlobalState

export function getLetsGoEnabled() {
  return globalState.__acsLetsGoEnabled ?? true
}

export function setLetsGoEnabled(enabled: boolean) {
  globalState.__acsLetsGoEnabled = enabled
  return enabled
}

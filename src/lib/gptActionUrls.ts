const FUNCTIONS_PATH = 'functions/v1'

export function buildGptActionUrl(functionName: string, baseUrl: string | undefined): string | null {
  if (!baseUrl) return null
  try {
    const normalized = new URL(baseUrl)
    return `${normalized.origin}/${FUNCTIONS_PATH}/${functionName}`
  } catch {
    return null
  }
}

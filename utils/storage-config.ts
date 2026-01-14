import { storage } from '#imports'

export interface Config {
  'local:intro-shown': boolean | null
  'local:oauth-token': string | null
}

export async function getConfig(): Promise<Config> {
  const items = await storage.getItems([
    'local:intro-shown',
    'local:oauth-token',
  ])

  const map = new Map<string, unknown>(
    items.map(({ key, value }: any) => [key, value]),
  )

  return {
    'local:intro-shown': (map.get('local:intro-shown') ?? null) as
    | boolean
    | null,
    'local:oauth-token': (map.get('local:oauth-token') ?? null) as
    | string
    | null,
  }
}

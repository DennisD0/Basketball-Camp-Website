import prisma from '@/lib/prisma'
import { DEFAULT_CONFIG, mergeConfig, type RegistrationConfig } from '@/lib/registration-config'

export const REGISTRATION_CONFIG_KEY = 'registration_config'

export async function getRegistrationConfig(): Promise<{ config: RegistrationConfig; custom: boolean }> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: REGISTRATION_CONFIG_KEY } })
    if (setting) {
      return { config: mergeConfig(JSON.parse(setting.value)), custom: true }
    }
  } catch (err) {
    console.error('[getRegistrationConfig]', err)
  }
  return { config: DEFAULT_CONFIG, custom: false }
}

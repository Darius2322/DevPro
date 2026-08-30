import { supabase } from './supabaseClient'

const DEVICE_ID_KEY = 'devpro-device-id'

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function friendlyLabel() {
  const ua = navigator.userAgent
  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad/i.test(ua)
  const isMac = /Macintosh/i.test(ua)
  const isWindows = /Windows/i.test(ua)
  const platform = isAndroid ? 'Android' : isIOS ? 'iOS' : isMac ? 'Mac' : isWindows ? 'Windows' : 'Unknown device'
  const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Browser'
  return `${browser} on ${platform}`
}

export function currentDeviceId() {
  return getDeviceId()
}

export async function recordDeviceSeen(userId) {
  if (!userId) return
  await supabase.from('devices').upsert(
    { user_id: userId, device_id: getDeviceId(), label: friendlyLabel(), last_seen_at: new Date().toISOString() },
    { onConflict: 'user_id,device_id' }
  )
}

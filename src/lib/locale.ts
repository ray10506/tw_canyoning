import { ref, watch } from 'vue'

const urlLang = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang')
export const locale = ref<'zh' | 'en'>(urlLang === 'en' ? 'en' : 'zh')

// Sync locale → URL so the link is shareable
watch(locale, (lang) => {
  const url = new URL(location.href)
  if (lang === 'zh') url.searchParams.delete('lang')
  else url.searchParams.set('lang', lang)
  history.replaceState(null, '', url)
})

/** Map Chinese region labels → English. Returns original string in zh mode. */
export function localeRegion(text: string): string {
  if (locale.value === 'zh' || !text) return text
  return CITY_EN[text] ?? REGION_LABEL_EN[text] ?? text
}

/** Pick zh/en text for the current locale, in place of a `locale === 'en' ? en : zh` ternary. */
export function t(zh: string, en: string): string {
  return locale.value === 'en' ? en : zh
}

const REGION_LABEL_EN: Record<string, string> = {
  '北部': 'North', '中部': 'Central', '南部': 'South', '東部': 'East',
}

const CITY_EN: Record<string, string> = {
  '新北市': 'New Taipei', '台北市': 'Taipei',  '臺北市': 'Taipei',
  '基隆市': 'Keelung',   '桃園市': 'Taoyuan',  '新竹縣': 'Hsinchu Co.',
  '新竹市': 'Hsinchu',   '宜蘭縣': 'Yilan',
  '苗栗縣': 'Miaoli',    '台中市': 'Taichung', '臺中市': 'Taichung',
  '彰化縣': 'Changhua',  '南投縣': 'Nantou',   '雲林縣': 'Yunlin',
  '嘉義縣': 'Chiayi Co.','嘉義市': 'Chiayi',
  '台南市': 'Tainan',    '臺南市': 'Tainan',   '高雄市': 'Kaohsiung',
  '屏東縣': 'Pingtung',  '澎湖縣': 'Penghu',
  '花蓮縣': 'Hualien',   '台東縣': 'Taitung',  '臺東縣': 'Taitung',
}

/** Readable, localized text for a failed data load: offline, timeout and malformed responses read differently. */
export function loadErrorText(e: unknown, source: string): string {
  const name = e instanceof Error ? e.name : ''
  if (name === 'TimeoutError')
    return t(`${source} 回應逾時，請稍後重試。`, `${source} took too long to respond. Try again shortly.`)
  if (name === 'TypeError' || !navigator.onLine)
    return t('無法連線，請確認網路後重試。', 'Could not connect. Check your network and retry.')
  if (name === 'SyntaxError')
    return t(`${source} 回傳的資料格式異常。`, `${source} returned data in an unexpected format.`)
  return e instanceof Error && e.message ? e.message : t(`${source} 暫時無法提供資料。`, `${source} data is temporarily unavailable.`)
}

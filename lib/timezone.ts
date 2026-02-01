// 获取北京时间的当前日期（YYYY-MM-DD格式）
export function getBeijingDateStr(): string {
  const now = new Date()
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  const y = beijingTime.getFullYear()
  const m = String(beijingTime.getMonth() + 1).padStart(2, '0')
  const d = String(beijingTime.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 获取北京时间的当前 Date 对象（时分秒归零）
export function getBeijingToday(): Date {
  const now = new Date()
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  beijingTime.setHours(0, 0, 0, 0)
  return beijingTime
}

// 判断某个日期是否是北京时间的今天
export function isBeijingToday(date: Date): boolean {
  const todayStr = getBeijingDateStr()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}` === todayStr
}

// 格式化日期显示（强制北京时区）
export function formatDateBeijing(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 获取北京时间 N 天后的日期字符串
export function getBeijingDateStrOffset(days: number): string {
  const now = new Date()
  const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }))
  beijingTime.setDate(beijingTime.getDate() + days)
  const y = beijingTime.getFullYear()
  const m = String(beijingTime.getMonth() + 1).padStart(2, '0')
  const d = String(beijingTime.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

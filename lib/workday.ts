// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isWorkday } = require('chinese-workday') as { isWorkday: (day: string | Date) => boolean }

/**
 * 计算从startDate开始，加上durationWorkdays个工作日后的日期
 * @param startDate 开始日期
 * @param durationWorkdays 工作日天数
 * @returns 计划结束日期
 */
export function calculatePlanEndDate(
  startDate: Date,
  durationWorkdays: number
): Date {
  if (durationWorkdays <= 0) {
    return startDate
  }

  let currentDate = new Date(startDate)
  let workdaysAdded = 0

  // 如果开始日期本身是工作日，则算作第一个工作日
  if (isWorkday(currentDate)) {
    workdaysAdded = 1
  }

  // 继续添加工作日直到达到目标天数
  while (workdaysAdded < durationWorkdays) {
    currentDate.setDate(currentDate.getDate() + 1)
    if (isWorkday(currentDate)) {
      workdaysAdded++
    }
  }

  return currentDate
}

/**
 * 计算两个日期之间的工作日天数
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 工作日天数
 */
export function calculateWorkdaysBetween(
  startDate: Date,
  endDate: Date
): number {
  if (startDate > endDate) {
    return 0
  }

  let currentDate = new Date(startDate)
  let workdays = 0

  while (currentDate <= endDate) {
    if (isWorkday(currentDate)) {
      workdays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return workdays
}

/**
 * 计算两个日期之间的自然日天数
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 自然日天数
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

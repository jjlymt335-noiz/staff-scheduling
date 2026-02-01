/**
 * 任务时间重叠检测工具函数
 */

/**
 * 检查两个任务的时间范围是否重叠（考虑半天时段）
 * @returns true 如果有重叠，false 如果没有重叠
 */
export function checkTaskOverlap(
  start1: Date,
  startSlot1: string,
  end1: Date,
  endSlot1: string,
  start2: Date,
  startSlot2: string,
  end2: Date,
  endSlot2: string
): boolean {
  // 将日期和时段转换为可比较的格式
  const getComparableValue = (date: Date, slot: string): string => {
    const dateStr = date.toISOString().split('T')[0]
    const slotValue = slot === 'MORNING' ? '0' : '1'
    return `${dateStr}.${slotValue}`
  }

  const task1Start = getComparableValue(start1, startSlot1)
  const task1End = getComparableValue(end1, endSlot1)
  const task2Start = getComparableValue(start2, startSlot2)
  const task2End = getComparableValue(end2, endSlot2)

  // 检查是否重叠：两个任务重叠当且仅当一个任务的开始时间早于另一个任务的结束时间，且反之亦然
  // 不重叠的情况：task1完全在task2之前，或task2完全在task1之前
  return !(task1End < task2Start || task2End < task1Start)
}

/**
 * 获取多个任务重叠时的最早结束时间
 * @param tasks 任务数组
 * @returns 最早的结束时间和时段，如果数组为空则返回null
 */
export function getOverlapEndTime(
  tasks: Array<{
    planStartDate: Date
    startTimeSlot: string
    planEndDate: Date
    endTimeSlot: string
  }>
): { date: Date; slot: string } | null {
  if (tasks.length === 0) return null

  // 找到最早的结束时间
  let earliestEnd = tasks[0]
  for (let i = 1; i < tasks.length; i++) {
    const current = tasks[i]
    const currentEndDate = current.planEndDate.toISOString().split('T')[0]
    const earliestEndDate = earliestEnd.planEndDate.toISOString().split('T')[0]

    // 比较日期，如果日期相同则比较时段
    if (
      currentEndDate < earliestEndDate ||
      (currentEndDate === earliestEndDate &&
        current.endTimeSlot === 'MORNING' &&
        earliestEnd.endTimeSlot === 'AFTERNOON')
    ) {
      earliestEnd = current
    }
  }

  return {
    date: earliestEnd.planEndDate,
    slot: earliestEnd.endTimeSlot,
  }
}

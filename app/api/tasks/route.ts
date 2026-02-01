import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePlanEndDate } from '@/lib/workday'
import { checkTaskOverlap, getOverlapEndTime } from '@/lib/taskUtils'

// GET /api/tasks - 获取所有任务
export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { priority: 'asc' },
      include: {
        user: true,
        requirement: {
          include: {
            project: true as any,
          },
        },
      },
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// 检查两个时段是否冲突（半天粒度）
function checkTimeSlotConflict(
  start1: Date,
  slot1Start: string,
  end1: Date,
  slot1End: string,
  start2: Date,
  slot2Start: string,
  end2: Date,
  slot2End: string
): boolean {
  const date1Start = start1.toISOString().split('T')[0]
  const date1End = end1.toISOString().split('T')[0]
  const date2Start = start2.toISOString().split('T')[0]
  const date2End = end2.toISOString().split('T')[0]

  // 如果日期完全不重叠，则不冲突
  if (date1End < date2Start || date2End < date1Start) {
    return false
  }

  // 如果只有一天重叠，检查时段
  if (date1Start === date1End && date2Start === date2End && date1Start === date2Start) {
    // 两个任务都在同一天
    // 上午-上午冲突，下午-下午冲突，上午-下午不冲突
    if (slot1Start === 'MORNING' && slot1End === 'MORNING') {
      if (slot2Start === 'MORNING' || (slot2Start === 'MORNING' && slot2End === 'AFTERNOON')) {
        return true
      }
    }
    if (slot1Start === 'AFTERNOON' && slot1End === 'AFTERNOON') {
      if (slot2End === 'AFTERNOON' || (slot2Start === 'MORNING' && slot2End === 'AFTERNOON')) {
        return true
      }
    }
    if (slot1Start === 'MORNING' && slot1End === 'AFTERNOON') {
      // 全天任务，与任何时段都冲突
      return true
    }
    return false
  }

  // 复杂情况：检查每个半天是否冲突
  // 简化处理：如果日期有重叠，就认为冲突（可以后续优化为更精确的半天检测）
  return true
}

// POST /api/tasks - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      type,
      requirementId,
      userId,
      priority,
      planStartDate,
      startTimeSlot,
      durationWorkdays,
      endTimeSlot,
      forecastEndDate,
      status,
      links,
    } = body

    // 验证必填字段
    if (
      !title ||
      !type ||
      !userId ||
      priority === undefined ||
      !planStartDate ||
      !durationWorkdays
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 验证优先级范围
    if (priority < 0 || priority > 5) {
      return NextResponse.json(
        { error: 'Priority must be between 0 and 5' },
        { status: 400 }
      )
    }

    // 验证类型
    if (!['IN_REQUIREMENT', 'STANDALONE'].includes(type)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    // 验证时段
    const validSlots = ['MORNING', 'AFTERNOON']
    const finalStartSlot = startTimeSlot || 'MORNING'
    const finalEndSlot = endTimeSlot || 'AFTERNOON'

    if (!validSlots.includes(finalStartSlot) || !validSlots.includes(finalEndSlot)) {
      return NextResponse.json({ error: 'Invalid time slot' }, { status: 400 })
    }

    // 如果是需求内任务，必须提供requirementId
    if (type === 'IN_REQUIREMENT' && !requirementId) {
      return NextResponse.json(
        { error: 'requirementId is required for IN_REQUIREMENT tasks' },
        { status: 400 }
      )
    }

    // 计算planEndDate
    const startDate = new Date(planStartDate)
    const endDate = calculatePlanEndDate(startDate, durationWorkdays)

    // 如果任务属于需求，检查任务时间是否在需求时间范围内
    if (requirementId) {
      const requirement = await prisma.requirement.findUnique({
        where: { id: requirementId },
      }) as any

      if (!requirement) {
        return NextResponse.json(
          { error: '需求不存在' },
          { status: 400 }
        )
      }

      if (requirement.startDate && requirement.endDate) {
        const taskStart = startDate
        const taskEnd = endDate
        const reqStart = new Date(requirement.startDate)
        const reqEnd = new Date(requirement.endDate)

        // 将日期设置为同一时间以便比较
        taskStart.setHours(0, 0, 0, 0)
        taskEnd.setHours(0, 0, 0, 0)
        reqStart.setHours(0, 0, 0, 0)
        reqEnd.setHours(0, 0, 0, 0)

        if (taskStart < reqStart || taskEnd > reqEnd) {
          const taskStartStr = taskStart.toISOString().split('T')[0]
          const taskEndStr = taskEnd.toISOString().split('T')[0]
          const reqStartStr = reqStart.toISOString().split('T')[0]
          const reqEndStr = reqEnd.toISOString().split('T')[0]

          return NextResponse.json(
            {
              error: `任务时间（${taskStartStr} 至 ${taskEndStr}）必须在需求时间（${reqStartStr} 至 ${reqEndStr}）范围内。`,
            },
            { status: 400 }
          )
        }
      }
    }

    // 检查时间冲突（同一需求 + 同一人 + 时间重叠）
    if (requirementId) {
      const conflictingTasks = await prisma.task.findMany({
        where: {
          requirementId,
          userId,
          id: { not: body.id || '' }, // 排除自己（用于更新时）
        },
      })

      for (const task of conflictingTasks) {
        const taskStart = new Date(task.planStartDate)
        const taskEnd = new Date(task.planEndDate)

        // 使用半天粒度检查冲突
        if (
          checkTimeSlotConflict(
            startDate,
            finalStartSlot,
            endDate,
            finalEndSlot,
            taskStart,
            task.startTimeSlot,
            taskEnd,
            task.endTimeSlot
          )
        ) {
          const taskStartStr = task.planStartDate.toISOString().split('T')[0]
          const taskEndStr = task.planEndDate.toISOString().split('T')[0]
          const slotStr = task.startTimeSlot === 'MORNING' ? '上午' : '下午'
          return NextResponse.json(
            {
              error: `时间冲突：该用户在同一需求下已有任务在 ${taskStartStr} ${slotStr} 至 ${taskEndStr} ${task.endTimeSlot === 'MORNING' ? '上午' : '下午'}`,
            },
            { status: 400 }
          )
        }
      }
    }

    // 检查并发任务限制（每人同时最多2个任务，且必须有不同优先级）
    const userTasks = await prisma.task.findMany({
      where: {
        userId,
        id: { not: body.id || '' }, // 排除自己（用于更新时）
      },
      orderBy: { priority: 'asc' },
    })

    // 找出与新任务时间重叠的任务
    const overlappingTasks = userTasks.filter((task) => {
      return checkTaskOverlap(
        startDate,
        finalStartSlot,
        endDate,
        finalEndSlot,
        new Date(task.planStartDate),
        task.startTimeSlot,
        new Date(task.planEndDate),
        task.endTimeSlot
      )
    })

    // 如果已有2个任务重叠，拒绝第3个
    if (overlappingTasks.length >= 2) {
      const overlapEnd = getOverlapEndTime([
        ...overlappingTasks.slice(0, 2).map((t) => ({
          planStartDate: new Date(t.planStartDate),
          startTimeSlot: t.startTimeSlot,
          planEndDate: new Date(t.planEndDate),
          endTimeSlot: t.endTimeSlot,
        })),
        {
          planStartDate: startDate,
          startTimeSlot: finalStartSlot,
          planEndDate: endDate,
          endTimeSlot: finalEndSlot,
        },
      ])

      if (overlapEnd) {
        const endDateStr = overlapEnd.date.toISOString().split('T')[0]
        const endSlotStr = overlapEnd.slot === 'MORNING' ? '上午' : '下午'

        return NextResponse.json(
          {
            error: `该用户在此期间已有2个任务，无法添加第3个并发任务。建议将新任务的开始时间设置在 ${endDateStr} ${endSlotStr} 之后。`,
            suggestedStartDate: endDateStr,
            suggestedStartSlot: overlapEnd.slot,
          },
          { status: 400 }
        )
      }
    }

    // 如果有1个重叠任务，必须有不同优先级
    if (overlappingTasks.length === 1) {
      if (overlappingTasks[0].priority === priority) {
        return NextResponse.json(
          {
            error: `并发任务必须有不同的优先级。已存在优先级为 ${priority} 的任务在此期间执行。`,
          },
          { status: 400 }
        )
      }
    }

    // 创建任务
    const task = await prisma.task.create({
      data: {
        title,
        type,
        requirementId: type === 'IN_REQUIREMENT' ? requirementId : null,
        userId,
        priority,
        planStartDate: startDate,
        startTimeSlot: finalStartSlot,
        durationWorkdays,
        planEndDate: endDate,
        endTimeSlot: finalEndSlot,
        forecastEndDate: forecastEndDate ? new Date(forecastEndDate) : null,
        status: status || 'TODO',
        links: links || null,
      },
      include: {
        user: true,
        requirement: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

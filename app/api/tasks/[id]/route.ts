import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculatePlanEndDate } from '@/lib/workday'
import { checkTaskOverlap, getOverlapEndTime } from '@/lib/taskUtils'

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

  if (date1End < date2Start || date2End < date1Start) {
    return false
  }

  if (date1Start === date1End && date2Start === date2End && date1Start === date2Start) {
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
      return true
    }
    return false
  }

  return true
}

// GET single task
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: true,
        requirement: {
          include: {
            project: true as any
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

// PUT (update) task
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
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
      remarks,
    } = body

    // Validation
    if (
      !title ||
      !type ||
      !userId ||
      priority === undefined ||
      !planStartDate ||
      !durationWorkdays
    ) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    if (priority < 0 || priority > 5) {
      return NextResponse.json(
        { error: '优先级必须在0-5之间' },
        { status: 400 }
      )
    }

    if (!['IN_REQUIREMENT', 'STANDALONE'].includes(type)) {
      return NextResponse.json({ error: '无效的任务类型' }, { status: 400 })
    }

    const validSlots = ['MORNING', 'AFTERNOON']
    const finalStartSlot = startTimeSlot || 'MORNING'
    const finalEndSlot = endTimeSlot || 'AFTERNOON'

    if (!validSlots.includes(finalStartSlot) || !validSlots.includes(finalEndSlot)) {
      return NextResponse.json({ error: '无效的时段' }, { status: 400 })
    }

    if (type === 'IN_REQUIREMENT' && !requirementId) {
      return NextResponse.json(
        { error: '需求内任务必须指定需求ID' },
        { status: 400 }
      )
    }

    // Calculate planEndDate
    const startDate = new Date(planStartDate)
    const endDate = calculatePlanEndDate(startDate, durationWorkdays)

    // Check task time is within requirement time
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

    // Check time conflicts (same requirement + same user + overlapping time)
    if (requirementId) {
      const conflictingTasks = await prisma.task.findMany({
        where: {
          requirementId,
          userId,
          id: { not: id },
        },
      })

      for (const task of conflictingTasks) {
        const taskStart = new Date(task.planStartDate)
        const taskEnd = new Date(task.planEndDate)

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

    // Check concurrent task limit (max 2 tasks, different priorities required)
    const userTasks = await prisma.task.findMany({
      where: {
        userId,
        id: { not: id },
      },
      orderBy: { priority: 'asc' },
    })

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

    // Update task
    const task = await prisma.task.update({
      where: { id },
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
        ...(remarks !== undefined && { remarks: remarks || null }),
      },
      include: {
        user: true,
        requirement: {
          include: {
            project: true as any
          }
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Failed to update task:', error)
    return NextResponse.json(
      { error: '更新任务失败' },
      { status: 500 }
    )
  }
}

// DELETE task
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    await prisma.task.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete task:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: `删除任务失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}

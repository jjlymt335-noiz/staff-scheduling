import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single requirement
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        project: true,
        tasks: {
          include: {
            user: true
          }
        },
        stages: true
      }
    })

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requirement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(requirement)
  } catch (error) {
    console.error('Failed to fetch requirement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requirement' },
      { status: 500 }
    )
  }
}

// PUT (update) requirement
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { title, priority, projectId, startDate, endDate, links, remarks } = body

    // Validation
    if (!title || priority === undefined) {
      return NextResponse.json(
        { error: '需求标题和优先级不能为空' },
        { status: 400 }
      )
    }

    if (priority < 0 || priority > 5) {
      return NextResponse.json(
        { error: '优先级必须在0-5之间' },
        { status: 400 }
      )
    }

    // If requirement has a project, check time constraints
    if (projectId && startDate && endDate) {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      }) as any

      if (project && project.startDate && project.endDate) {
        const reqStart = new Date(startDate)
        const reqEnd = new Date(endDate)
        const projStart = new Date(project.startDate)
        const projEnd = new Date(project.endDate)

        if (reqStart < projStart || reqEnd > projEnd) {
          return NextResponse.json(
            {
              error: `需求时间（${startDate} 至 ${endDate}）必须在项目时间（${projStart.toISOString().split('T')[0]} 至 ${projEnd.toISOString().split('T')[0]}）范围内。`
            },
            { status: 400 }
          )
        }
      }

      // Check for time overlap with other requirements in the same project
      const existingRequirements = await prisma.requirement.findMany({
        where: {
          projectId,
          id: { not: id }
        }
      }) as any[]

      for (const req of existingRequirements) {
        if (req.startDate && req.endDate) {
          const newStart = new Date(startDate)
          const newEnd = new Date(endDate)
          const existingStart = new Date(req.startDate)
          const existingEnd = new Date(req.endDate)

          if (!(newEnd < existingStart || newStart > existingEnd)) {
            return NextResponse.json(
              {
                error: `需求时间与已存在的需求"${req.title}"（${existingStart.toISOString().split('T')[0]} 至 ${existingEnd.toISOString().split('T')[0]}）重叠。项目内的需求时间不能重叠。`
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // Check that all tasks are within the new time range
    if (startDate && endDate) {
      const reqStart = new Date(startDate)
      const reqEnd = new Date(endDate)

      const tasks = await prisma.task.findMany({
        where: { requirementId: id }
      })

      for (const task of tasks) {
        const taskStart = new Date(task.planStartDate)
        const taskEnd = new Date(task.planEndDate)

        if (taskStart < reqStart || taskEnd > reqEnd) {
          return NextResponse.json(
            {
              error: `无法更新需求时间：任务"${task.title}"（${taskStart.toISOString().split('T')[0]} 至 ${taskEnd.toISOString().split('T')[0]}）超出了新的需求时间范围。`
            },
            { status: 400 }
          )
        }
      }
    }

    const requirement = await prisma.requirement.update({
      where: { id: id },
      data: {
        title,
        priority,
        projectId: projectId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ...(links !== undefined && { links: links || null }),
        ...(remarks !== undefined && { remarks: remarks || null }),
      }
    })

    return NextResponse.json(requirement)
  } catch (error) {
    console.error('Failed to update requirement:', error)
    return NextResponse.json(
      { error: '更新需求失败' },
      { status: 500 }
    )
  }
}

// DELETE requirement (cascading delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    // Get all tasks and stages under this requirement
    const tasks = await prisma.task.findMany({
      where: { requirementId: id }
    })

    const stages = await prisma.stage.findMany({
      where: { requirementId: id }
    })

    // Cascading delete: delete all child items
    // 1. Delete all tasks
    if (tasks.length > 0) {
      await prisma.task.deleteMany({
        where: { requirementId: id }
      })
    }

    // 2. Delete all stage assignments first (foreign key constraint)
    if (stages.length > 0) {
      for (const stage of stages) {
        await prisma.stageAssignment.deleteMany({
          where: { stageId: stage.id }
        })
      }

      // Then delete all stages
      await prisma.stage.deleteMany({
        where: { requirementId: id }
      })
    }

    // 3. Finally, delete the requirement
    await prisma.requirement.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      deletedItems: {
        tasks: tasks.length,
        stages: stages.length
      }
    })
  } catch (error) {
    console.error('Failed to delete requirement:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: `删除需求失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}

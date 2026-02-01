import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single project
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        requirements: {
          include: {
            tasks: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT (update) project
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { title, description, priority, startDate, endDate, links, remarks } = body

    // Validation
    if (!title || priority === undefined) {
      return NextResponse.json(
        { error: '项目名称和优先级不能为空' },
        { status: 400 }
      )
    }

    if (priority < 0 || priority > 5) {
      return NextResponse.json(
        { error: '优先级必须在0-5之间' },
        { status: 400 }
      )
    }

    // If project has time range, check that all requirements are within range
    if (startDate && endDate) {
      const projStart = new Date(startDate)
      const projEnd = new Date(endDate)

      const requirements = await prisma.requirement.findMany({
        where: { projectId: id }
      })

      for (const req of requirements) {
        if (req.startDate && req.endDate) {
          const reqStart = new Date(req.startDate)
          const reqEnd = new Date(req.endDate)

          if (reqStart < projStart || reqEnd > projEnd) {
            return NextResponse.json(
              {
                error: `无法更新项目时间：需求"${req.title}"（${reqStart.toISOString().split('T')[0]} 至 ${reqEnd.toISOString().split('T')[0]}）超出了新的项目时间范围。`
              },
              { status: 400 }
            )
          }
        }
      }
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        title,
        description,
        priority,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ...(links !== undefined && { links: links || null }),
        ...(remarks !== undefined && { remarks: remarks || null }),
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    )
  }
}

// DELETE project (cascading delete)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    // Get all requirements under this project
    const requirements = await prisma.requirement.findMany({
      where: { projectId: id },
      include: {
        tasks: true,
        stages: true
      }
    })

    // Cascading delete: delete all child items
    // 1. Delete all tasks under all requirements
    for (const req of requirements) {
      if (req.tasks.length > 0) {
        await prisma.task.deleteMany({
          where: { requirementId: req.id }
        })
      }

      // 2. Delete all stage assignments first (foreign key constraint)
      if (req.stages.length > 0) {
        for (const stage of req.stages) {
          await prisma.stageAssignment.deleteMany({
            where: { stageId: stage.id }
          })
        }

        // Then delete all stages
        await prisma.stage.deleteMany({
          where: { requirementId: req.id }
        })
      }
    }

    // 3. Delete all requirements
    if (requirements.length > 0) {
      await prisma.requirement.deleteMany({
        where: { projectId: id }
      })
    }

    // 4. Finally, delete the project
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      deletedItems: {
        requirements: requirements.length,
        tasks: requirements.reduce((sum, req) => sum + req.tasks.length, 0)
      }
    })
  } catch (error) {
    console.error('Failed to delete project:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: `删除项目失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}

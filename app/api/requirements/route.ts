import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/requirements - 获取所有需求
export async function GET() {
  try {
    const requirements = await prisma.requirement.findMany({
      orderBy: { priority: 'asc' },
      include: {
        tasks: true,
      },
    })
    return NextResponse.json(requirements)
  } catch (error) {
    console.error('Error fetching requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requirements' },
      { status: 500 }
    )
  }
}

// POST /api/requirements - 创建新需求
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, priority, projectId, startDate, endDate } = body

    if (!title || priority === undefined) {
      return NextResponse.json(
        { error: 'Title and priority are required' },
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

    // 如果有projectId，检查项目时间和需求时间重叠
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      // 检查需求时间是否在项目时间范围内
      if (startDate && endDate && project.startDate && project.endDate) {
        const reqStart = new Date(startDate)
        const reqEnd = new Date(endDate)
        const projStart = new Date(project.startDate)
        const projEnd = new Date(project.endDate)

        if (reqStart < projStart || reqEnd > projEnd) {
          return NextResponse.json(
            {
              error: `需求时间（${reqStart.toISOString().split('T')[0]} 至 ${reqEnd.toISOString().split('T')[0]}）必须在项目时间（${projStart.toISOString().split('T')[0]} 至 ${projEnd.toISOString().split('T')[0]}）范围内。`
            },
            { status: 400 }
          )
        }
      }

      // 检查该项目下的需求时间是否重叠
      if (startDate && endDate) {
        const existingRequirements = await prisma.requirement.findMany({
          where: {
            projectId,
          }
        })

        for (const req of existingRequirements) {
          if (req.startDate && req.endDate) {
            const newStart = new Date(startDate)
            const newEnd = new Date(endDate)
            const existingStart = new Date(req.startDate)
            const existingEnd = new Date(req.endDate)

            // 检查时间是否重叠：两个时间段重叠当且仅当不满足"一个完全在另一个之前"
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
    }

    const requirement = await prisma.requirement.create({
      data: {
        title,
        priority,
        projectId: projectId || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
    })

    return NextResponse.json(requirement, { status: 201 })
  } catch (error) {
    console.error('Error creating requirement:', error)
    return NextResponse.json(
      { error: 'Failed to create requirement' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects - 获取所有项目及其需求、阶段信息
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { title: 'asc' },
      include: {
        requirements: {
          include: {
            stages: {
              include: {
                assignments: {
                  include: { user: true }
                }
              },
              orderBy: { order: 'asc' }
            },
            tasks: true
          }
        }
      }
    })
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - 创建新项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, priority, startDate, endDate, links } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        title,
        description,
        priority: priority ?? 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        links: links || null
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCode, CODE_PREFIX } from '@/lib/codeGenerator'

// POST /api/migrate-codes - 为现有数据生成编号
export async function POST() {
  try {
    const results = {
      projects: 0,
      requirements: 0,
      tasks: 0
    }

    // 迁移项目编号
    const allProjects = await prisma.project.findMany({
      orderBy: { createdAt: 'asc' }
    })
    const projectsWithoutCode = allProjects.filter(p => !p.code)

    for (const project of projectsWithoutCode) {
      const maxSeq = await prisma.project.findFirst({
        where: { seqNumber: { gt: 0 } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.project.update({
        where: { id: project.id },
        data: {
          code: generateCode(CODE_PREFIX.PROJECT, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.projects++
    }

    // 迁移需求编号
    const allRequirements = await prisma.requirement.findMany({
      orderBy: { createdAt: 'asc' }
    })
    const requirementsWithoutCode = allRequirements.filter(r => !r.code)

    for (const requirement of requirementsWithoutCode) {
      const maxSeq = await prisma.requirement.findFirst({
        where: { seqNumber: { gt: 0 } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.requirement.update({
        where: { id: requirement.id },
        data: {
          code: generateCode(CODE_PREFIX.REQUIREMENT, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.requirements++
    }

    // 迁移任务编号
    const allTasks = await prisma.task.findMany({
      orderBy: { createdAt: 'asc' }
    })
    const tasksWithoutCode = allTasks.filter(t => !t.code)

    for (const task of tasksWithoutCode) {
      const maxSeq = await prisma.task.findFirst({
        where: { seqNumber: { gt: 0 } },
        orderBy: { seqNumber: 'desc' },
        select: { seqNumber: true }
      })
      const nextSeq = (maxSeq?.seqNumber || 0) + 1

      await prisma.task.update({
        where: { id: task.id },
        data: {
          code: generateCode(CODE_PREFIX.TASK, nextSeq),
          seqNumber: nextSeq
        }
      })
      results.tasks++
    }

    return NextResponse.json({
      success: true,
      message: '迁移完成',
      migrated: results
    })
  } catch (error) {
    console.error('Error migrating codes:', error)
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    return NextResponse.json(
      { error: `迁移失败: ${errorMessage}` },
      { status: 500 }
    )
  }
}

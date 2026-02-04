import { prisma } from './prisma'

// 编号前缀常量
export const CODE_PREFIX = {
  PROJECT: 'P',
  REQUIREMENT: 'R',
  TASK: 'T'
} as const

// 生成格式化编号
export function generateCode(prefix: string, seqNumber: number): string {
  return `${prefix}-${String(seqNumber).padStart(3, '0')}`
}

// 获取下一个项目序列号并生成编号
export async function getNextProjectCode(): Promise<{ code: string; seqNumber: number }> {
  const maxSeq = await prisma.project.findFirst({
    orderBy: { seqNumber: 'desc' },
    select: { seqNumber: true }
  })
  const nextSeq = (maxSeq?.seqNumber || 0) + 1
  return {
    code: generateCode(CODE_PREFIX.PROJECT, nextSeq),
    seqNumber: nextSeq
  }
}

// 获取下一个需求序列号并生成编号
export async function getNextRequirementCode(): Promise<{ code: string; seqNumber: number }> {
  const maxSeq = await prisma.requirement.findFirst({
    orderBy: { seqNumber: 'desc' },
    select: { seqNumber: true }
  })
  const nextSeq = (maxSeq?.seqNumber || 0) + 1
  return {
    code: generateCode(CODE_PREFIX.REQUIREMENT, nextSeq),
    seqNumber: nextSeq
  }
}

// 获取下一个任务序列号并生成编号
export async function getNextTaskCode(): Promise<{ code: string; seqNumber: number }> {
  const maxSeq = await prisma.task.findFirst({
    orderBy: { seqNumber: 'desc' },
    select: { seqNumber: true }
  })
  const nextSeq = (maxSeq?.seqNumber || 0) + 1
  return {
    code: generateCode(CODE_PREFIX.TASK, nextSeq),
    seqNumber: nextSeq
  }
}

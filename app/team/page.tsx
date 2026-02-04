'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBeijingToday, formatDateBeijing } from '@/lib/timezone'
import { Button } from '@/components/ui'
import { CodeBadge, PriorityBadge, AssigneeAvatar } from '@/components/issue'

interface User {
  id: string
  name: string
  role: string
}

interface PredecessorInfo {
  predecessor: {
    id: string
    code: string
    title: string
    status: string
    user?: { id: string; name: string }
  }
}

interface Task {
  id: string
  code: string
  title: string
  type: string
  priority: number
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  requirement: {
    id: string
    code?: string
    title: string
    project: {
      id: string
      code?: string
      title: string
    } | null
  } | null
  user: User
  predecessors?: PredecessorInfo[]
}

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const roleOrder = [
    'MANAGEMENT',
    'FRONTEND',
    'BACKEND',
    'PRODUCT',
    'OPERATIONS',
    'STRATEGY',
  ]
  const roleLabels: Record<string, string> = {
    MANAGEMENT: '管理',
    FRONTEND: '前端',
    BACKEND: '后端',
    PRODUCT: '产品',
    OPERATIONS: '运营',
    STRATEGY: '战略',
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
      ])
      const usersData = await usersRes.json()
      const tasksData = await tasksRes.json()
      setUsers(usersData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (response.ok) {
        fetchData()
        alert('任务删除成功！')
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      alert('删除失败，请重试')
    }
  }

  const getCurrentAndNextTasks = (userId: string) => {
    const today = getBeijingToday()

    const todayTasks = tasks
      .filter((task) => {
        if (task.user.id !== userId) return false
        const startDate = new Date(task.planStartDate)
        startDate.setHours(0, 0, 0, 0)

        let effectiveEnd: Date
        if (task.actualEndDate) {
          effectiveEnd = new Date(task.actualEndDate)
        } else if (task.forecastEndDate) {
          effectiveEnd = new Date(task.forecastEndDate)
        } else {
          effectiveEnd = new Date(task.planEndDate)
        }
        effectiveEnd.setHours(0, 0, 0, 0)

        return today >= startDate && today <= effectiveEnd
      })
      .sort((a, b) => a.priority - b.priority)

    const futureTasks = tasks
      .filter((task) => {
        if (task.user.id !== userId) return false
        const startDate = new Date(task.planStartDate)
        startDate.setHours(0, 0, 0, 0)
        return startDate > today
      })
      .sort((a, b) => {
        const timeCompare = new Date(a.planStartDate).getTime() - new Date(b.planStartDate).getTime()
        if (timeCompare !== 0) return timeCompare
        return a.priority - b.priority
      })

    return {
      currentTasks: todayTasks.slice(0, 2),
      nextTasks: futureTasks.slice(0, 3)
    }
  }

  const formatDate = (dateStr: string) => formatDateBeijing(dateStr)

  const isOverdue = (task: Task) => {
    let effectiveEnd: Date
    if (task.actualEndDate) {
      effectiveEnd = new Date(task.actualEndDate)
    } else if (task.forecastEndDate) {
      effectiveEnd = new Date(task.forecastEndDate)
    } else {
      effectiveEnd = new Date(task.planEndDate)
    }
    const planEnd = new Date(task.planEndDate)
    return effectiveEnd > planEnd
  }

  const formatTaskText = (task: Task) => {
    if (task.type === 'IN_REQUIREMENT' && task.requirement) {
      if (task.requirement.project) {
        return `${task.requirement.project.title} - ${task.requirement.title} - ${task.title}`
      }
      return `${task.requirement.title} - ${task.title}`
    }
    return task.title
  }

  const groupedUsers = roleOrder.reduce((acc, role) => {
    const roleUsers = users
      .filter((u) => u.role === role)
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    if (roleUsers.length > 0) {
      acc[role] = roleUsers
    }
    return acc
  }, {} as Record<string, User[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--ds-text-primary)]">团队视图</h1>
        <div className="flex gap-2">
          <Link href="/project/new">
            <Button variant="primary" size="sm">+ 添加项目</Button>
          </Link>
          <Link href="/requirement/new">
            <Button variant="secondary" size="sm">+ 添加需求</Button>
          </Link>
          <Link href="/manage">
            <Button variant="secondary" size="sm">+ 添加任务</Button>
          </Link>
          <Link href="/setup">
            <Button variant="ghost" size="sm">+ 添加成员</Button>
          </Link>
        </div>
      </div>

      {/* 团队表格 */}
      <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-[var(--ds-bg-hover)] border-b border-[var(--ds-border-default)] text-[var(--ds-font-size-xs)] font-semibold text-[var(--ds-text-secondary)] uppercase tracking-wide">
          <div className="col-span-2">成员</div>
          <div className="col-span-5">当前任务</div>
          <div className="col-span-5">下一个任务</div>
        </div>

        {/* 按职能分组显示 */}
        {Object.entries(groupedUsers).map(([role, roleUsers]) => (
          <div key={role}>
            {/* 职能标题 */}
            <div className="px-4 py-2 bg-[var(--ds-bg-page)] border-b border-[var(--ds-border-default)] flex items-center gap-2">
              <div className="w-1.5 h-4 rounded-full bg-[var(--ds-brand-primary)]"></div>
              <span className="text-[var(--ds-font-size-sm)] font-semibold text-[var(--ds-text-primary)]">
                {roleLabels[role]}
              </span>
              <span className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-disabled)] bg-[var(--ds-bg-hover)] px-1.5 py-0.5 rounded">
                {roleUsers.length}
              </span>
            </div>

            {/* 用户行 */}
            {roleUsers.map((user) => {
              const { currentTasks, nextTasks } = getCurrentAndNextTasks(user.id)
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[var(--ds-border-default)] hover:bg-[var(--ds-bg-hover)]/50 transition-colors"
                >
                  {/* 成员名称 */}
                  <div className="col-span-2 flex items-start gap-2 pt-1">
                    <AssigneeAvatar users={[{ id: user.id, name: user.name }]} size="sm" />
                    <Link
                      href={`/person/${user.id}`}
                      className="text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)] font-medium text-[var(--ds-font-size-sm)]"
                    >
                      {user.name}
                    </Link>
                  </div>

                  {/* 当前任务 */}
                  <div className="col-span-5">
                    {currentTasks.length === 0 ? (
                      <div className="text-[var(--ds-text-disabled)] text-[var(--ds-font-size-sm)] py-1">暂无进行中的任务</div>
                    ) : (
                      <div className="space-y-1.5">
                        {currentTasks.map((task) => (
                          <div key={task.id}>
                            <div
                              className={`
                                flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] border-l-3
                                ${isOverdue(task)
                                  ? 'bg-[var(--ds-status-error-bg)] border-l-[var(--ds-status-error)]'
                                  : 'bg-[var(--ds-bg-page)] border-l-[var(--ds-brand-primary)]'}
                              `}
                            >
                              {task.code && <CodeBadge code={task.code} type="task" size="sm" />}
                              <Link
                                href={`/task/${task.id}`}
                                className={`
                                  flex-1 text-[var(--ds-font-size-sm)] hover:underline truncate
                                  ${isOverdue(task) ? 'text-[var(--ds-status-error)] font-medium' : 'text-[var(--ds-text-primary)]'}
                                `}
                                title={formatTaskText(task)}
                              >
                                {formatTaskText(task)}
                              </Link>
                              <PriorityBadge priority={task.priority} size="sm" />
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-[var(--ds-text-disabled)] hover:text-[var(--ds-status-error)] hover:bg-[var(--ds-status-error-bg)] rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="删除任务"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                            {/* 前置依赖 */}
                            {task.predecessors && task.predecessors.length > 0 && (
                              <div className="ml-3 mt-0.5 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)] flex items-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                                <span>前置:</span>
                                <Link
                                  href={`/task/${task.predecessors[0].predecessor.id}`}
                                  className="text-[var(--ds-text-link)] hover:underline"
                                >
                                  {task.predecessors[0].predecessor.code}
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 下一个任务 */}
                  <div className="col-span-5">
                    {nextTasks.length === 0 ? (
                      <div className="text-[var(--ds-text-disabled)] text-[var(--ds-font-size-sm)] py-1">暂无待处理任务</div>
                    ) : (
                      <div className="space-y-1.5">
                        {nextTasks.map((task) => (
                          <div key={task.id}>
                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-bg-page)] border-l-3 border-l-[var(--ds-border-default)]">
                              {task.code && <CodeBadge code={task.code} type="task" size="sm" />}
                              <Link
                                href={`/task/${task.id}`}
                                className="flex-1 text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:underline truncate"
                                title={formatTaskText(task)}
                              >
                                {formatTaskText(task)}
                              </Link>
                              <PriorityBadge priority={task.priority} size="sm" />
                              <span className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-disabled)] whitespace-nowrap bg-[var(--ds-bg-hover)] px-1.5 py-0.5 rounded">
                                {formatDate(task.planStartDate)}
                              </span>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 text-[var(--ds-text-disabled)] hover:text-[var(--ds-status-error)] hover:bg-[var(--ds-status-error-bg)] rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="删除任务"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                            {/* 前置依赖 */}
                            {task.predecessors && task.predecessors.length > 0 && (
                              <div className="ml-3 mt-0.5 text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)] flex items-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="15 18 9 12 15 6" />
                                </svg>
                                <span>前置:</span>
                                <Link
                                  href={`/task/${task.predecessors[0].predecessor.id}`}
                                  className="text-[var(--ds-text-link)] hover:underline"
                                >
                                  {task.predecessors[0].predecessor.code}
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {Object.keys(groupedUsers).length === 0 && (
          <div className="px-6 py-12 text-center text-[var(--ds-text-disabled)]">
            还没有团队成员，请先
            <Link href="/setup" className="text-[var(--ds-text-link)] hover:underline ml-1">
              添加成员
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBeijingToday, formatDateBeijing } from '@/lib/timezone'

interface User {
  id: string
  name: string
  role: string
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
    if (!confirm('确定要删除这个任务吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
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

  // 获取用户的当前任务和下一个任务（考虑并发任务规则）
  const getCurrentAndNextTasks = (userId: string) => {
    const today = getBeijingToday()

    // 获取包含今天的任务
    const todayTasks = tasks
      .filter((task) => {
        if (task.user.id !== userId) return false

        const startDate = new Date(task.planStartDate)
        startDate.setHours(0, 0, 0, 0)

        // 计算effectiveEnd
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

    // 获取未来任务
    const futureTasks = tasks
      .filter((task) => {
        if (task.user.id !== userId) return false
        const startDate = new Date(task.planStartDate)
        startDate.setHours(0, 0, 0, 0)
        return startDate > today
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return new Date(a.planStartDate).getTime() - new Date(b.planStartDate).getTime()
      })

    // 根据并发任务规则确定显示逻辑
    if (todayTasks.length === 2) {
      // 2个并发任务 - 都显示为"当前任务"，"下一个任务"为空
      return { currentTasks: todayTasks, nextTasks: [] }
    } else if (todayTasks.length === 1) {
      // 1个任务 - 显示为"当前任务"，显示未来任务为"下一个任务"
      return { currentTasks: todayTasks, nextTasks: futureTasks.slice(0, 3) }
    } else {
      // 没有当前任务 - 显示未来任务
      return { currentTasks: [], nextTasks: futureTasks.slice(0, 3) }
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return formatDateBeijing(dateStr)
  }

  // 检查任务是否延期
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

  // 格式化任务显示文本（编号-项目-需求-任务）
  const formatTaskText = (task: Task) => {
    const code = task.code ? `[${task.code}] ` : ''
    if (task.type === 'IN_REQUIREMENT' && task.requirement) {
      if (task.requirement.project) {
        // 有项目和需求：编号 项目-需求-任务
        return `${code}${task.requirement.project.title}-${task.requirement.title}-${task.title}`
      } else {
        // 只有需求：编号 需求-任务
        return `${code}${task.requirement.title}-${task.title}`
      }
    }
    // 独立任务：编号 任务名
    return `${code}${task.title}`
  }

  // 按职能分组用户
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">团队视图</h1>
          <div className="flex gap-3">
            <Link
              href="/calendar"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              📅 日历视图
            </Link>
            <Link
              href="/projects"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              📊 项目视图
            </Link>
            <Link
              href="/requirement/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              ➕ 添加需求
            </Link>
            <Link
              href="/manage"
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              ✏️ 添加任务
            </Link>
            <Link
              href="/setup"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              添加成员
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-3 border-b bg-gray-50 px-6 py-3 font-semibold text-gray-700">
            <div>职能 & 名称</div>
            <div>当前任务</div>
            <div>下一个任务</div>
          </div>
          {Object.entries(groupedUsers).map(([role, roleUsers]) => (
            <div key={role} className="border-b last:border-b-0">
              <div className="bg-gray-100 px-6 py-3 font-semibold text-gray-700">
                {roleLabels[role]}
              </div>
              {roleUsers.map((user) => {
                const { currentTasks, nextTasks } = getCurrentAndNextTasks(user.id)
                return (
                  <div key={user.id} className="grid grid-cols-3 px-6 py-4 hover:bg-gray-50 border-b">
                    <div>
                      <Link href={`/person/${user.id}`} className="text-blue-600 hover:underline font-medium">
                        {user.name}
                      </Link>
                    </div>

                    <div>
                      {currentTasks.length === 0 ? (
                        <span className="text-gray-400">无</span>
                      ) : (
                        <div className="space-y-1">
                          {currentTasks.map((task) => (
                            <div key={task.id} className={`flex items-center justify-between ${isOverdue(task) ? 'text-red-600' : ''}`}>
                              <Link
                                href={`/task/${task.id}`}
                                className="text-sm hover:underline"
                              >
                                {formatTaskText(task)}
                              </Link>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="删除任务"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      {nextTasks.length === 0 ? (
                        <span className="text-gray-400">无</span>
                      ) : (
                        <div className="space-y-1">
                          {nextTasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between text-sm text-gray-600">
                              <div>
                                <Link
                                  href={`/task/${task.id}`}
                                  className="hover:underline"
                                >
                                  {formatTaskText(task)}
                                </Link>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({formatDate(task.planStartDate)})
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="删除任务"
                              >
                                ×
                              </button>
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
            <div className="px-6 py-12 text-center text-gray-500">
              还没有团队成员，请先添加
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

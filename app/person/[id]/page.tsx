'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
}

interface Task {
  id: string
  title: string
  type: string
  priority: number
  userId: string
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  status: string
  requirement: {
    title: string
  } | null
}

interface BrainstormItem {
  id: string
  title: string
  type: string
  priority: number
  planStartDate: string | null
  planEndDate: string | null
}

export default function PersonPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [brainstormItems, setBrainstormItems] = useState<BrainstormItem[]>([])
  const [loading, setLoading] = useState(true)

  const [newBrainstorm, setNewBrainstorm] = useState({
    title: '',
    type: 'TASK',
    priority: 0,
  })

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
  }, [userId])

  const fetchData = async () => {
    try {
      const [usersRes, tasksRes, brainstormRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/tasks'),
        fetch(`/api/brainstorm?userId=${userId}`),
      ])

      const users = await usersRes.json()
      const tasks = await tasksRes.json()
      const brainstorm = await brainstormRes.json()

      const currentUser = users.find((u: User) => u.id === userId)
      if (!currentUser) {
        router.push('/team')
        return
      }

      setUser(currentUser)
      setAllTasks(tasks.filter((t: Task) => t.userId === userId))
      setBrainstormItems(brainstorm)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取当前任务和接下来的任务（考虑并发任务规则）
  const getCurrentAndUpcomingTasks = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 获取包含今天的任务
    const todayTasks = allTasks
      .filter((task) => {
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

    // 获取未来任务
    const futureTasks = allTasks
      .filter((task) => {
        const startDate = new Date(task.planStartDate)
        startDate.setHours(0, 0, 0, 0)
        return startDate > today
      })
      .sort((a, b) => a.priority - b.priority)

    // 根据并发任务规则确定显示逻辑
    if (todayTasks.length === 2) {
      // 2个并发任务 - 都显示为"当前任务"，"接下来的任务"为空
      return { currentTasks: todayTasks, upcomingTasks: [] }
    } else if (todayTasks.length === 1) {
      // 1个任务 - 显示为"当前任务"，显示未来任务为"接下来的任务"
      return { currentTasks: todayTasks, upcomingTasks: futureTasks }
    } else {
      // 没有当前任务 - 显示未来任务
      return { currentTasks: [], upcomingTasks: futureTasks }
    }
  }

  // 计算延期天数
  const calculateOverdueDays = (task: Task) => {
    let effectiveEnd: Date
    if (task.actualEndDate) {
      effectiveEnd = new Date(task.actualEndDate)
    } else if (task.forecastEndDate) {
      effectiveEnd = new Date(task.forecastEndDate)
    } else {
      return 0
    }

    const planEnd = new Date(task.planEndDate)
    if (effectiveEnd <= planEnd) return 0

    const diffTime = effectiveEnd.getTime() - planEnd.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // 格式化任务标题
  const formatTaskTitle = (task: Task) => {
    if (task.type === 'IN_REQUIREMENT' && task.requirement) {
      return `${task.requirement.title}的${task.title}`
    }
    return task.title
  }

  // 格式化日期
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    })
  }

  // 添加头脑风暴项
  const handleAddBrainstorm = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBrainstorm,
          userId,
        }),
      })
      setNewBrainstorm({ title: '', type: 'TASK', priority: 0 })
      fetchData()
    } catch (error) {
      console.error('Failed to add brainstorm item:', error)
    }
  }

  // 删除头脑风暴项
  const handleDeleteBrainstorm = async (id: string) => {
    try {
      await fetch(`/api/brainstorm?id=${id}`, {
        method: 'DELETE',
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete brainstorm item:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const { currentTasks, upcomingTasks } = getCurrentAndUpcomingTasks()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/team" className="text-blue-600 hover:underline">
            ← 返回团队视图
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {user.name}
            <span className="ml-3 text-lg font-normal text-gray-600">
              {roleLabels[user.role]}
            </span>
          </h1>
        </div>

        {/* 当前正在做的任务 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            当前正在做的任务
          </h2>
          {currentTasks.length === 0 ? (
            <p className="text-gray-500">暂无任务</p>
          ) : (
            <div className="space-y-3">
              {currentTasks.map((task) => {
                const overdueDays = calculateOverdueDays(task)
                return (
                  <div
                    key={task.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="font-medium text-gray-900">
                      {formatTaskTitle(task)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      理想结束: {formatDate(task.planEndDate)}
                      {task.forecastEndDate && (
                        <span className="ml-3">
                          现在预计结束: {formatDate(task.forecastEndDate)}
                        </span>
                      )}
                    </div>
                    {overdueDays > 0 && (
                      <div className="text-red-600 font-bold text-sm mt-1">
                        延期{overdueDays}天
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 接下来会做的任务 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              接下来会做的任务
            </h2>
            <Link
              href="/manage"
              className="text-blue-600 hover:underline text-sm"
            >
              添加需求或任务
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500">暂无任务</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="border-l-4 border-gray-300 pl-4 py-2"
                >
                  <div className="font-medium text-gray-900">
                    {formatTaskTitle(task)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    预计开始: {formatDate(task.planStartDate)} | 计划结束:{' '}
                    {formatDate(task.planEndDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 头脑风暴池 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">头脑风暴池</h2>

          <form onSubmit={handleAddBrainstorm} className="mb-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={newBrainstorm.title}
                onChange={(e) =>
                  setNewBrainstorm({ ...newBrainstorm, title: e.target.value })
                }
                placeholder="输入想法..."
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newBrainstorm.type}
                onChange={(e) =>
                  setNewBrainstorm({ ...newBrainstorm, type: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="REQUIREMENT">需求</option>
                <option value="TASK">任务</option>
              </select>
              <input
                type="number"
                value={newBrainstorm.priority}
                onChange={(e) =>
                  setNewBrainstorm({
                    ...newBrainstorm,
                    priority: parseInt(e.target.value),
                  })
                }
                min="0"
                max="5"
                placeholder="优先级"
                className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                添加
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {brainstormItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-sm text-gray-600">
                    [{item.type === 'REQUIREMENT' ? '需求' : '任务'}]
                  </span>
                  <span className="ml-2 text-sm text-gray-600">
                    优先级: {item.priority}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteBrainstorm(item.id)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  删除
                </button>
              </div>
            ))}
            {brainstormItems.length === 0 && (
              <p className="text-gray-500 text-center py-4">暂无想法</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
}

interface Requirement {
  id: string
  title: string
  priority: number
}

export default function ManagePage() {
  const [users, setUsers] = useState<User[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  const [newTask, setNewTask] = useState({
    title: '',
    type: 'STANDALONE',
    requirementId: '',
    userId: '',
    priority: 0,
    planStartDate: new Date().toISOString().split('T')[0],
    startTimeSlot: 'MORNING',
    durationWorkdays: 1,
    endTimeSlot: 'AFTERNOON',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [usersRes, reqRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/requirements'),
      ])
      const usersData = await usersRes.json()
      const reqData = await reqRes.json()
      setUsers(usersData)
      setRequirements(reqData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const taskData = {
        ...newTask,
        requirementId: newTask.type === 'IN_REQUIREMENT' ? newTask.requirementId : null,
        durationWorkdays: parseInt(newTask.durationWorkdays.toString()),
        priority: parseInt(newTask.priority.toString()),
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        setNewTask({
          title: '',
          type: 'STANDALONE',
          requirementId: '',
          userId: '',
          priority: 0,
          planStartDate: new Date().toISOString().split('T')[0],
          startTimeSlot: 'MORNING',
          durationWorkdays: 1,
          endTimeSlot: 'AFTERNOON',
        })
        alert('任务添加成功！')
      } else {
        const error = await response.json()
        alert('添加失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to add task:', error)
      alert('添加失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/team" className="text-blue-600 hover:underline">
            ← 返回团队视图
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">添加任务</h1>

        {/* 添加任务 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">添加任务</h2>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务标题
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：前端开发"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务类型
                </label>
                <select
                  value={newTask.type}
                  onChange={(e) =>
                    setNewTask({ ...newTask, type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="STANDALONE">独立任务</option>
                  <option value="IN_REQUIREMENT">需求内任务</option>
                </select>
              </div>

              {newTask.type === 'IN_REQUIREMENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    所属需求
                  </label>
                  <select
                    value={newTask.requirementId}
                    onChange={(e) =>
                      setNewTask({ ...newTask, requirementId: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    {requirements.map((req) => (
                      <option key={req.id} value={req.id}>
                        {req.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                负责人
              </label>
              <select
                value={newTask.userId}
                onChange={(e) => setNewTask({ ...newTask, userId: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始日期
                </label>
                <input
                  type="date"
                  value={newTask.planStartDate}
                  onChange={(e) =>
                    setNewTask({ ...newTask, planStartDate: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  开始时段
                </label>
                <select
                  value={newTask.startTimeSlot}
                  onChange={(e) =>
                    setNewTask({ ...newTask, startTimeSlot: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MORNING">上午</option>
                  <option value="AFTERNOON">下午</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  工作日天数
                </label>
                <input
                  type="number"
                  value={newTask.durationWorkdays}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      durationWorkdays: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束时段
                </label>
                <select
                  value={newTask.endTimeSlot}
                  onChange={(e) =>
                    setNewTask({ ...newTask, endTimeSlot: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MORNING">上午</option>
                  <option value="AFTERNOON">下午</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                优先级（0-5，0最高优先级）
              </label>
              <input
                type="number"
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: parseInt(e.target.value),
                  })
                }
                min="0"
                max="5"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              添加任务
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

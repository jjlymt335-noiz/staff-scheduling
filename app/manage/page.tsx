'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  projectId: string | null
}

export default function ManagePage() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [users, setUsers] = useState<User[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)

  const [newTask, setNewTask] = useState({
    title: '',
    type: projectId ? 'IN_REQUIREMENT' : 'STANDALONE',
    requirementId: '',
    userId: '',
    priority: 0,
    planStartDate: new Date().toISOString().split('T')[0],
    startTimeSlot: 'MORNING',
    durationWorkdays: 1,
    endTimeSlot: 'AFTERNOON',
  })
  const [taskLinks, setTaskLinks] = useState<Array<{ title: string; url: string }>>([])
  const [newTaskLinkTitle, setNewTaskLinkTitle] = useState('')
  const [newTaskLinkUrl, setNewTaskLinkUrl] = useState('')

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
        links: taskLinks.length > 0 ? JSON.stringify(taskLinks) : null,
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
        setTaskLinks([])
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
          <Link href={projectId ? `/project/${projectId}` : '/team'} className="text-blue-600 hover:underline">
            ← {projectId ? '返回项目详情' : '返回团队视图'}
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
                    {requirements
                      .filter(req => !projectId || req.projectId === projectId)
                      .map((req) => (
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                相关链接（可选，最多5个）
              </label>
              {taskLinks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {taskLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex-1 truncate">{link.title} - <span className="text-gray-500">{link.url}</span></div>
                      <button type="button" onClick={() => setTaskLinks(taskLinks.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                    </div>
                  ))}
                </div>
              )}
              {taskLinks.length < 5 && (
                <div className="flex gap-2">
                  <input type="text" placeholder="链接标题" value={newTaskLinkTitle} onChange={(e) => setNewTaskLinkTitle(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <input type="url" placeholder="链接URL" value={newTaskLinkUrl} onChange={(e) => setNewTaskLinkUrl(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <button type="button" onClick={() => {
                    if (!newTaskLinkTitle.trim() || !newTaskLinkUrl.trim()) { alert('请填写链接标题和URL'); return }
                    if (taskLinks.length >= 5) { alert('最多只能添加5个链接'); return }
                    setTaskLinks([...taskLinks, { title: newTaskLinkTitle, url: newTaskLinkUrl }])
                    setNewTaskLinkTitle(''); setNewTaskLinkUrl('')
                  }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">添加</button>
                </div>
              )}
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

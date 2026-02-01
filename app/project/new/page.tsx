'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()

  const getDefaultProjectDates = () => {
    const today = new Date()
    const sixWeeksLater = new Date(today)
    sixWeeksLater.setDate(today.getDate() + 42)
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: sixWeeksLater.toISOString().split('T')[0]
    }
  }

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    priority: 0,
    ...getDefaultProjectDates()
  })

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })
      if (response.ok) {
        alert('项目创建成功！')
        router.push('/projects')
      } else {
        const error = await response.json()
        alert('创建失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      alert('创建失败，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/projects" className="text-blue-600 hover:underline">
            ← 返回项目视图
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">创建新项目</h1>
          <form onSubmit={handleCreateProject} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">项目名称</label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">项目描述（可选）</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">开始日期</label>
                <input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">结束日期</label>
                <input
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">优先级（0-5，0最高）</label>
              <input
                type="number"
                value={newProject.priority}
                onChange={(e) => setNewProject({ ...newProject, priority: parseInt(e.target.value) })}
                min="0"
                max="5"
                required
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                创建项目
              </button>
              <Link
                href="/projects"
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                取消
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

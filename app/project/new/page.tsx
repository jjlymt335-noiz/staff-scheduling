'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface RelatedLink {
  title: string
  url: string
}

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
  const [links, setLinks] = useState<RelatedLink[]>([])
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      alert('请填写链接标题和URL')
      return
    }
    if (links.length >= 5) {
      alert('最多只能添加5个链接')
      return
    }
    setLinks([...links, { title: newLinkTitle, url: newLinkUrl }])
    setNewLinkTitle('')
    setNewLinkUrl('')
  }

  const handleDeleteLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          links: links.length > 0 ? JSON.stringify(links) : null
        })
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
            {/* 相关链接 */}
            <div>
              <label className="block text-sm font-medium mb-2">相关链接（可选，最多5个）</label>
              {links.length > 0 && (
                <div className="space-y-2 mb-3">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{link.title}</div>
                        <div className="text-xs text-gray-500">{link.url}</div>
                      </div>
                      <button type="button" onClick={() => handleDeleteLink(index)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">删除</button>
                    </div>
                  ))}
                </div>
              )}
              {links.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="链接标题"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                  />
                  <input
                    type="url"
                    placeholder="链接URL"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                  />
                  <button type="button" onClick={handleAddLink} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">添加</button>
                </div>
              )}
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

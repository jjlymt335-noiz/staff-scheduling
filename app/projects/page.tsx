'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBeijingDateStr, getBeijingToday, formatDateBeijing } from '@/lib/timezone'

interface User {
  id: string
  name: string
  role: string
}

interface StageAssignment {
  user: User
}

interface Stage {
  id: string
  name: string
  order: number
  startDate: string | null
  endDate: string | null
  status: string
  description: string | null
  deliverables: string | null
  assignments: StageAssignment[]
}

interface Task {
  id: string
  status: string
}

interface Requirement {
  id: string
  title: string
  priority: number
  projectId: string | null
  startDate: string | null
  endDate: string | null
  links: string | null
  stages: Stage[]
  tasks: Task[]
}

interface Project {
  id: string
  title: string
  description: string | null
  priority: number
  startDate: string | null
  endDate: string | null
  requirements: Requirement[]
}

interface StandaloneTask {
  id: string
  title: string
  priority: number
  requirementId: string | null
  planStartDate: string
  planEndDate: string
  forecastEndDate: string | null
  actualEndDate: string | null
  status: string
  user: User
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [tasks, setTasks] = useState<StandaloneTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequirement, setSelectedRequirement] = useState<{
    id: string
    title: string
    startDate: string | null
    endDate: string | null
    links: Array<{ title: string; url: string }>
    personnel: Array<{
      userId: string
      userName: string
      userRole: string
      currentTask: string | null
    }>
  } | null>(null)
  const [showRequirementForm, setShowRequirementForm] = useState<string | null>(null) // projectId
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    priority: 0,
    startDate: getBeijingDateStr(),
    endDate: ''
  })
  const [reqLinks, setReqLinks] = useState<Array<{ title: string; url: string }>>([])
  const [newReqLinkTitle, setNewReqLinkTitle] = useState('')
  const [newReqLinkUrl, setNewReqLinkUrl] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<{ projects: boolean; requirements: boolean; tasks: boolean }>({
    projects: false,
    requirements: false,
    tasks: false,
  })

  const roleOrder = ['MANAGEMENT', 'FRONTEND', 'BACKEND', 'PRODUCT', 'OPERATIONS', 'STRATEGY']
  const roleLabels: Record<string, string> = {
    MANAGEMENT: '管理',
    FRONTEND: '前端',
    BACKEND: '后端',
    PRODUCT: '产品',
    OPERATIONS: '运营',
    STRATEGY: '战略'
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [projectsRes, requirementsRes, tasksRes] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/requirements'),
        fetch('/api/tasks')
      ])
      const projectsData = await projectsRes.json()
      const requirementsData = await requirementsRes.json()
      const tasksData = await tasksRes.json()

      setProjects(projectsData)
      setRequirements(requirementsData)
      setTasks(tasksData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }


  const handleCreateRequirement = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault()
    if (!newRequirement.endDate) {
      alert('请填写结束日期')
      return
    }
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequirement,
          projectId,
          links: reqLinks.length > 0 ? JSON.stringify(reqLinks) : null
        })
      })
      if (response.ok) {
        setShowRequirementForm(null)
        setNewRequirement({
          title: '',
          priority: 0,
          startDate: getBeijingDateStr(),
          endDate: ''
        })
        setReqLinks([])
        fetchData()
        alert('需求创建成功！')
      } else {
        const error = await response.json()
        alert('创建失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to create requirement:', error)
      alert('创建失败，请重试')
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return

    try {
      const response = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingProject.title,
          description: editingProject.description,
          priority: editingProject.priority,
          startDate: editingProject.startDate,
          endDate: editingProject.endDate
        })
      })
      if (response.ok) {
        setEditingProject(null)
        fetchData()
        alert('项目更新成功！')
      } else {
        const error = await response.json()
        alert('更新失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('更新失败，请重试')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    const reqCount = project?.requirements.length || 0
    const taskCount = project?.requirements.reduce((sum, req) => sum + req.tasks.length, 0) || 0

    let message = '确定要删除这个项目吗？'
    if (reqCount > 0 || taskCount > 0) {
      message += `\n\n⚠️ 警告：删除项目将同时删除：`
      if (reqCount > 0) message += `\n• ${reqCount} 个需求`
      if (taskCount > 0) message += `\n• ${taskCount} 个任务`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const result = await response.json()
        fetchData()
        if (result.deletedItems && (result.deletedItems.requirements > 0 || result.deletedItems.tasks > 0)) {
          alert(`项目删除成功！\n已删除 ${result.deletedItems.requirements} 个需求和 ${result.deletedItems.tasks} 个任务`)
        } else {
          alert('项目删除成功！')
        }
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('删除失败，请重试')
    }
  }

  const handleDeleteRequirement = async (requirementId: string) => {
    const requirement = requirements.find(r => r.id === requirementId)
    const taskCount = requirement?.tasks.length || 0

    let message = '确定要删除这个需求吗？'
    if (taskCount > 0) {
      message += `\n\n⚠️ 警告：删除需求将同时删除 ${taskCount} 个任务！`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) {
      return
    }

    try {
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        const result = await response.json()
        fetchData()
        if (result.deletedItems && result.deletedItems.tasks > 0) {
          alert(`需求删除成功！\n已删除 ${result.deletedItems.tasks} 个任务`)
        } else {
          alert('需求删除成功！')
        }
      } else {
        const error = await response.json()
        alert('删除失败：' + error.error)
      }
    } catch (error) {
      console.error('Failed to delete requirement:', error)
      alert('删除失败，请重试')
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

  // 获取当前进行中的需求（有IN_PROGRESS阶段的需求）
  const getCurrentRequirement = (project: Project): Requirement | null => {
    return project.requirements.find(req =>
      req.stages.some(s => s.status === 'IN_PROGRESS')
    ) || null
  }

  // 获取下一步规划的需求（有PENDING阶段且优先级最高的需求）
  const getNextRequirement = (project: Project): Requirement | null => {
    const pendingReqs = project.requirements
      .filter(req => req.stages.some(s => s.status === 'PENDING'))
      .sort((a, b) => a.priority - b.priority)

    return pendingReqs.length > 0 ? pendingReqs[0] : null
  }

  // 格式化日期
  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return formatDateBeijing(date)
  }

  // 按字母顺序排序项目
  const sortedProjects = [...projects].sort((a, b) =>
    a.title.localeCompare(b.title, 'zh-CN')
  )

  // 获取独立进行中的需求（不属于任何项目）
  const getStandaloneInProgressRequirements = () => {
    const today = getBeijingToday()

    return requirements
      .filter(req => {
        // 必须不属于任何项目
        if (req.projectId) return false

        // 检查是否有任务正在进行中
        const reqTasks = tasks.filter(t => t.requirementId === req.id)
        return reqTasks.some(task => {
          const startDate = new Date(task.planStartDate)
          const endDate = new Date(task.planEndDate)
          startDate.setHours(0, 0, 0, 0)
          endDate.setHours(0, 0, 0, 0)
          return today >= startDate && today <= endDate
        })
      })
      .sort((a, b) => {
        // 先按优先级排序
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // 优先级相同则按字母顺序
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  // 获取独立进行中的任务（不属于任何需求和项目）
  const getStandaloneInProgressTasks = () => {
    const today = getBeijingToday()

    return tasks
      .filter(task => {
        // 必须不属于任何需求
        if (task.requirementId) return false

        // 检查是否正在进行中
        const startDate = new Date(task.planStartDate)
        const endDate = new Date(task.planEndDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        return today >= startDate && today <= endDate
      })
      .sort((a, b) => {
        // 先按优先级排序
        if (a.priority !== b.priority) {
          return a.priority - b.priority
        }
        // 优先级相同则按字母顺序
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  const standaloneRequirements = getStandaloneInProgressRequirements()
  const standaloneTasks = getStandaloneInProgressTasks()

  // 获取需求的所有相关人员
  const showRequirementDetail = async (requirement: Requirement) => {
    try {
      // 获取所有任务
      const tasksRes = await fetch('/api/tasks')
      const allTasks = await tasksRes.json()

      // 过滤该需求的任务
      const requirementTasks = allTasks.filter((t: any) => t.requirementId === requirement.id)

      // 按用户分组
      const userMap = new Map()
      requirementTasks.forEach((task: any) => {
        if (!userMap.has(task.user.id)) {
          userMap.set(task.user.id, {
            userId: task.user.id,
            userName: task.user.name,
            userRole: task.user.role,
            currentTask: null,
            currentTaskPriority: Infinity
          })
        }

        // 找到该用户当前正在做的任务
        const today = getBeijingToday()
        const taskStart = new Date(task.planStartDate)
        taskStart.setHours(0, 0, 0, 0)

        let taskEnd: Date
        if (task.actualEndDate) {
          taskEnd = new Date(task.actualEndDate)
        } else if (task.forecastEndDate) {
          taskEnd = new Date(task.forecastEndDate)
        } else {
          taskEnd = new Date(task.planEndDate)
        }
        taskEnd.setHours(0, 0, 0, 0)

        if (today >= taskStart && today <= taskEnd) {
          const user = userMap.get(task.user.id)
          if (task.priority < user.currentTaskPriority) {
            user.currentTask = task.title
            user.currentTaskPriority = task.priority
          }
        }
      })

      let parsedLinks: Array<{ title: string; url: string }> = []
      if (requirement.links) {
        try { parsedLinks = JSON.parse(requirement.links) } catch (e) { /* ignore */ }
      }

      setSelectedRequirement({
        id: requirement.id,
        title: requirement.title,
        startDate: requirement.startDate,
        endDate: requirement.endDate,
        links: parsedLinks,
        personnel: Array.from(userMap.values()).map(u => ({
          userId: u.userId,
          userName: u.userName,
          userRole: u.userRole,
          currentTask: u.currentTask
        }))
      })
    } catch (error) {
      console.error('Failed to fetch requirement details:', error)
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
      {/* 需求详情模态框 */}
      {selectedRequirement && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedRequirement(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold">需求：<Link href={`/requirement/${selectedRequirement.id}`} className="text-blue-600 hover:underline">{selectedRequirement.title}</Link></h2>
                {selectedRequirement.startDate && selectedRequirement.endDate && (
                  <p className="text-gray-600 mt-1">
                    {formatDate(selectedRequirement.startDate)} - {formatDate(selectedRequirement.endDate)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedRequirement(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedRequirement.links.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">相关链接</h3>
                <div className="space-y-1">
                  {selectedRequirement.links.map((link, index) => (
                    <div key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">{link.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">相关人员</h3>

              {/* 按职能分组显示 */}
              {roleOrder.map(role => {
                const rolePersonnel = selectedRequirement.personnel
                  .filter(p => p.userRole === role)
                  .sort((a, b) => a.userName.localeCompare(b.userName, 'zh-CN'))

                if (rolePersonnel.length === 0) return null

                return (
                  <div key={role} className="mb-6">
                    <div className="text-md font-semibold text-gray-700 mb-2 bg-gray-100 px-3 py-2 rounded">
                      {roleLabels[role]}
                    </div>
                    <div className="space-y-2 pl-4">
                      {rolePersonnel.map(person => (
                        <div key={person.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <Link
                            href={`/person/${person.userId}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {person.userName}
                          </Link>
                          <div className="text-sm text-gray-600">
                            正在做：{person.currentTask || <span className="text-gray-400">无</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {selectedRequirement.personnel.length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  暂无相关人员
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">项目视图</h1>
          <div className="flex gap-3">
            <Link
              href="/team"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              团队视图
            </Link>
            <Link
              href="/calendar"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              日历视图
            </Link>
          </div>
        </div>

        {/* 收起/展开切换按钮 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setCollapsedSections(s => ({ ...s, projects: !s.projects }))}
            className={`px-3 py-1.5 rounded text-sm border ${collapsedSections.projects ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
          >
            {collapsedSections.projects ? '展开项目' : '收起项目'}
          </button>
          <button
            onClick={() => setCollapsedSections(s => ({ ...s, requirements: !s.requirements }))}
            className={`px-3 py-1.5 rounded text-sm border ${collapsedSections.requirements ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
          >
            {collapsedSections.requirements ? '展开需求' : '收起需求'}
          </button>
          <button
            onClick={() => setCollapsedSections(s => ({ ...s, tasks: !s.tasks }))}
            className={`px-3 py-1.5 rounded text-sm border ${collapsedSections.tasks ? 'bg-gray-200 text-gray-600' : 'bg-white text-gray-800 border-gray-300'}`}
          >
            {collapsedSections.tasks ? '展开任务' : '收起任务'}
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="mb-6 flex gap-3">
          <Link
            href="/project/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 添加项目
          </Link>
          <Link
            href="/manage"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            + 添加需求
          </Link>
          <Link
            href="/manage"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            + 添加任务
          </Link>
        </div>

        <div className="space-y-6">
          {!collapsedSections.projects && sortedProjects.map(project => {
            const currentReq = getCurrentRequirement(project)
            const nextReq = getNextRequirement(project)

            return (
              <div key={project.id} className="bg-white rounded-lg shadow p-6">
                {/* 编辑项目表单 */}
                {editingProject?.id === project.id ? (
                  <form onSubmit={handleUpdateProject} className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">项目名称</label>
                      <input
                        type="text"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">项目描述</label>
                      <textarea
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">开始日期</label>
                        <input
                          type="date"
                          value={editingProject.startDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">结束日期</label>
                        <input
                          type="date"
                          value={editingProject.endDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProject(null)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* 项目标题和信息 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Link href={`/project/${project.id}`} className="text-2xl font-bold text-gray-900 hover:text-blue-600 hover:underline">{project.title}</Link>
                          {project.description && (
                            <p className="text-gray-600 mt-2">{project.description}</p>
                          )}
                          {project.startDate && project.endDate && (
                            <p className="text-sm text-gray-500 mt-2">
                              项目时间：{formatDate(project.startDate)} - {formatDate(project.endDate)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => setEditingProject(project)}
                            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 只在非编辑模式下显示需求 */}
                {editingProject?.id !== project.id && (
                  <>

                {/* 当前进行和接下来的需求 - 两列布局 */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* 当前进行的需求 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">当前进行的需求</h3>
                    {currentReq ? (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Link href={`/requirement/${currentReq.id}`} className="font-medium text-blue-600 hover:underline">{currentReq.title}</Link>
                        {currentReq.startDate && currentReq.endDate && (
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(currentReq.startDate)} - {formatDate(currentReq.endDate)}
                          </div>
                        )}
                        <button onClick={() => showRequirementDetail(currentReq)} className="text-xs text-gray-500 hover:text-blue-600 mt-2">查看人员</button>
                      </div>
                    ) : (
                      <div className="text-gray-400">无</div>
                    )}
                  </div>

                  {/* 接下来的需求 */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">接下来的需求</h3>
                    {nextReq ? (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <Link href={`/requirement/${nextReq.id}`} className="font-medium text-blue-600 hover:underline">{nextReq.title}</Link>
                        {nextReq.startDate && nextReq.endDate && (
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(nextReq.startDate)} - {formatDate(nextReq.endDate)}
                          </div>
                        )}
                        <button onClick={() => showRequirementDetail(nextReq)} className="text-xs text-gray-500 hover:text-blue-600 mt-2">查看人员</button>
                      </div>
                    ) : (
                      <div className="text-gray-400">无</div>
                    )}
                  </div>
                </div>

                {/* 添加需求按钮和表单 */}
                {showRequirementForm === project.id ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-semibold mb-3">为项目添加需求</h3>
                    <form onSubmit={(e) => handleCreateRequirement(e, project.id)} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">需求名称</label>
                        <input
                          type="text"
                          value={newRequirement.title}
                          onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">开始日期</label>
                          <input
                            type="date"
                            value={newRequirement.startDate}
                            onChange={(e) => setNewRequirement({ ...newRequirement, startDate: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">结束日期 <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            value={newRequirement.endDate}
                            onChange={(e) => setNewRequirement({ ...newRequirement, endDate: e.target.value })}
                            required
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">优先级（0-5，0最高）</label>
                        <input
                          type="number"
                          value={newRequirement.priority}
                          onChange={(e) => setNewRequirement({ ...newRequirement, priority: parseInt(e.target.value) })}
                          min="0"
                          max="5"
                          required
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">相关链接（可选，最多5个）</label>
                        {reqLinks.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {reqLinks.map((link, index) => (
                              <div key={index} className="flex items-center gap-2 p-1.5 bg-white rounded text-sm">
                                <div className="flex-1 truncate">{link.title} - <span className="text-gray-500">{link.url}</span></div>
                                <button type="button" onClick={() => setReqLinks(reqLinks.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800 text-xs">删除</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {reqLinks.length < 5 && (
                          <div className="flex gap-2">
                            <input type="text" placeholder="链接标题" value={newReqLinkTitle} onChange={(e) => setNewReqLinkTitle(e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                            <input type="url" placeholder="链接URL" value={newReqLinkUrl} onChange={(e) => setNewReqLinkUrl(e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                            <button type="button" onClick={() => {
                              if (!newReqLinkTitle.trim() || !newReqLinkUrl.trim()) { alert('请填写链接标题和URL'); return }
                              setReqLinks([...reqLinks, { title: newReqLinkTitle, url: newReqLinkUrl }])
                              setNewReqLinkTitle(''); setNewReqLinkUrl('')
                            }} className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300">添加</button>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          创建需求
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRequirementForm(null)}
                          className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowRequirementForm(project.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    + 添加需求
                  </button>
                )}
                </>
                )}
              </div>
            )
          })}

          {projects.length === 0 && standaloneRequirements.length === 0 && standaloneTasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无项目数据
            </div>
          )}

          {/* 独立进行中的需求 */}
          {!collapsedSections.requirements && standaloneRequirements.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">独立需求（进行中）</h2>
              <div className="space-y-3">
                {standaloneRequirements.map(req => (
                  <div
                    key={req.id}
                    className="p-4 bg-purple-50 rounded-lg border border-purple-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/requirement/${req.id}`} className="font-medium text-blue-600 hover:underline">{req.title}</Link>
                        {req.startDate && req.endDate && (
                          <div className="text-sm text-gray-600 mt-1">
                            {formatDate(req.startDate)} - {formatDate(req.endDate)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">
                          优先级: {req.priority}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRequirement(req.id)
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 独立进行中的任务 */}
          {!collapsedSections.tasks && standaloneTasks.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">独立任务（进行中）</h2>
              <div className="space-y-3">
                {standaloneTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-4 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Link href={`/task/${task.id}`} className="font-medium text-blue-600 hover:underline">{task.title}</Link>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatDate(task.planStartDate)} - {formatDate(task.planEndDate)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          负责人: <Link href={`/person/${task.user.id}`} className="text-blue-600 hover:underline">
                            {task.user.name}
                          </Link>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">
                          优先级: {task.priority}
                        </div>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

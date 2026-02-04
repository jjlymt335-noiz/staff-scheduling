'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBeijingDateStr, getBeijingToday, formatDateBeijing } from '@/lib/timezone'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui'
import { PriorityBadge, CodeBadge, AssigneeAvatar } from '@/components/issue'

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
  code?: string
  status: string
}

interface Requirement {
  id: string
  code?: string
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
  code?: string
  title: string
  description: string | null
  priority: number
  startDate: string | null
  endDate: string | null
  requirements: Requirement[]
}

interface StandaloneTask {
  id: string
  code?: string
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
  const [showRequirementForm, setShowRequirementForm] = useState<string | null>(null)
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

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
      message += `\n\n警告：删除项目将同时删除：`
      if (reqCount > 0) message += `\n• ${reqCount} 个需求`
      if (taskCount > 0) message += `\n• ${taskCount} 个任务`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
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
      message += `\n\n警告：删除需求将同时删除 ${taskCount} 个任务！`
      message += `\n\n此操作不可撤销！`
    }

    if (!confirm(message)) return

    try {
      const response = await fetch(`/api/requirements/${requirementId}`, { method: 'DELETE' })
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

  const getCurrentRequirement = (project: Project): Requirement | null => {
    return project.requirements.find(req =>
      req.stages.some(s => s.status === 'IN_PROGRESS')
    ) || null
  }

  const getNextRequirement = (project: Project): Requirement | null => {
    const pendingReqs = project.requirements
      .filter(req => req.stages.some(s => s.status === 'PENDING'))
      .sort((a, b) => a.priority - b.priority)
    return pendingReqs.length > 0 ? pendingReqs[0] : null
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return formatDateBeijing(date)
  }

  const sortedProjects = [...projects].sort((a, b) =>
    a.title.localeCompare(b.title, 'zh-CN')
  )

  const getStandaloneRequirements = (): Requirement[] => {
    return requirements
      .filter(req => !req.projectId)
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  const getStandaloneInProgressTasks = () => {
    const today = getBeijingToday()
    return tasks
      .filter(task => {
        if (task.requirementId) return false
        const startDate = new Date(task.planStartDate)
        const endDate = new Date(task.planEndDate)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        return today >= startDate && today <= endDate
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        return a.title.localeCompare(b.title, 'zh-CN')
      })
  }

  const standaloneRequirements = getStandaloneRequirements()
  const standaloneTasks = getStandaloneInProgressTasks()

  const showRequirementDetail = async (requirement: Requirement) => {
    try {
      const tasksRes = await fetch('/api/tasks')
      const allTasks = await tasksRes.json()
      const requirementTasks = allTasks.filter((t: StandaloneTask) => t.requirementId === requirement.id)

      const userMap = new Map()
      requirementTasks.forEach((task: StandaloneTask) => {
        if (!userMap.has(task.user.id)) {
          userMap.set(task.user.id, {
            userId: task.user.id,
            userName: task.user.name,
            userRole: task.user.role,
            currentTask: null,
            currentTaskPriority: Infinity
          })
        }

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

  const toggleProjectExpand = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--ds-text-secondary)]">加载中...</div>
      </div>
    )
  }

  return (
    <div>
      {/* 需求详情模态框 */}
      <Modal
        isOpen={!!selectedRequirement}
        onClose={() => setSelectedRequirement(null)}
        title={selectedRequirement ? `需求：${selectedRequirement.title}` : ''}
        size="lg"
      >
        {selectedRequirement && (
          <div>
            {selectedRequirement.startDate && selectedRequirement.endDate && (
              <p className="text-[var(--ds-text-secondary)] mb-4">
                {formatDate(selectedRequirement.startDate)} - {formatDate(selectedRequirement.endDate)}
              </p>
            )}

            {selectedRequirement.links.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[var(--ds-font-size-md)] font-semibold mb-2">相关链接</h3>
                <div className="space-y-1">
                  {selectedRequirement.links.map((link, index) => (
                    <div key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--ds-text-link)] hover:underline text-[var(--ds-font-size-sm)]">{link.title}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[var(--ds-font-size-md)] font-semibold mb-4">相关人员</h3>
              {roleOrder.map(role => {
                const rolePersonnel = selectedRequirement.personnel
                  .filter(p => p.userRole === role)
                  .sort((a, b) => a.userName.localeCompare(b.userName, 'zh-CN'))

                if (rolePersonnel.length === 0) return null

                return (
                  <div key={role} className="mb-4">
                    <div className="text-[var(--ds-font-size-sm)] font-semibold text-[var(--ds-text-secondary)] mb-2 bg-[var(--ds-bg-hover)] px-3 py-2 rounded-[var(--ds-radius-sm)]">
                      {roleLabels[role]}
                    </div>
                    <div className="space-y-2 pl-4">
                      {rolePersonnel.map(person => (
                        <div key={person.userId} className="flex items-center justify-between p-3 bg-[var(--ds-bg-page)] rounded-[var(--ds-radius-sm)]">
                          <Link
                            href={`/person/${person.userId}`}
                            className="text-[var(--ds-text-link)] hover:underline font-medium"
                          >
                            {person.userName}
                          </Link>
                          <div className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
                            正在做：{person.currentTask || <span className="text-[var(--ds-text-disabled)]">无</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {selectedRequirement.personnel.length === 0 && (
                <div className="text-[var(--ds-text-disabled)] text-center py-8">
                  暂无相关人员
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 页面头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[var(--ds-font-size-xxl)] font-bold text-[var(--ds-text-primary)]">项目视图</h1>
      </div>

      {/* 筛选/折叠按钮 */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={collapsedSections.projects ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setCollapsedSections(s => ({ ...s, projects: !s.projects }))}
        >
          {collapsedSections.projects ? '展开项目' : '收起项目'}
        </Button>
        <Button
          variant={collapsedSections.requirements ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setCollapsedSections(s => ({ ...s, requirements: !s.requirements }))}
        >
          {collapsedSections.requirements ? '展开需求' : '收起需求'}
        </Button>
        <Button
          variant={collapsedSections.tasks ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setCollapsedSections(s => ({ ...s, tasks: !s.tasks }))}
        >
          {collapsedSections.tasks ? '展开任务' : '收起任务'}
        </Button>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-6">
        <Link href="/project/new">
          <Button variant="primary" size="sm">+ 添加项目</Button>
        </Link>
        <Link href="/requirement/new">
          <Button variant="secondary" size="sm">+ 添加需求</Button>
        </Link>
        <Link href="/manage">
          <Button variant="secondary" size="sm">+ 添加任务</Button>
        </Link>
      </div>

      {/* 项目列表 */}
      <div className="space-y-4">
        {!collapsedSections.projects && sortedProjects.map(project => {
          const currentReq = getCurrentRequirement(project)
          const nextReq = getNextRequirement(project)
          const isExpanded = expandedProjects.has(project.id)

          return (
            <div key={project.id} className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] overflow-hidden">
              {/* 项目头部 */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--ds-bg-hover)] border-b border-[var(--ds-border-default)]"
                onClick={() => toggleProjectExpand(project.id)}
              >
                {/* 展开图标 */}
                <button className="w-6 h-6 flex items-center justify-center text-[var(--ds-text-secondary)]">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* 项目图标 */}
                <div className="w-6 h-6 rounded bg-[var(--ds-brand-primary)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  </svg>
                </div>

                {/* 编号 */}
                {project.code && <CodeBadge code={project.code} type="project" />}

                {/* 标题 */}
                <Link
                  href={`/project/${project.id}`}
                  className="flex-1 font-medium text-[var(--ds-text-primary)] hover:text-[var(--ds-brand-primary)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {project.title}
                </Link>

                {/* 优先级 */}
                <PriorityBadge priority={project.priority} />

                {/* 日期 */}
                <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] w-32 text-right">
                  {formatDate(project.startDate)} - {formatDate(project.endDate)}
                </span>

                {/* 操作按钮 */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => setEditingProject(project)}>编辑</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProject(project.id)}>删除</Button>
                </div>
              </div>

              {/* 展开内容 */}
              {isExpanded && editingProject?.id !== project.id && (
                <div className="p-4">
                  {project.description && (
                    <p className="text-[var(--ds-text-secondary)] mb-4">{project.description}</p>
                  )}

                  {/* 当前/下一个需求 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-status-info-bg)] border border-[var(--ds-brand-primary)]/20">
                      <div className="text-[var(--ds-font-size-sm)] font-medium text-[var(--ds-text-secondary)] mb-2">当前进行</div>
                      {currentReq ? (
                        <div>
                          <Link href={`/requirement/${currentReq.id}`} className="font-medium text-[var(--ds-text-link)] hover:underline">
                            {currentReq.code && <CodeBadge code={currentReq.code} type="requirement" size="sm" />}
                            <span className="ml-2">{currentReq.title}</span>
                          </Link>
                          <div className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] mt-1">
                            {formatDate(currentReq.startDate)} - {formatDate(currentReq.endDate)}
                          </div>
                          <button onClick={() => showRequirementDetail(currentReq)} className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-link)] mt-1">查看人员</button>
                        </div>
                      ) : (
                        <span className="text-[var(--ds-text-disabled)]">无</span>
                      )}
                    </div>

                    <div className="p-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-bg-hover)]">
                      <div className="text-[var(--ds-font-size-sm)] font-medium text-[var(--ds-text-secondary)] mb-2">接下来</div>
                      {nextReq ? (
                        <div>
                          <Link href={`/requirement/${nextReq.id}`} className="font-medium text-[var(--ds-text-link)] hover:underline">
                            {nextReq.code && <CodeBadge code={nextReq.code} type="requirement" size="sm" />}
                            <span className="ml-2">{nextReq.title}</span>
                          </Link>
                          <div className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)] mt-1">
                            {formatDate(nextReq.startDate)} - {formatDate(nextReq.endDate)}
                          </div>
                          <button onClick={() => showRequirementDetail(nextReq)} className="text-[var(--ds-font-size-xs)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-link)] mt-1">查看人员</button>
                        </div>
                      ) : (
                        <span className="text-[var(--ds-text-disabled)]">无</span>
                      )}
                    </div>
                  </div>

                  {/* 添加需求表单 */}
                  {showRequirementForm === project.id ? (
                    <div className="bg-[var(--ds-bg-page)] rounded-[var(--ds-radius-md)] p-4 border border-[var(--ds-border-default)]">
                      <h3 className="font-semibold mb-3">为项目添加需求</h3>
                      <form onSubmit={(e) => handleCreateRequirement(e, project.id)} className="space-y-3">
                        <div>
                          <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">需求名称</label>
                          <input
                            type="text"
                            value={newRequirement.title}
                            onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)] focus:border-[var(--ds-border-focused)] focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">开始日期</label>
                            <input
                              type="date"
                              value={newRequirement.startDate}
                              onChange={(e) => setNewRequirement({ ...newRequirement, startDate: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                            />
                          </div>
                          <div>
                            <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">结束日期 *</label>
                            <input
                              type="date"
                              value={newRequirement.endDate}
                              onChange={(e) => setNewRequirement({ ...newRequirement, endDate: e.target.value })}
                              required
                              className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">优先级（0-5，0最高）</label>
                          <input
                            type="number"
                            value={newRequirement.priority}
                            onChange={(e) => setNewRequirement({ ...newRequirement, priority: parseInt(e.target.value) })}
                            min="0"
                            max="5"
                            required
                            className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] text-[var(--ds-font-size-sm)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">相关链接（可选）</label>
                          {reqLinks.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {reqLinks.map((link, index) => (
                                <div key={index} className="flex items-center gap-2 p-1.5 bg-[var(--ds-bg-card)] rounded text-[var(--ds-font-size-sm)]">
                                  <div className="flex-1 truncate">{link.title} - <span className="text-[var(--ds-text-secondary)]">{link.url}</span></div>
                                  <button type="button" onClick={() => setReqLinks(reqLinks.filter((_, i) => i !== index))} className="text-[var(--ds-status-error)] hover:opacity-80 text-[var(--ds-font-size-xs)]">删除</button>
                                </div>
                              ))}
                            </div>
                          )}
                          {reqLinks.length < 5 && (
                            <div className="flex gap-2">
                              <input type="text" placeholder="链接标题" value={newReqLinkTitle} onChange={(e) => setNewReqLinkTitle(e.target.value)} className="flex-1 px-2 py-1.5 border border-[var(--ds-border-default)] rounded text-[var(--ds-font-size-sm)]" />
                              <input type="url" placeholder="链接URL" value={newReqLinkUrl} onChange={(e) => setNewReqLinkUrl(e.target.value)} className="flex-1 px-2 py-1.5 border border-[var(--ds-border-default)] rounded text-[var(--ds-font-size-sm)]" />
                              <Button type="button" variant="secondary" size="sm" onClick={() => {
                                if (!newReqLinkTitle.trim() || !newReqLinkUrl.trim()) { alert('请填写链接标题和URL'); return }
                                setReqLinks([...reqLinks, { title: newReqLinkTitle, url: newReqLinkUrl }])
                                setNewReqLinkTitle(''); setNewReqLinkUrl('')
                              }}>添加</Button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" variant="primary" size="sm">创建需求</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setShowRequirementForm(null)}>取消</Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowRequirementForm(project.id)}
                      className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-link)] hover:underline"
                    >
                      + 添加需求
                    </button>
                  )}
                </div>
              )}

              {/* 编辑项目表单 */}
              {editingProject?.id === project.id && (
                <div className="p-4">
                  <form onSubmit={handleUpdateProject} className="space-y-4">
                    <div>
                      <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">项目名称</label>
                      <input
                        type="text"
                        value={editingProject.title}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">项目描述</label>
                      <textarea
                        value={editingProject.description || ''}
                        onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                        className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">开始日期</label>
                        <input
                          type="date"
                          value={editingProject.startDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[var(--ds-font-size-sm)] font-medium mb-1">结束日期</label>
                        <input
                          type="date"
                          value={editingProject.endDate || ''}
                          onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="primary" size="sm">保存</Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setEditingProject(null)}>取消</Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )
        })}

        {projects.length === 0 && standaloneRequirements.length === 0 && standaloneTasks.length === 0 && (
          <div className="text-center py-12 text-[var(--ds-text-disabled)]">
            暂无项目数据
          </div>
        )}

        {/* 独立需求 */}
        {!collapsedSections.requirements && standaloneRequirements.length > 0 && (
          <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] p-4 mt-6">
            <h2 className="text-[var(--ds-font-size-xl)] font-bold text-[var(--ds-text-primary)] mb-4">独立需求</h2>
            <div className="space-y-2">
              {standaloneRequirements.map(req => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 bg-[var(--ds-status-success-bg)] rounded-[var(--ds-radius-md)] border border-[var(--ds-status-success)]/20"
                >
                  <div className="w-5 h-5 rounded bg-[var(--ds-status-success)] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  {req.code && <CodeBadge code={req.code} type="requirement" />}
                  <Link href={`/requirement/${req.id}`} className="flex-1 font-medium text-[var(--ds-text-link)] hover:underline">{req.title}</Link>
                  <PriorityBadge priority={req.priority} />
                  <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
                    {formatDate(req.startDate)} - {formatDate(req.endDate)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRequirement(req.id)}>删除</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 独立任务 */}
        {!collapsedSections.tasks && standaloneTasks.length > 0 && (
          <div className="bg-[var(--ds-bg-card)] rounded-[var(--ds-radius-lg)] shadow-[var(--ds-shadow-card)] p-4 mt-6">
            <h2 className="text-[var(--ds-font-size-xl)] font-bold text-[var(--ds-text-primary)] mb-4">独立任务（进行中）</h2>
            <div className="space-y-2">
              {standaloneTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-[var(--ds-status-warning-bg)] rounded-[var(--ds-radius-md)] border border-[var(--ds-status-warning)]/20"
                >
                  <div className="w-5 h-5 rounded bg-[var(--ds-status-info)] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {task.code && <CodeBadge code={task.code} type="task" />}
                  <Link href={`/task/${task.id}`} className="flex-1 font-medium text-[var(--ds-text-link)] hover:underline">{task.title}</Link>
                  <PriorityBadge priority={task.priority} />
                  <span className="text-[var(--ds-font-size-sm)] text-[var(--ds-text-secondary)]">
                    {formatDate(task.planStartDate)} - {formatDate(task.planEndDate)}
                  </span>
                  <AssigneeAvatar users={[{ id: task.user.id, name: task.user.name }]} size="sm" />
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTask(task.id)}>删除</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

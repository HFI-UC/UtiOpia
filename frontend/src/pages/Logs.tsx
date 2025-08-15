import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'
import { API_BASE } from '@/lib/utils'
import { FileSearch } from 'lucide-react'

interface LogItem {
  id: number
  action: string
  user_id?: number
  meta: any
  created_at: string
}

export default function Logs() {
  const { token } = useAuth()
  const { toast } = useToast()
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Basic filters (server)
  const [action, setAction] = useState('')
  const [onlyError, setOnlyError] = useState(false)

  // Advanced filters (client)
  const [userId, setUserId] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [requestPath, setRequestPath] = useState('')
  const [hasTrace, setHasTrace] = useState(false)
  const [systemOnly, setSystemOnly] = useState(false)

  const [allItems, setAllItems] = useState<LogItem[]>([])
  const [items, setItems] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(false)

  // Search
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<LogItem[]>([])
  const searchTimer = useRef<number | null>(null)

  function pretty(v: any) {
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
  }

  async function load() {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/logs`, { params: { action, only_error: onlyError ? 1 : 0 }, headers })
      const list: LogItem[] = res.data.items || []
      setAllItems(list)
      applyAdvancedFilters(list)
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '加载失败' })
    } finally {
      setLoading(false)
    }
  }

  function applyAdvancedFilters(base?: LogItem[]) {
    let filtered = searchKeyword.trim() ? [...searchResults] : [...(base || allItems)]

    if (userId) filtered = filtered.filter(l => l.user_id && String(l.user_id).includes(userId))
    if (systemOnly) filtered = filtered.filter(l => !l.user_id)

    if (ipAddress) {
      filtered = filtered.filter(l => {
        const meta = l.meta
        if (typeof meta === 'object' && meta) {
          return (
            (meta.ip && String(meta.ip).includes(ipAddress)) ||
            (meta.headers && meta.headers['Cf-Connecting-Ip'] && String(meta.headers['Cf-Connecting-Ip']).includes(ipAddress)) ||
            (meta.headers && meta.headers['X-Forwarded-For'] && String(meta.headers['X-Forwarded-For']).includes(ipAddress))
          )
        }
        return false
      })
    }

    if (requestPath) {
      filtered = filtered.filter(l => {
        const meta = l.meta
        if (typeof meta === 'object' && meta) {
          return meta.path && String(meta.path).includes(requestPath)
        }
        return false
      })
    }

    if (hasTrace) {
      filtered = filtered.filter(l => {
        const meta = l.meta
        if (typeof meta === 'object' && meta) {
          return meta.trace || meta.message
        }
        return false
      })
    }

    if (startDate) {
      const start = new Date(startDate)
      filtered = filtered.filter(l => new Date(l.created_at) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      filtered = filtered.filter(l => new Date(l.created_at) <= end)
    }

    setItems(filtered)
  }

  function performSearch() {
    if (!searchKeyword.trim()) {
      setSearchResults([])
      applyAdvancedFilters()
      return
    }
    const keyword = searchKeyword.toLowerCase().trim()
    const filtered = allItems.filter(log => {
      if (log.action && log.action.toLowerCase().includes(keyword)) return true
      if (log.user_id && String(log.user_id).includes(keyword)) return true
      if (formatTime(log.created_at).toLowerCase().includes(keyword)) return true
      if (log.meta) {
        try {
          return JSON.stringify(log.meta).toLowerCase().includes(keyword)
        } catch {
          return String(log.meta).toLowerCase().includes(keyword)
        }
      }
      return false
    })
    setSearchResults(filtered)
    setItems(filtered)
    applyAdvancedFilters(filtered)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { applyAdvancedFilters() }, [userId, ipAddress, requestPath, hasTrace, systemOnly, startDate, endDate])

  function clearFilters() {
    setAction('')
    setOnlyError(false)
    setUserId('')
    setIpAddress('')
    setStartDate('')
    setEndDate('')
    setRequestPath('')
    setHasTrace(false)
    setSystemOnly(false)
    setSearchKeyword('')
    setSearchResults([])
    load()
  }

  function onSearchInput(v: string) {
    setSearchKeyword(v)
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => performSearch(), 300)
  }

  function exportLogs() {
    if (items.length === 0) return
    const rows = items.map(l => ({
      ID: l.id,
      操作类型: l.action,
      用户: l.user_id || '系统',
      详细信息: pretty(l.meta),
      时间: formatTime(l.created_at)
    }))
    const header = Object.keys(rows[0]).join(',')
    const csv = header + '\n' + rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    const a = document.createElement('a')
    a.href = uri
    a.download = `logs_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileSearch className="h-8 w-8 text-primary" />
          系统日志
        </h1>
        <p className="text-muted-foreground mt-2">查看系统操作日志和审计记录</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>高级日志筛选</CardTitle>
          <CardDescription>服务端筛选 + 客户端增强过滤与搜索</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div>
            <Label>搜索</Label>
            <Input value={searchKeyword} onChange={e=>onSearchInput(e.target.value)} placeholder="搜索日志内容、操作类型、用户ID、IP地址..." />
          </div>
          {/* Basic filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>操作类型</Label>
              <Input value={action} onChange={e=>setAction(e.target.value)} placeholder="error, login, create..." />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="onlyErr" type="checkbox" checked={onlyError} onChange={e=>setOnlyError(e.target.checked)} />
              <Label htmlFor="onlyErr">仅显示错误日志</Label>
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={load}>刷新日志</Button>
            </div>
          </div>

          {/* Advanced client filters */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>用户ID</Label>
              <Input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="输入用户ID" />
            </div>
            <div>
              <Label>IP地址</Label>
              <Input value={ipAddress} onChange={e=>setIpAddress(e.target.value)} placeholder="输入IP地址" />
            </div>
            <div>
              <Label>请求路径</Label>
              <Input value={requestPath} onChange={e=>setRequestPath(e.target.value)} placeholder="/api/login" />
            </div>
            <div>
              <Label>开始日期</Label>
              <Input type="datetime-local" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>结束日期</Label>
              <Input type="datetime-local" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input id="hasTrace" type="checkbox" checked={hasTrace} onChange={e=>setHasTrace(e.target.checked)} />
                <Label htmlFor="hasTrace">包含错误堆栈</Label>
              </div>
              <div className="flex items-center gap-2">
                <input id="systemOnly" type="checkbox" checked={systemOnly} onChange={e=>setSystemOnly(e.target.checked)} />
                <Label htmlFor="systemOnly">仅系统操作</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearFilters}>清空筛选</Button>
            <Button variant="outline" onClick={exportLogs}>导出日志</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>日志记录</CardTitle>
          <CardDescription>共 {items.length} 条</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">操作类型</th>
                  <th className="py-2 px-2">用户</th>
                  <th className="py-2 px-2">详细信息</th>
                  <th className="py-2 px-2">时间</th>
                </tr>
              </thead>
              <tbody>
                {items.map(log => (
                  <tr key={log.id} className="border-t align-top">
                    <td className="py-2 px-2 font-mono text-muted-foreground">#{log.id}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono ${
                        log.action.includes('error') || log.action.includes('fail') ? 'bg-red-600 text-white' :
                        log.action.includes('warn') ? 'bg-amber-500 text-white' :
                        (log.action.includes('success') || log.action.includes('create') || log.action.includes('login')) ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-2">{log.user_id ? `用户 #${log.user_id}` : <span className="text-muted-foreground">系统</span>}</td>
                    <td className="py-2 px-2 w-[520px]">
                      <details>
                        <summary className="cursor-pointer select-none">展开详情</summary>
                        <pre className="mt-2 max-h-64 overflow-auto rounded border bg-black text-white p-3 text-xs">{pretty(log.meta)}</pre>
                      </details>
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && items.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">暂无日志记录</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

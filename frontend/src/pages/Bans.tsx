import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import axios from 'axios'
import { API_BASE } from '@/lib/utils'
import { Ban as BanIcon } from 'lucide-react'

type BanType = 'email'|'student_id'

interface BanItem {
  id: number
  type: BanType
  value: string
  stage?: number
  active: boolean
  reason?: string
  expires_at?: string
  created_at: string
}

export default function Bans() {
  const { token } = useAuth()
  const { toast } = useToast()
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  const [type, setType] = useState<BanType>('email')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [items, setItems] = useState<BanItem[]>([])
  const [loading, setLoading] = useState(false)

  const activeCount = items.filter(b => b.active).length

  async function load() {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/bans`, { headers })
      setItems(res.data.items || [])
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '加载失败' })
    } finally {
      setLoading(false)
    }
  }

  async function create() {
    try {
      await axios.post(`${API_BASE}/bans`, { type, value, reason, stage }, { headers })
      toast({ variant: 'success', description: '已封禁' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '封禁失败' })
    }
  }

  async function remove() {
    try {
      await axios.delete(`${API_BASE}/bans`, { data: { type, value }, headers } as any)
      toast({ variant: 'success', description: '已解除封禁' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '解除失败' })
    }
  }

  useEffect(() => { load() }, [])

  function getTypeText(t: BanType) {
    return t === 'email' ? '📧 邮箱' : '🎓 学号'
  }

  function formatTime(t?: string) {
    if (!t) return '-'
    const d = new Date(t)
    return d.toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BanIcon className="h-8 w-8 text-primary" />
          用户封禁
        </h1>
        <p className="text-muted-foreground mt-2">管理用户封禁和解禁操作</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新增封禁</CardTitle>
            <CardDescription>添加邮箱或学生号封禁</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>封禁类型</Label>
                <select className="border rounded-md px-3 py-2 text-sm w-full" value={type} onChange={e=>setType(e.target.value as BanType)}>
                  <option value="email">📧 邮箱封禁</option>
                  <option value="student_id">🎓 学号封禁</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>封禁目标</Label>
                <Input value={value} onChange={e=>setValue(e.target.value)} placeholder={type==='email' ? 'xxx.yyy2023@school.edu' : 'GJ20xxxxxx'} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <div>
                <Label>封禁阶段</Label>
                <select className="border rounded-md px-3 py-2 text-sm w-full" value={stage} onChange={e=>setStage(Number(e.target.value))}>
                  <option value={1}>阶段1 (7天)</option>
                  <option value={2}>阶段2 (14天)</option>
                  <option value={3}>阶段3 (30天)</option>
                  <option value={4}>阶段4 (60天)</option>
                  <option value={5}>阶段5 (90天)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label>封禁原因 (可选)</Label>
                <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="请输入封禁原因" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={create}>新增封禁</Button>
              <Button variant="secondary" onClick={remove}>解除封禁</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>封禁记录</CardTitle>
            <CardDescription>共 {items.length} 条，生效中 {activeCount} 条</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 px-2">ID</th>
                    <th className="py-2 px-2">类型</th>
                    <th className="py-2 px-2">目标值</th>
                    <th className="py-2 px-2">阶段</th>
                    <th className="py-2 px-2">状态</th>
                    <th className="py-2 px-2">到期时间</th>
                    <th className="py-2 px-2">原因</th>
                    <th className="py-2 px-2">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(b => (
                    <tr key={b.id} className="border-t">
                      <td className="py-2 px-2 font-mono text-muted-foreground">#{b.id}</td>
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          {getTypeText(b.type)}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono">{b.value}</td>
                      <td className="py-2 px-2">
                        {b.stage ? <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">阶段{b.stage}</span> : '-'}
                      </td>
                      <td className="py-2 px-2">
                        {b.active ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">生效中</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">已失效</span>
                        )}
                      </td>
                      <td className="py-2 px-2">{formatTime(b.expires_at)}</td>
                      <td className="py-2 px-2">{b.reason || <span className="text-muted-foreground">无原因</span>}</td>
                      <td className="py-2 px-2">{formatTime(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && items.length === 0 && (
                <div className="py-10 text-center text-muted-foreground">暂无封禁记录</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

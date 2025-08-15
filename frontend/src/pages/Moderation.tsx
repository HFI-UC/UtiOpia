import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'
import { API_BASE, formatTime, getStatusText, cn } from '@/lib/utils'
import { Shield, Check, X } from 'lucide-react'

interface MessageItem {
  id: number
  content: string
  image_url?: string
  is_anonymous: boolean
  anon_email?: string
  anon_student_id?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export default function Moderation() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<MessageItem[]>([])
  const [status, setStatus] = useState<'pending'|'approved'|'rejected'|'all'>('pending')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  async function fetch(reset=false) {
    if (loading) return
    setLoading(true)
    try {
      const nextPage = reset ? 1 : page
      const params: any = { page: nextPage, pageSize: 10 }
      if (status !== 'all') params.status = status
      const res = await axios.get(`${API_BASE}/messages`, { params, headers })
      const list: MessageItem[] = res.data.items || []
      setTotal(res.data.total || 0)
      setItems(prev => reset ? list : prev.concat(list))
      setPage(nextPage + 1)
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '加载失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetch(true) }, [status])

  async function approve(id: number) {
    try {
      await axios.post(`${API_BASE}/messages/${id}/approve`, {}, { headers })
      toast({ variant: 'success', description: '已通过审核' })
      fetch(true)
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '操作失败' })
    }
  }

  async function reject(id: number) {
    try {
      const reason = window.prompt('拒绝理由：') || ''
      await axios.post(`${API_BASE}/messages/${id}/reject`, { reason }, { headers })
      toast({ variant: 'success', description: '已拒绝内容' })
      fetch(true)
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '操作失败' })
    }
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          内容审核
        </h1>
        <p className="text-muted-foreground mt-2">审核待发布的纸条内容</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>审核筛选</CardTitle>
          <CardDescription>按状态查看内容</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
            <div>
              <Label>内容状态</Label>
              <select
                className="border rounded-md px-3 py-2 text-sm w-full"
                value={status}
                onChange={e=>setStatus(e.target.value as any)}
              >
                <option value="pending">⏳ 待审核</option>
                <option value="rejected">❌ 已拒绝</option>
                <option value="approved">✅ 已通过</option>
                <option value="all">📋 全部状态</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={()=>fetch(true)}>刷新列表</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.map(m => (
          <Card key={m.id} className={cn(
            m.status==='pending' && 'border-yellow-300',
            m.status==='approved' && 'border-emerald-300',
            m.status==='rejected' && 'border-red-300',
          )}>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">#{m.id}</span>
                <span className="text-xs text-muted-foreground">{formatTime(m.created_at)}</span>
                <span className={cn(
                  'status-badge',
                  `status-${m.status}`
                )}>{getStatusText(m.status)}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
              {m.image_url && (
                <div className="mt-3">
                  <img src={m.image_url} alt="用户上传图片" className="rounded-md max-h-80 object-cover" />
                </div>
              )}
              {m.is_anonymous && (
                <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground flex gap-6 flex-wrap">
                  <div>匿名邮箱：{m.anon_email || '-'}</div>
                  <div>学生号：{m.anon_student_id || '-'}</div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600/90" onClick={()=>approve(m.id)}>
                  <Check className="h-4 w-4 mr-1"/> 通过审核
                </Button>
                <Button size="sm" variant="destructive" onClick={()=>reject(m.id)}>
                  <X className="h-4 w-4 mr-1"/> 拒绝内容
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {loading && (
          <div className="text-center text-muted-foreground">加载中...</div>
        )}
        {!loading && items.length===0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">暂无内容</CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        {(items.length < total) && (
          <Button variant="secondary" onClick={()=>fetch(false)}>加载更多</Button>
        )}
      </div>
    </div>
  )
}

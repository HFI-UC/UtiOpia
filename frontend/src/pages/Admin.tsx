import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'
import { API_BASE } from '@/lib/utils'
import { Shield, Search, Trash2, CheckCircle2 } from 'lucide-react'

interface UserItem {
  id: number
  email: string
  nickname: string
  role: 'user' | 'moderator' | 'super_admin'
  banned?: boolean
  student_id?: string
}

export default function Admin() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [allUsers, setAllUsers] = useState<UserItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  const [qEmail, setQEmail] = useState('')
  const [qStudent, setQStudent] = useState('')
  const [loading, setLoading] = useState(false)

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  async function load() {
    try {
      setLoading(true)
      const res = await axios.get(`${API_BASE}/users`, { headers })
      const items: UserItem[] = res.data.items || []
      setAllUsers(items)
      setUsers(filter(items, qEmail, qStudent))
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message || '加载用户失败' })
    } finally {
      setLoading(false)
    }
  }

  function filter(list: UserItem[], email: string, student: string) {
    let out = list
    if (email) out = out.filter(u => String(u.email).includes(email))
    if (student) out = out.filter(u => String(u.student_id || '').includes(student))
    return out
  }

  function clearSearch() {
    setQEmail('')
    setQStudent('')
    setUsers(allUsers)
  }

  async function updateRole(u: UserItem, role: UserItem['role']) {
    try {
      await axios.put(`${API_BASE}/users/${u.id}`, { role }, { headers })
      toast({ variant: 'success', description: '角色已更新' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message || '更新失败' })
    }
  }

  async function ban(u: UserItem) {
    try {
      await axios.post(`${API_BASE}/users/${u.id}/ban`, {}, { headers })
      toast({ variant: 'success', description: '已封禁用户' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '封禁失败' })
    }
  }

  async function unban(u: UserItem) {
    try {
      await axios.post(`${API_BASE}/users/${u.id}/unban`, {}, { headers })
      toast({ variant: 'success', description: '已解除封禁' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '解封失败' })
    }
  }

  async function banEmail(email: string) {
    try {
      await axios.post(`${API_BASE}/bans`, { type: 'email', value: email, stage: 3 }, { headers })
      toast({ variant: 'success', description: '已封禁邮箱' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '封禁邮箱失败' })
    }
  }

  async function banStudent(studentId?: string) {
    if (!studentId) return
    try {
      await axios.post(`${API_BASE}/bans`, { type: 'student_id', value: studentId, stage: 3 }, { headers })
      toast({ variant: 'success', description: '已封禁学号' })
      await load()
    } catch (e:any) {
      toast({ variant: 'destructive', description: e.message || '封禁学号失败' })
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    setUsers(filter(allUsers, qEmail, qStudent))
  }, [qEmail, qStudent, allUsers])

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          管理面板
        </h1>
        <p className="text-muted-foreground mt-2">系统管理和用户管理功能</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>用户搜索</CardTitle>
          <CardDescription>通过邮箱或学生号筛选用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div>
              <Label htmlFor="qEmail">邮箱</Label>
              <Input id="qEmail" value={qEmail} onChange={e=>setQEmail(e.target.value)} placeholder="输入邮箱" />
            </div>
            <div>
              <Label htmlFor="qStudent">学生号</Label>
              <Input id="qStudent" value={qStudent} onChange={e=>setQStudent(e.target.value)} placeholder="输入学生号" />
            </div>
            <div className="flex gap-2">
              <Button className="w-full" onClick={load}><Search className="h-4 w-4 mr-2"/>搜索用户</Button>
              <Button variant="outline" className="w-full" onClick={clearSearch}><Trash2 className="h-4 w-4 mr-2"/>清空</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
          <CardDescription>共 {users.length} 个用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 px-2">ID</th>
                  <th className="py-2 px-2">邮箱</th>
                  <th className="py-2 px-2">昵称</th>
                  <th className="py-2 px-2">角色</th>
                  <th className="py-2 px-2">状态</th>
                  <th className="py-2 px-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="py-2 px-2 font-mono text-muted-foreground">#{u.id}</td>
                    <td className="py-2 px-2 font-medium">{u.email}</td>
                    <td className="py-2 px-2">{u.nickname}</td>
                    <td className="py-2 px-2">
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={u.role}
                        onChange={(e)=>updateRole(u, e.target.value as UserItem['role'])}
                      >
                        <option value="user">普通用户</option>
                        <option value="moderator">版主</option>
                        <option value="super_admin">超级管理员</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      {u.banned ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">已封禁</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">正常</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-2">
                        {u.banned ? (
                          <Button size="sm" variant="secondary" onClick={()=>unban(u)}>
                            <CheckCircle2 className="h-4 w-4 mr-1"/> 解封
                          </Button>
                        ) : (
                          <Button size="sm" variant="destructive" onClick={()=>ban(u)}>
                            <Trash2 className="h-4 w-4 mr-1"/> 封禁
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={()=>banEmail(u.email)}>封邮箱</Button>
                        {u.student_id && (
                          <Button size="sm" variant="outline" onClick={()=>banStudent(u.student_id)}>封学号</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

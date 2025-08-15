import React, { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Turnstile } from '@/components/Turnstile'
import { API_BASE } from '@/lib/utils'
import { PenTool, Upload, X, Smile, Heart, Sparkles, Image as ImageIcon } from 'lucide-react'
import axios from 'axios'

export default function Write() {
  const { user, isAuthed, token } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAnonymousMutable, setIsAnonymousMutable] = useState(false)
  const [anonEmail, setAnonEmail] = useState('')
  const [anonStudentId, setAnonStudentId] = useState('')
  const [anonPassphrase, setAnonPassphrase] = useState('')
  const [isDragActive, setIsDragActive] = useState(false)

  const isAnonymous = isAuthed ? isAnonymousMutable : true

  const canSubmit = () => {
    if (!content.trim()) return false
    if (!turnstileToken) return false
    if (isAnonymous && !isAuthed) {
      return anonEmail && anonStudentId && anonPassphrase
    }
    return true
  }

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        description: '文件过大，最大 5MB'
      })
      return
    }
    setFileName(file.name)
    uploadViaCOS(file)
  }

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFileSelect(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }

  const removeImage = () => {
    setImageUrl('')
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadViaCOS = async (file: File) => {
    try {
      const authHeaders: any = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.post(`${API_BASE}/upload/presign`, { 
        filename: file.name, 
        size: file.size 
      }, { headers: authHeaders })
      
      if (res.data.error) throw new Error(res.data.error)
      
      const { upload_url, headers: uploadHeaders, public_url, get_url } = res.data
      await fetch(upload_url, { method: 'PUT', headers: uploadHeaders, body: file })
      setImageUrl(get_url || public_url)
      setFileName('')
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || '图片上传失败'
      })
    }
  }

  const addEmoji = (emoji: string) => {
    setContent(prev => prev + emoji)
  }

  const submit = async () => {
    if (!canSubmit()) return
    
    try {
      setLoading(true)
      
      const payload: any = { 
        content, 
        image_url: imageUrl, 
        turnstile_token: turnstileToken, 
        is_anonymous: isAnonymous 
      }
      
      if (isAnonymous && !isAuthed) {
        payload.anon_email = anonEmail
        payload.anon_student_id = anonStudentId
        payload.anon_passphrase = anonPassphrase
      }
      
      if (!isAnonymous && isAuthed) {
        const confirmed = window.confirm('你将以实名发布。其他用户可以看到"由你发布"的标识。是否继续？')
        if (!confirmed) {
          setLoading(false)
          return
        }
      }
      
      const headers: any = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.post(`${API_BASE}/messages`, payload, { headers })
      
      if (res.data.error) throw new Error(res.data.error)
      
      // Reset form
      setContent('')
      setImageUrl('')
      setFileName('')
      setAnonEmail('')
      setAnonStudentId('')
      setAnonPassphrase('')
      setTurnstileToken('')
      
      toast({
        variant: "success",
        description: '纸条发布成功，正在等待审核！'
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || '发布失败'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title flex items-center gap-3">
            <PenTool className="h-12 w-12" />
            写纸条
          </h1>
          <p className="hero-subtitle">分享你的想法，让心声传达到更远的地方</p>
        </div>
      </section>

      <div className="container py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>创建新纸条</CardTitle>
                <CardDescription>
                  写下你想分享的内容，可以是想法、心情或者有趣的故事
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Auth Options */}
                {isAuthed && (
                  <div className="flex items-center space-x-2 p-4 rounded-lg bg-purple-50 border border-purple-200">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={isAnonymousMutable}
                      onChange={(e) => setIsAnonymousMutable(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="anonymous" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-lg">🕶️</span>
                      <div>
                        <div className="font-medium">匿名发布</div>
                        <div className="text-sm text-muted-foreground">其他用户将看不到你的身份</div>
                      </div>
                    </Label>
                  </div>
                )}

                {/* Anonymous User Info */}
                {isAnonymous && !isAuthed && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2 mb-2">
                        <span>👤</span>
                        身份信息
                      </h3>
                      <p className="text-sm text-muted-foreground">请填写基本信息用于身份验证</p>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="anon-email">学校邮箱</Label>
                        <Input
                          id="anon-email"
                          type="email"
                          value={anonEmail}
                          onChange={(e) => setAnonEmail(e.target.value)}
                          placeholder="your.email@school.edu"
                        />
                      </div>
                      <div>
                        <Label htmlFor="anon-student-id">学生号</Label>
                        <Input
                          id="anon-student-id"
                          value={anonStudentId}
                          onChange={(e) => setAnonStudentId(e.target.value)}
                          placeholder="202X0123456"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="anon-passphrase">身份口令</Label>
                      <Input
                        id="anon-passphrase"
                        type="password"
                        value={anonPassphrase}
                        onChange={(e) => setAnonPassphrase(e.target.value)}
                        placeholder="用于编辑和删除的口令"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        请记住此口令，用于后续编辑或删除纸条
                      </p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="content">内容</Label>
                    <span className="text-sm text-muted-foreground">
                      {content.length}/500
                    </span>
                  </div>
                  
                  <div className="relative">
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={500}
                      rows={8}
                      placeholder="写下你想说的话...

可以是：
💭 一个有趣的想法
😊 今天的心情
📚 学习感悟
🎵 喜欢的歌词
或者任何你想分享的内容"
                      className="resize-none"
                    />
                    
                    {/* Emoji buttons */}
                    <div className="absolute bottom-3 right-3 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('😊')}
                        className="h-8 w-8 p-0"
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('💝')}
                        className="h-8 w-8 p-0"
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addEmoji('🎉')}
                        className="h-8 w-8 p-0"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4" />
                    图片 (可选)
                  </Label>
                  
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted-foreground/25 hover:border-primary/50'
                    }`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                  >
                    {!imageUrl ? (
                      <div className="space-y-4">
                        <div className="text-4xl">📸</div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            拖拽图片到这里或{' '}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-primary hover:underline font-medium"
                            >
                              点击选择
                            </button>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            支持 JPG、PNG 格式，最大 5MB
                          </p>
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={pickFile}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <img 
                          src={imageUrl} 
                          alt="预览图" 
                          className="max-w-full h-auto max-h-64 mx-auto rounded-lg"
                        />
                        <div className="mt-4 flex gap-2 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={removeImage}
                          >
                            <X className="h-4 w-4 mr-1" />
                            移除图片
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            重新选择
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {fileName && !imageUrl && (
                      <div className="mt-4 text-sm text-muted-foreground">
                        {fileName} - 上传中...
                      </div>
                    )}
                  </div>
                </div>

                {/* Security */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <span>🔒</span>
                    安全验证
                  </Label>
                  <div className="flex justify-center p-4 border rounded-lg bg-muted/25">
                    <Turnstile onVerified={setTurnstileToken} />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col items-center gap-4">
                <Button
                  onClick={submit}
                  disabled={loading || !canSubmit()}
                  size="lg"
                  className="w-full sm:w-auto min-w-40"
                >
                  {loading ? (
                    <>
                      <div className="spinner mr-2" />
                      发布中...
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" />
                      发布纸条
                    </>
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground text-center">
                  发布后需要等待审核通过才会显示
                </p>
              </CardFooter>
            </Card>
          </div>

          {/* Tips Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💡</span>
                  小贴士
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    内容应当积极向上，遵守社区规范
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    支持换行和简单的文本格式
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    图片会自动压缩到合适大小
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    匿名发布时请记住身份口令
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    所有内容都会经过审核
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

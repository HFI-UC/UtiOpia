import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, GraduationCap, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import useAuthStore from '../stores/authStore';
import Turnstile from '../components/Turnstile';

const Register = () => {
  const navigate = useNavigate();
  const { register, login, isLoading, error, clearError } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    password: '',
    studentId: ''
  });
  const [turnstileToken, setTurnstileToken] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除相关验证错误
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (error) clearError();
  };

  const validateForm = () => {
    const errors = {};
    
    // 邮箱验证
    const emailPattern = /^[a-z]+\.[a-z]+20\d{2}@gdhfi\.com$/;
    if (!emailPattern.test(formData.email)) {
      errors.email = '邮箱格式需符合学校规范：firstname.lastname20XX@gdhfi.com';
    }
    
    // 学生号验证
    const idPattern = /^GJ20\d{2}\d{4}$/;
    if (!idPattern.test(formData.studentId)) {
      errors.studentId = '学生号格式：GJ + 年份 + 4位数字（如：GJ20230001）';
    }
    
    // 昵称验证
    if (formData.nickname.length < 2 || formData.nickname.length > 50) {
      errors.nickname = '昵称长度应在2-50个字符之间';
    }
    
    // 密码验证
    if (formData.password.length < 6) {
      errors.password = '密码至少需要6个字符';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!turnstileToken) {
      toast.error('请完成安全验证');
      return;
    }

    try {
      await register(
        formData.email, 
        formData.password, 
        formData.nickname, 
        formData.studentId, 
        turnstileToken
      );
      
      toast.success('注册成功！正在自动登录...');
      
      // 注册成功后自动登录
      await login(formData.email, formData.password, turnstileToken);
      navigate('/');
      } catch {
        // 错误已经在store中处理
      }
    };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Register Form */}
        <div className="lg:col-span-2">
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="space-y-1 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">用户注册</CardTitle>
              <CardDescription>
                加入 UtiOpia 小纸条，开始分享你的心声
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">学校邮箱</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="firstname.lastname2023@gdhfi.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        className={`pl-10 ${validationErrors.email ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="text-xs text-red-500">{validationErrors.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">请使用学校官方邮箱</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="studentId">学生号</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="studentId"
                        name="studentId"
                        placeholder="GJ20230001"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        className={`pl-10 ${validationErrors.studentId ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {validationErrors.studentId && (
                      <p className="text-xs text-red-500">{validationErrors.studentId}</p>
                    )}
                    <p className="text-xs text-muted-foreground">格式：GJ + 年份 + 4位数字</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nickname">昵称</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nickname"
                      name="nickname"
                      placeholder="请输入您的昵称"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      className={`pl-10 ${validationErrors.nickname ? 'border-red-500' : ''}`}
                      maxLength={50}
                      required
                    />
                  </div>
                  {validationErrors.nickname && (
                    <p className="text-xs text-red-500">{validationErrors.nickname}</p>
                  )}
                  <p className="text-xs text-muted-foreground">最多50个字符，用于显示身份</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="请设置至少6位密码"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`pl-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                      minLength={6}
                      required
                    />
                  </div>
                  {validationErrors.password && (
                    <p className="text-xs text-red-500">{validationErrors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">至少6个字符，建议包含字母和数字</p>
                </div>
                
                <div className="space-y-2">
                  <Label>安全验证</Label>
                  <Turnstile onVerified={setTurnstileToken} />
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || !turnstileToken}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      立即注册
                    </>
                  )}
                </Button>
                
                <p className="text-center text-sm text-muted-foreground">
                  已有账户？{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    立即登录
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-0 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">📋</span>
              </div>
              <span>注册须知</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">仅限学校师生注册使用</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">邮箱格式需符合学校规范</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">学生号格式：GJ + 年份 + 4位数字</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">注册成功后可选择匿名或实名发布</p>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">请遵守社区规范，文明发言</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                <span className="text-blue-500">🛡️</span>
                <span>隐私保护</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                我们严格保护您的个人信息，所有数据都经过加密处理，绝不会泄露给第三方。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;


import { useTheme } from '../contexts/ThemeContext';
import LiquidGlassCard from '../components/LiquidGlassCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sun, 
  Moon, 
  Sparkles, 
  Palette,
  Monitor,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ThemeDemo = () => {
  const { theme, isLiquidGlass, toggleTheme, toggleLiquidGlass, setSpecificTheme } = useTheme();

  const themes = [
    { id: 'light', name: '浅色主题', icon: Sun, description: '明亮清晰的界面设计' },
    { id: 'dark', name: '深色主题', icon: Moon, description: '护眼的深色界面' },
    { id: 'ios-glass', name: 'iOS 毛玻璃', icon: Sparkles, description: '原生 iOS 毛玻璃视觉与柔和动效' }
  ];

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回首页
        </Link>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          主题演示
        </h1>
        <p className="text-muted-foreground mt-2">
          体验不同的主题效果与 iOS 毛玻璃组件的魅力
        </p>
      </div>

      {/* Current Theme Display */}
      <div className={`mb-8 ${isLiquidGlass ? 'glass-wrapper' : ''}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              当前主题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {isLiquidGlass ? 'iOS 毛玻璃' : (theme === 'light' ? '浅色' : '深色')}
              </Badge>
              <span className="text-muted-foreground">
                主题ID: {isLiquidGlass ? 'ios-glass' : theme}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Theme Controls */}
      <div className={isLiquidGlass ? 'glass-wrapper mb-12' : 'mb-12'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isActive = (themeOption.id === 'ios-glass' && isLiquidGlass) || 
                          (themeOption.id === theme && !isLiquidGlass);
          
          return (
            <Card 
              key={themeOption.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isActive ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => {
                if (themeOption.id === 'ios-glass') {
                  toggleLiquidGlass();
                } else {
                  setSpecificTheme(themeOption.id);
                }
              }}
            >
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle>{themeOption.name}</CardTitle>
                <CardDescription>{themeOption.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                {isActive && (
                  <Badge variant="default" className="w-full">
                    当前使用
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>

      {/* iOS Glass Demo */}
      <div className={isLiquidGlass ? 'glass-wrapper mb-12' : 'mb-12'}>
        <h2 className="text-2xl font-bold mb-6">iOS 毛玻璃效果演示</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Card */}
          <LiquidGlassCard>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">基础卡片</h3>
              <p className="text-muted-foreground">默认毛玻璃效果</p>
            </div>
          </LiquidGlassCard>

          {/* High Elasticity */}
          <LiquidGlassCard elasticity={0.6} displacementScale={80}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">高弹性</h3>
              <p className="text-muted-foreground">更强的液态感</p>
            </div>
          </LiquidGlassCard>

          {/* High Blur */}
          <LiquidGlassCard blurAmount={0.2} saturation={150}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">高模糊</h3>
              <p className="text-muted-foreground">更强的毛玻璃效果</p>
            </div>
          </LiquidGlassCard>

          {/* High Aberration */}
          <LiquidGlassCard aberrationIntensity={4} elasticity={0.4}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">高色差</h3>
              <p className="text-muted-foreground">更强的色散效果</p>
            </div>
          </LiquidGlassCard>

          {/* Rounded */}
          <LiquidGlassCard cornerRadius={32} displacementScale={50}>
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">圆角设计</h3>
              <p className="text-muted-foreground">更柔和的边角</p>
            </div>
          </LiquidGlassCard>

          {/* Interactive */}
          <LiquidGlassCard 
            onClick={() => alert('液态玻璃卡片被点击了！')}
            className="cursor-pointer"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">交互式</h3>
              <p className="text-muted-foreground">点击试试看</p>
            </div>
          </LiquidGlassCard>
        </div>
      </div>

      {/* Theme Features */}
      <div className={isLiquidGlass ? 'glass-wrapper mb-12' : 'mb-12'}>
        <h2 className="text-2xl font-bold mb-6">主题特性</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                浅色主题
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 明亮清晰的界面</li>
                <li>• 适合日间使用</li>
                <li>• 减少眼睛疲劳</li>
                <li>• 经典的设计风格</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                深色主题
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 护眼的深色界面</li>
                <li>• 适合夜间使用</li>
                <li>• 节省电池电量</li>
                <li>• 现代的设计风格</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                液态玻璃主题
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">视觉效果</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 真实的液态玻璃效果</li>
                    <li>• 动态的光线折射</li>
                    <li>• 可配置的模糊程度</li>
                    <li>• 色差和弹性效果</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">技术特性</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• 基于WebGL的渲染</li>
                    <li>• 响应式鼠标交互</li>
                    <li>• 高性能动画效果</li>
                    <li>• 跨浏览器兼容性</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={isLiquidGlass ? 'glass-wrapper text-center' : 'text-center'}>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={toggleTheme} variant="outline">
            <Palette className="w-4 h-4 mr-2" />
            切换主题
          </Button>
          <Button onClick={toggleLiquidGlass} variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            切换液态玻璃
          </Button>
          <Button onClick={() => setSpecificTheme('light')} variant="outline">
            <Sun className="w-4 h-4 mr-2" />
            设为浅色
          </Button>
          <Button onClick={() => setSpecificTheme('dark')} variant="outline">
            <Moon className="w-4 h-4 mr-2" />
            设为深色
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;


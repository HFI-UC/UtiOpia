import LiquidGlassCard from './LiquidGlassCard';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LiquidGlassDemo = () => {
  return (
    <div className="py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-500" />
          iOS 毛玻璃效果
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          体验原生 iOS 风格的毛玻璃视觉与柔和动效，呈现通透、精致的层级感
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <LiquidGlassCard>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">基础效果</h3>
            <p className="text-sm text-muted-foreground">默认毛玻璃设置</p>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard elasticity={0.6} displacementScale={80}>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">高弹性</h3>
            <p className="text-sm text-muted-foreground">更强的流动感</p>
          </div>
        </LiquidGlassCard>

        <LiquidGlassCard blurAmount={0.2} saturation={150}>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold mb-2">高模糊</h3>
            <p className="text-sm text-muted-foreground">更强的毛玻璃效果</p>
          </div>
        </LiquidGlassCard>
      </div>

      <div className="text-center">
        <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          <Link to="/theme-demo" className="flex items-center gap-2">
            体验完整主题
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default LiquidGlassDemo;


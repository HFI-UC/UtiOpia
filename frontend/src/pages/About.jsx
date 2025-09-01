import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Users, Shield, MessageCircle } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 主标题 */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl">
            📝
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            UtiOpia 小纸条
          </h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          一个温暖的校园社区，让每个声音都能被听见
        </p>
      </div>

      {/* 关于平台 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            <span>关于 UtiOpia</span>
          </CardTitle>
          <CardDescription>
            UtiOpia 是一个专为校园社区设计的匿名表达平台
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            在这里，你可以自由地分享想法、表达情感、寻求帮助或提供建议。无论是学习上的困惑、生活中的感悟，
            还是内心深处的声音，UtiOpia 都为你提供一个安全、温暖的表达空间。
          </p>
          <p className="text-muted-foreground leading-relaxed">
            我们相信每个人都有被倾听的权利，每个想法都值得被尊重。在 UtiOpia，你可以选择匿名发声，
            也可以以真实身份参与讨论，一切都由你来决定。
          </p>
        </CardContent>
      </Card>

      {/* 平台特色 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span>隐私保护</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• 支持完全匿名发布</li>
              <li>• 严格的隐私保护机制</li>
              <li>• 安全的身份验证系统</li>
              <li>• 可控的信息展示范围</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <span>社区氛围</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• 友善包容的交流环境</li>
              <li>• 积极正面的内容导向</li>
              <li>• 专业的内容审核团队</li>
              <li>• 多元化的话题讨论</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 使用方式 */}
      <Card>
        <CardHeader>
          <CardTitle>如何使用</CardTitle>
          <CardDescription>
            简单几步，开始你的 UtiOpia 之旅
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                <span className="text-blue-600 font-semibold">1</span>
              </div>
              <h3 className="font-medium">写下想法</h3>
              <p className="text-sm text-muted-foreground">
                点击"写纸条"分享你的想法、感受或问题
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                <span className="text-purple-600 font-semibold">2</span>
              </div>
              <h3 className="font-medium">选择身份</h3>
              <p className="text-sm text-muted-foreground">
                可以匿名发布，也可以用真实身份参与
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 font-semibold">3</span>
              </div>
              <h3 className="font-medium">互动交流</h3>
              <p className="text-sm text-muted-foreground">
                通过点赞、评论与其他用户温暖互动
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 底部信息 */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">
                用心打造的校园社交平台
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge variant="secondary">开放</Badge>
              <Badge variant="secondary">包容</Badge>
              <Badge variant="secondary">温暖</Badge>
              <Badge variant="secondary">真实</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              让每一个声音都有意义，让每一份真诚都被珍视
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default About;
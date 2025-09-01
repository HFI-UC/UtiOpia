import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sun, 
  Moon, 
  Sparkles, 
  Palette,
  Monitor
} from 'lucide-react';

const ThemeToggle = () => {
  const { theme, isLiquidGlass, toggleTheme, toggleLiquidGlass, setSpecificTheme } = useTheme();

  const getThemeIcon = () => {
    if (isLiquidGlass) return <Sparkles className="h-4 w-4" />;
    return theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
  if (isLiquidGlass) return 'iOS 毛玻璃';
    return theme === 'light' ? '浅色' : '深色';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 min-w-9 rounded-full p-0
                     bg-white/60 dark:bg-slate-900/50
                     border border-white/30 dark:border-white/10
                     backdrop-blur-md shadow-sm
                     hover:bg-white/75 dark:hover:bg-slate-900/60"
        >
          {getThemeIcon()}
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl p-1
                   bg-white/70 dark:bg-slate-900/60
                   border border-white/30 dark:border-white/10
                   backdrop-blur-md shadow-lg"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">主题</span>
          <span className="text-xs text-muted-foreground">{getThemeLabel()}</span>
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => setSpecificTheme('light')}
          className="rounded-xl my-0.5 focus:bg-black/5 dark:focus:bg-white/5"
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>浅色</span>
          {theme === 'light' && !isLiquidGlass && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setSpecificTheme('dark')}
          className="rounded-xl my-0.5 focus:bg-black/5 dark:focus:bg-white/5"
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>深色</span>
          {theme === 'dark' && !isLiquidGlass && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={() => setSpecificTheme('system')}
          className="rounded-xl my-0.5 focus:bg-black/5 dark:focus:bg-white/5"
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>系统</span>
          {theme === 'system' && !isLiquidGlass && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={toggleLiquidGlass}
          className="rounded-xl my-0.5 focus:bg-black/5 dark:focus:bg-white/5"
        >
          <Sparkles className="mr-2 h-4 w-4" />
            <span>iOS 毛玻璃</span>
          {isLiquidGlass && (
            <span className="ml-auto text-xs">✓</span>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={toggleTheme}
          className="rounded-xl my-0.5 focus:bg-black/5 dark:focus:bg-white/5"
        >
          <Palette className="mr-2 h-4 w-4" />
          <span>切换主题</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;


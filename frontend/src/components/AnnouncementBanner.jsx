import { useEffect, useState } from 'react';
import { Megaphone, X, ExternalLink } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const typeColors = {
  info: 'from-sky-500/20 to-blue-500/10 border-sky-400/40 text-sky-800 dark:text-sky-100',
  success: 'from-emerald-500/20 to-green-500/10 border-emerald-400/40 text-emerald-800 dark:text-emerald-100',
  warning: 'from-amber-500/20 to-yellow-500/10 border-amber-400/40 text-amber-900 dark:text-amber-100',
  danger: 'from-rose-500/20 to-red-500/10 border-rose-400/40 text-rose-900 dark:text-rose-100',
};

export default function AnnouncementBanner({ className }) {
  const { isLiquidGlass } = useTheme();
  const [item, setItem] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/announcements/latest');
        const a = r?.data?.item;
        if (mounted && a) {
          const dismissed = localStorage.getItem(`announcement:dismissed:${a.id}`);
          if (!dismissed) setItem(a);
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  if (!item || hidden) return null;
  const color = typeColors[item.type] || typeColors.info;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-4 md:p-5 border shadow-sm',
        'bg-gradient-to-br',
        isLiquidGlass
          ? 'backdrop-blur-xl bg-white/40 dark:bg-black/30'
          : 'bg-white dark:bg-zinc-900/60',
        color,
        className,
      )}
      role="region"
      aria-label="平台公告"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 dark:bg-white/5 blur-2xl"></div>
      </div>
      <div className="flex items-start gap-3">
        <Megaphone className="w-5 h-5 mt-0.5" />
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.title}</div>
          <div className="text-sm mt-1 whitespace-pre-wrap break-words opacity-90">{item.content}</div>
          {item.link_url && (
            <a href={item.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs mt-2 underline opacity-80 hover:opacity-100">
              了解更多 <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
        </div>
        <button
          aria-label="关闭公告"
          className="ml-auto p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
          onClick={() => { try { localStorage.setItem(`announcement:dismissed:${item.id}`, '1'); } catch {} setHidden(true); }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AnnouncementDialog() {
	const { isLiquidGlass } = useTheme();
	const [item, setItem] = useState(null);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			try {
				const r = await api.get('/announcements/latest');
				const a = r?.data?.item;
				if (!mounted || !a) return;
				const dismissed = localStorage.getItem(`announcement:dismissed:${a.id}`);
				setItem(a);
				if (!dismissed) setOpen(true);
			} catch (err) {
				console.warn('[AnnouncementDialog] 获取最新公告失败', err);
			}
		})();
		return () => { mounted = false; };
	}, []);

	if (!item) return null;

		const typeTokens = {
			info: {
				icon: 'text-sky-600 dark:text-sky-300',
				border: 'border-sky-400/40',
				glow: 'shadow-[0_12px_40px_rgba(56,189,248,0.25)]',
				chip: 'bg-sky-500/15 text-sky-800 dark:text-sky-100 border-sky-500/30',
				label: '提示',
			},
			success: {
				icon: 'text-emerald-600 dark:text-emerald-300',
				border: 'border-emerald-400/40',
				glow: 'shadow-[0_12px_40px_rgba(16,185,129,0.25)]',
				chip: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-100 border-emerald-500/30',
				label: '成功',
			},
			warning: {
				icon: 'text-amber-600 dark:text-amber-300',
				border: 'border-amber-400/50',
				glow: 'shadow-[0_12px_40px_rgba(245,158,11,0.28)]',
				chip: 'bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/30',
				label: '警告',
			},
			danger: {
				icon: 'text-rose-600 dark:text-rose-300',
				border: 'border-rose-400/50',
				glow: 'shadow-[0_12px_40px_rgba(244,63,94,0.28)]',
				chip: 'bg-rose-500/15 text-rose-900 dark:text-rose-100 border-rose-500/30',
				label: '重要',
			},
		};
		const t = typeTokens[item.type] || typeTokens.info;

	const handleDismissForever = () => {
		try { localStorage.setItem(`announcement:dismissed:${item.id}`, '1'); } catch {}
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
							<DialogContent
								className={cn(
									// iOS 毛玻璃风：更浅的幕布、贝塞尔曲线动画、柔和阴影
									isLiquidGlass
										? cn('backdrop-blur-2xl bg-white/60 dark:bg-black/35 duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]', t.border, t.glow)
										: cn('bg-white dark:bg-zinc-900 duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)]', t.border),
									'sm:rounded-2xl'
								)}
							>
				<DialogHeader>
							  <div className="flex items-center justify-between gap-3 pr-10">
								<div className="flex items-center gap-2 min-w-0">
									<Megaphone className={cn('w-5 h-5 shrink-0', t.icon)} />
									<DialogTitle className="truncate">{item.title}</DialogTitle>
								</div>
								<Badge variant="outline" className={cn('shrink-0 border', t.chip)}>{t.label}</Badge>
					</div>
					<DialogDescription>
						<span className="sr-only">公告内容</span>
					</DialogDescription>
				</DialogHeader>

				<div className={cn('text-sm leading-relaxed whitespace-pre-wrap break-words', isLiquidGlass && 'text-foreground/90')}
						 style={{ WebkitFontSmoothing: 'antialiased' }}>
					{item.content}
				</div>

				{item.link_url && (
					<div className="pt-1">
						<Button asChild variant="link" className="px-0">
							<a href={item.link_url} target="_blank" rel="noreferrer" className="inline-flex items-center">
								了解更多 <ExternalLink className="w-4 h-4 ml-1" />
							</a>
						</Button>
					</div>
				)}

				<DialogFooter className="mt-2">
					<div className="flex w-full items-center justify-end gap-2">
						<Button variant="outline" onClick={() => setOpen(false)}>稍后再看</Button>
						<Button onClick={handleDismissForever}>我知道了</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}


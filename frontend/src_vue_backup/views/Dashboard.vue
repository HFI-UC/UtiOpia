<template>
  <div class="dashboard">
    <div class="hero">
      <div class="hero-content">
        <h2 class="hero-title">📊 系统运行看板</h2>
        <p class="hero-subtitle">实时了解系统健康状况与业务指标</p>
      </div>
    </div>

    <div class="container">
      <div class="grid">
        <div class="card stats">
          <h3 class="card-title">总览</h3>
          <div class="stats-grid">
            <div class="stat"><div class="stat-label">用户总数</div><div class="stat-value">{{ overview.totals.users }}</div></div>
            <div class="stat"><div class="stat-label">纸条总数</div><div class="stat-value">{{ overview.totals.messages }}</div></div>
            <div class="stat"><div class="stat-label">近24小时纸条</div><div class="stat-value">{{ overview.messages.last24h }}</div></div>
            <div class="stat"><div class="stat-label">近24小时日志</div><div class="stat-value">{{ overview.logs.last24h }}</div></div>
          </div>
          <div class="status-row">
            <span :class="['pill', overview.health.db ? 'ok' : 'bad']">DB {{ overview.health.db ? '正常' : '异常' }}</span>
            <span class="pill muted">PHP {{ overview.info.php_version }}</span>
            <span class="pill muted">DB {{ overview.info.db_driver }} {{ overview.info.db_version }}</span>
            <span class="pill" :class="overview.info.cos_configured ? 'ok' : 'bad'">COS {{ overview.info.cos_configured ? '已配置' : '未配置' }}</span>
            <span class="pill" :class="overview.info.turnstile_configured ? 'ok' : 'bad'">Turnstile {{ overview.info.turnstile_configured ? '已配置' : '未配置' }}</span>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">纸条状态分布</h3>
          <div class="badges">
            <span class="badge success">已通过 {{ overview.messages.approved }}</span>
            <span class="badge warn">待审核 {{ overview.messages.pending }}</span>
            <span class="badge danger">已拒绝 {{ overview.messages.rejected }}</span>
          </div>
          <div class="chart">
            <canvas ref="chartMessages"></canvas>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">近7天 · 纸条趋势</h3>
          <div class="chart">
            <canvas ref="chartSeries"></canvas>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">近7天 · 审计日志趋势</h3>
          <div class="chart">
            <canvas ref="chartAudit"></canvas>
          </div>
        </div>

        <div class="card sys">
          <h3 class="card-title">系统资源</h3>
          <div class="sys-grid">
            <div>
              <div class="sys-label">服务器时间</div>
              <div class="sys-value">{{ overview.info.server_time }}</div>
            </div>
            <div>
              <div class="sys-label">内存占用 / 峰值</div>
              <div class="sys-value">{{ bytes(overview.info.memory_usage) }} / {{ bytes(overview.info.memory_peak) }}</div>
            </div>
            <div>
              <div class="sys-label">磁盘 已用 / 总量</div>
              <div class="sys-value">{{ bytes(overview.info.disk_total - overview.info.disk_free) }} / {{ bytes(overview.info.disk_total) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'
const auth = useAuthStore()

const overview = ref<any>({ info:{}, totals:{ users:0, messages:0 }, messages:{ approved:0, pending:0, rejected:0, last24h:0 }, logs:{ last24h:0 }, health:{ db:false } })
const chartMessages = ref<HTMLCanvasElement|null>(null)
const chartSeries = ref<HTMLCanvasElement|null>(null)
const chartAudit = ref<HTMLCanvasElement|null>(null)

function bytes(n:number){
  if(!n && n!==0) return '-'
  const u=['B','KB','MB','GB','TB']; let i=0; let v=n;
  while(v>=1024 && i<u.length-1){ v/=1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`
}

async function load(){
  const headers = { Authorization: `Bearer ${auth.token}` }
  const [ov, series, audit] = await Promise.all([
    axios.get(`${API}/stats/overview`, { headers }),
    axios.get(`${API}/stats/messages?days=7`, { headers }),
    axios.get(`${API}/stats/audit?days=7`, { headers }),
  ])
  overview.value = ov.data
  renderCharts(series.data.items, audit.data.items)
}

function renderCharts(ms:any[], as:any[]){
  // lightweight inline chart without external deps
  drawLine(chartSeries.value!, ms.map(x=>x.total), ms.map(x=>x.date), '#6366F1')
  drawLine(chartAudit.value!, as.map(x=>x.total), as.map(x=>x.date), '#10B981')
  // donut-like bar for status
  drawBars(chartMessages.value!, [overview.value.messages.approved, overview.value.messages.pending, overview.value.messages.rejected], ['通过','待审','拒绝'], ['#10B981','#F59E0B','#EF4444'])
}

function drawLine(canvas: HTMLCanvasElement, data:number[], labels:string[], color:string){
  const ctx = canvas.getContext('2d')!
  const w = canvas.width = canvas.clientWidth || 600
  const h = canvas.height = 220
  ctx.clearRect(0,0,w,h)
  const max = Math.max(1, ...data)
  const left = 30, right = 10, top = 10, bottom = 20
  const plotW = w - left - right
  const plotH = h - top - bottom
  ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1
  for(let i=0;i<=4;i++){ const y = top + (plotH*i/4); ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(w-right,y); ctx.stroke() }
  ctx.strokeStyle = color; ctx.lineWidth = 2
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = left + (plotW * i / Math.max(1, data.length-1))
    const y = top + plotH - (v / max) * plotH
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y)
  })
  ctx.stroke()
}

function drawBars(canvas: HTMLCanvasElement, data:number[], labels:string[], colors:string[]){
  const ctx = canvas.getContext('2d')!
  const w = canvas.width = canvas.clientWidth || 600
  const h = canvas.height = 220
  ctx.clearRect(0,0,w,h)
  const gap = 20
  const bw = (w - gap*(data.length+1)) / data.length
  const max = Math.max(1, ...data)
  data.forEach((v, i) => {
    const x = gap + i*(bw+gap)
    const bh = (v/max) * (h-40)
    ctx.fillStyle = colors[i]
    ctx.fillRect(x, h-20-bh, bw, bh)
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(labels[i], x + bw/2, h-4)
  })
}

onMounted(load)
</script>

<style scoped>
.dashboard { min-height: 100vh; }
.hero { background: var(--gradient-primary); color:#fff; padding: 60px 0; margin: -20px -20px 40px -20px; }
.hero-content { max-width: 1100px; margin:0 auto; padding: 0 20px; }
.hero-title { font-size: var(--font-size-3xl); margin:0 0 8px 0; font-weight: 700; }
.hero-subtitle { opacity: .9; }
.container { max-width: 1200px; margin:0 auto; padding: 0 20px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:24px; }
.card { background: var(--card-bg); border:1px solid var(--border-light); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding:20px; }
.card-title { margin: 0 0 16px 0; font-size: var(--font-size-lg); font-weight: 600; }
.stats-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
.stat { background: var(--bg-solid); border:1px solid var(--border-light); border-radius: var(--radius-sm); padding:12px; }
.stat-label { color: var(--text-secondary); font-size: 12px; }
.stat-value { font-size: 20px; font-weight: 700; }
.status-row { display:flex; gap:8px; flex-wrap: wrap; margin-top: 12px; }
.pill { padding:6px 10px; border-radius: 999px; font-size: 12px; border:1px solid var(--border-light); background: var(--bg-solid); }
.pill.ok { background:#ecfdf5; color:#065f46; border-color:#a7f3d0; }
.pill.bad { background:#fef2f2; color:#991b1b; border-color:#fecaca; }
.pill.muted { background:#eef2ff; color:#3730a3; border-color:#c7d2fe; }
.chart { width: 100%; }
.chart canvas { width: 100%; height: 220px; display:block; }
.badges { display:flex; gap:8px; margin-bottom: 10px; }
.badge { padding:6px 10px; border-radius: 999px; font-size: 12px; background: var(--bg-solid); border:1px solid var(--border-light) }
.badge.success { background:#ecfdf5; border-color:#a7f3d0; color:#065f46 }
.badge.warn { background:#fffbeb; border-color:#fde68a; color:#92400e }
.badge.danger { background:#fef2f2; border-color:#fecaca; color:#991b1b }
.sys-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; }
.sys-label { color: var(--text-secondary); font-size: 12px; }
.sys-value { font-weight: 600; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .sys-grid { grid-template-columns: 1fr; }
}
</style>

 



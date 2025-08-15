import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Write from '../views/Write.vue'
import Login from '../views/Login.vue'
import Moderation from '../views/Moderation.vue'
import Admin from '../views/Admin.vue'
import Dashboard from '../views/Dashboard.vue'
import Register from '../views/Register.vue'
import Logs from '../views/Logs.vue'
import Bans from '../views/Bans.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/write', component: Write },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/moderation', component: Moderation, meta: { roles: ['moderator', 'super_admin'] } },
    { path: '/admin', component: Admin, meta: { roles: ['moderator', 'super_admin'] } },
    { path: '/dashboard', component: Dashboard, meta: { roles: ['moderator', 'super_admin'] } },
    { path: '/logs', component: Logs, meta: { roles: ['moderator', 'super_admin'] } },
    { path: '/bans', component: Bans, meta: { roles: ['moderator', 'super_admin'] } },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.user && auth.token) {
    try { await auth.fetchMe() } catch {}
  }
  const roles = (to.meta as any)?.roles as string[] | undefined
  if (!roles) return true
  const role = auth.user?.role || 'user'
  if (!roles.includes(role)) return '/'
  return true
})

export default router



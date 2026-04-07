import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'

const routes = [
	{
		path: '/',
		name: 'Dashboard',
		component: Dashboard
	},
	{
		path: '/remote',
		name: 'RemoteSheet',
		component: () => import('../views/RemoteSheet.vue')
	}
]

const router = createRouter({
	// Electron requires hash history, otherwise file:// routing breaks
	history: createWebHashHistory(),
	routes
})

export default router

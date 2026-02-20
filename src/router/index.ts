import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import ProjectsView from '@/views/ProjectsView.vue'
import SingleProjectView from '@/views/SingleProjectView.vue'
import ProjectBlockView from '@/views/ProjectBlockView.vue'
import RoomView from '@/views/RoomView.vue'
import ParkingView from '@/views/ParkingView.vue'
import AuthVue from '@/views/Auth.vue'
import SettingsView from '@/views/SettingsView.vue'
import SalesViewVue from '@/views/SalesView.vue'
import ReportsVue from '@/views/Reports.vue'
import NonSalesViewVue from '@/views/NonSalesView.vue'
import ServersView from '@/views/ServersView.vue'

const isAuthenticated = localStorage.getItem('ip_token') ? true : false;

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/auth',
      name: 'auth',
      component: AuthVue,
    },
    {
      path: '/',
      name: 'projects',
      component: ProjectsView,
    },
    {
      path: '/project/:id',
      name: 'single-project',
      component: SingleProjectView,
    },
    {
      path: '/project/:id/block/:block',
      name: 'project-block',
      component: ProjectBlockView,
    },
    {
      path: "/:pathMatch(.*)*",
      name: 'ErrorView',
      component: ProjectBlockView,
    },
    {
      path: "/project/:project/block/:block/room/:id",
      name: 'room',
      component: RoomView,
    },
    {
      path: "/project/:project/parking",
      name: 'parking',
      component: ParkingView,
    },
    {
      path: "/project/:project/parking/:id",
      name: 'parking-place',
      component: RoomView,
    },
    {
      path: "/settings",
      name: 'settings',
      component: SettingsView,
    },
    {
      path: "/settings/servers",
      name: 'settings-servers',
      component: ServersView,
    },
    {
      path: "/reports",
      name: 'reports',
      component: ReportsVue,
    },
    {
      path: "/reports/sales",
      name: 'sales',
      component: SalesViewVue,
    },
    {
      path: "/reports/non-sales",
      name: 'non-sales',
      component: NonSalesViewVue,
    },
    // {
    //   path: '/about',
    //   name: 'about',
    //   // route level code-splitting
    //   // this generates a separate chunk (About.[hash].js) for this route
    //   // which is lazy-loaded when the route is visited.
    //   component: () => import('../views/AboutView.vue'),
    // },
  ],
})

// router.beforeEach(async (to, from) => {
  // if (!isAuthenticated && to.name !== 'auth') {
  //   return { name: 'auth' }
  // } else if (isAuthenticated && to.name == 'auth') {
    // return { name: 'projects' }
  // }
// })

export default router

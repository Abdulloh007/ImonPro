import { createRouter, createWebHistory } from 'vue-router'
import ProjectsView from '../views/ProjectsView.vue'
import SingleProjectView from '../views/SingleProjectView.vue'
import ProjectBlockView from '../views/ProjectBlockView.vue'
import RoomView from '../views/RoomView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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

export default router

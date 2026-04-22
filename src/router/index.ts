import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    /** 默认进入图片转 Base64，减少页面层级跳转 */
    { path: '/', redirect: '/base64' },
    { path: '/base64', name: 'base64', component: () => import('@/views/Base64Tool.vue') },
    { path: '/json-parser', name: 'json-parser', component: () => import('@/views/JsonParser.vue') },
    { path: '/chat-preview', name: 'chat-preview', component: () => import('@/views/ChatPreview.vue') },
    { path: '/workflow-parser', name: 'workflow-parser', component: () => import('@/views/WorkflowPreview.vue') },
  ],
})

export default router

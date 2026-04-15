import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.use(Antd)
app.mount('#app')

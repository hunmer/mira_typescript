import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import * as Icons from '@ant-design/icons-vue'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// Register Ant Design Vue icons
const icons: any = Icons
for (const i in icons) {
    app.component(i, icons[i])
}

app.use(createPinia())
app.use(router)
app.use(Antd)

app.mount('#app')

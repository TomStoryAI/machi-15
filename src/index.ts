import { Hono } from 'hono'
import { postsRoutes } from './posts'

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/', postsRoutes)

export default app

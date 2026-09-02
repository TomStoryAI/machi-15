import { Hono } from 'hono'
import { postsRoutes } from './posts'
import { adminRoutes } from './admin'
import { feedRoutes } from './feed'

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/', postsRoutes)
app.route('/', adminRoutes)
app.route('/', feedRoutes)

// Submit page: one static file served under every board's URL; the page reads the boardId from its own path.
app.get('/b/:boardId/neu', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/submit.html', c.req.url)))
})

// Admin page, same pattern.
app.get('/admin/:boardId', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/admin.html', c.req.url)))
})

export default app

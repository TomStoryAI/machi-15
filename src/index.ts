import { Hono } from 'hono'
import { postsRoutes } from './posts'
import { adminRoutes } from './admin'
import { feedRoutes } from './feed'
import { commentsRoutes } from './comments'
import { posterRoutes } from './poster'

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/', postsRoutes)
app.route('/', adminRoutes)
app.route('/', feedRoutes)
app.route('/', commentsRoutes)
app.route('/', posterRoutes)

// Submit page: one static file served under every board's URL; the page reads the boardId from its own path.
app.get('/b/:boardId/neu', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/submit.html', c.req.url)))
})

// TV display page, same pattern.
app.get('/b/:boardId', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/display.html', c.req.url)))
})

// Comment form for one live frame (opened via the frame's QR).
app.get('/b/:boardId/p/:postId', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/comment.html', c.req.url)))
})

// Poster management page (link + QR from the submit confirmation).
app.get('/p/:postId', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/poster.html', c.req.url)))
})

// Admin page, same pattern.
app.get('/admin/:boardId', async (c) => {
  return c.env.ASSETS.fetch(new Request(new URL('/admin.html', c.req.url)))
})

export default app

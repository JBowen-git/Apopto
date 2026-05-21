import { StaticRouter } from 'react-router'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { ApoptoAuthProvider } from './auth.jsx'
import AppQueryProvider from './providers/AppQueryProvider'

export async function render(url) {
  const requestUrl = new URL(url)
  const appHtml = renderToString(
    <ApoptoAuthProvider>
      <AppQueryProvider>
        <StaticRouter location={`${requestUrl.pathname}${requestUrl.search}`}>
          <App />
        </StaticRouter>
      </AppQueryProvider>
    </ApoptoAuthProvider>,
  )

  return {
    appHtml,
    headHtml: '',
    statusCode: 200,
    type: 'rendered',
  }
}

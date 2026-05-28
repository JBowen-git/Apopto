import { StaticRouter } from 'react-router'
import { renderToString } from 'react-dom/server'
import ServerApp from './ServerApp.jsx'
import { hasAuth0Config } from './authConfig.js'
import { StaticApoptoAuthProvider } from './authContext.jsx'
import AppQueryProvider from './providers/AppQueryProvider'

export async function render(url) {
  const requestUrl = new URL(url)
  const appHtml = renderToString(
    <StaticApoptoAuthProvider isConfigured={hasAuth0Config} isLoading={hasAuth0Config}>
      <AppQueryProvider>
        <StaticRouter location={`${requestUrl.pathname}${requestUrl.search}`}>
          <ServerApp />
        </StaticRouter>
      </AppQueryProvider>
    </StaticApoptoAuthProvider>,
  )

  return {
    appHtml,
    headHtml: '',
    statusCode: 200,
    type: 'rendered',
  }
}

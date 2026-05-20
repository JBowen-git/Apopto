import { StaticRouter } from 'react-router'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { ApoptoAuthProvider } from './auth.jsx'

export async function render(url) {
  const requestUrl = new URL(url)
  const appHtml = renderToString(
    <ApoptoAuthProvider>
      <StaticRouter location={`${requestUrl.pathname}${requestUrl.search}`}>
        <App />
      </StaticRouter>
    </ApoptoAuthProvider>,
  )

  return {
    appHtml,
    headHtml: '',
    statusCode: 200,
    type: 'rendered',
  }
}

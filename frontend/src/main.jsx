import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { App as KApp } from 'konsta/react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      {/* Konsta App provider，设为 iOS 主题 */}
      <KApp theme="ios">
        <App />
      </KApp>
    </ThemeProvider>
  </StrictMode>,
)

import { Suspense } from 'react'
import { Shell } from './components/Shell.tsx'
import { StoreProvider } from './state/Store.tsx'

export default function App() {
  return (
    <Suspense fallback={<p className="boot">Conectando con la base de datos…</p>}>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </Suspense>
  )
}

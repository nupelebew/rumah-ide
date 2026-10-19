import { useEffect, useState } from 'react'
import { useRoute } from './lib/router'
import { BottomNav, TopBar } from './components/Layout'
import { Toaster } from './components/Toast'
import { QuickAdd } from './features/capture/QuickAdd'
import TodayScreen from './features/today/TodayScreen'
import CaptureScreen from './features/capture/CaptureScreen'
import TidyScreen from './features/capture/TidyScreen'
import RefLibrary from './features/atm/RefLibrary'
import RefDetail from './features/atm/RefDetail'
import MixList from './features/mix/MixList'
import MixBoard from './features/mix/MixBoard'
import MasterScreen from './features/mix/MasterScreen'
import ContentBoard from './features/content/ContentBoard'
import ContentDetail from './features/content/ContentDetail'
import RandomCombo from './features/content/RandomCombo'
import ShootList from './features/shoot/ShootList'
import ShootScreen from './features/shoot/ShootScreen'
import DailyScreen from './features/daily/DailyScreen'
import DecisionScreen from './features/daily/DecisionScreen'
import ReviewScreen from './features/review/ReviewScreen'
import SearchScreen from './features/search/SearchScreen'
import SettingsScreen from './features/settings/SettingsScreen'
import { ensureDefaults, seedSamples } from './db/seed'
import { applyThemeSetting } from './features/settings/theme'

function Screen({ route }: { route: string[] }) {
  const [a, b] = route
  switch (a) {
    case 'tangkap':
      return <CaptureScreen />
    case 'rapikan':
      return <TidyScreen />
    case 'ref':
      return b ? <RefDetail id={b} key={b} /> : <RefLibrary />
    case 'racik':
      return b ? <MixBoard id={b} key={b} /> : <MixList />
    case 'utama':
      return <MasterScreen id={b} key={b} />
    case 'konten':
      return b ? <ContentDetail id={b} key={b} /> : <ContentBoard />
    case 'acak':
      return <RandomCombo />
    case 'syuting':
      return b ? <ShootScreen id={b} key={b} /> : <ShootList />
    case 'harian':
      return <DailyScreen />
    case 'keputusan':
      return <DecisionScreen id={b} key={b} />
    case 'review':
      return <ReviewScreen />
    case 'cari':
      return <SearchScreen />
    case 'atur':
      return <SettingsScreen />
    default:
      return <TodayScreen />
  }
}

// Dijalankan sekali saja walau efek React terpanggil dua kali (StrictMode).
let booting: Promise<void> | null = null
const boot = () => (booting ??= ensureDefaults().then(seedSamples))

/** Teks yang dibagikan dari aplikasi lain (Web Share Target) masuk lewat ?text=&url= */
function readShared(): string {
  const p = new URLSearchParams(window.location.search)
  const parts = [p.get('title'), p.get('text'), p.get('url')].filter(Boolean)
  if (parts.length) history.replaceState(null, '', window.location.pathname + window.location.hash)
  return parts.join('\n')
}

export default function App() {
  const route = useRoute()
  const [ready, setReady] = useState(false)
  const [shared] = useState(readShared)
  const [quick, setQuick] = useState(!!shared)

  useEffect(() => {
    applyThemeSetting()
    boot().finally(() => setReady(true))
  }, [])

  return (
    <>
      <TopBar route={route[0] ?? 'hari-ini'} />
      {ready && <Screen route={route} />}
      <BottomNav route={route[0] ?? 'hari-ini'} onQuickAdd={() => setQuick(true)} />
      <QuickAdd open={quick} onClose={() => setQuick(false)} initial={shared} />
      <Toaster />
    </>
  )
}

import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function SettingsScreen() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="SettingsScreen" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

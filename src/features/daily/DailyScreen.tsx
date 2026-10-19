import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function DailyScreen() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="DailyScreen" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

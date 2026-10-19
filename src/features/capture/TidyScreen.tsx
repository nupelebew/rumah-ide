import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function TidyScreen() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="TidyScreen" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function MasterScreen() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="MasterScreen" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

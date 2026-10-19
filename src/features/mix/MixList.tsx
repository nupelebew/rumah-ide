import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function MixList() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="MixList" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

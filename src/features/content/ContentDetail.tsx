import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function ContentDetail() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="ContentDetail" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

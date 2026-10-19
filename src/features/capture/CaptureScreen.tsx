import { Page } from '../../components/Layout'
import { PageHeader, Empty } from '../../components/ui'

export default function CaptureScreen() {
  return (
    <Page>
      <PageHeader kicker="Segera" title="CaptureScreen" />
      <div className="px-4"><Empty title="Sedang dibangun" text="Layar ini menyusul." /></div>
    </Page>
  )
}

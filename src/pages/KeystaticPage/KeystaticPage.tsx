import { Keystatic } from '@keystatic/core/ui'
import type { Config } from '@keystatic/core'
import keystaticConfig from '../../../keystatic.config'

export default function KeystaticPage() {
  return <Keystatic config={keystaticConfig as Config} />
}

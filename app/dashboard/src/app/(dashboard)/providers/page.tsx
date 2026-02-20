import { PageFrame } from '../../../components/page-frame'
import { providerStatuses } from '../../../lib/mock-data'

export default function ProvidersPage(): JSX.Element {
  const enabledCount = providerStatuses.filter((provider) => provider.enabled).length

  return (
    <PageFrame
      title="OAuth Providers"
      subtitle="Provider rollout with failure context and readiness notes."
      rightLabel={`${enabledCount}/${providerStatuses.length} enabled`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Enabled</th>
                <th>Risk Notes</th>
              </tr>
            </thead>
            <tbody>
              {providerStatuses.map((provider) => (
                <tr key={provider.provider}>
                  <td>{provider.provider}</td>
                  <td>
                    <span className={`badge ${provider.enabled ? 'ok' : 'warn'}`}>
                      {provider.enabled ? 'enabled' : 'off'}
                    </span>
                  </td>
                  <td>{provider.riskNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

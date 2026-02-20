import { PageFrame } from '../../../components/page-frame'
import { ssoProfiles } from '../../../lib/mock-data'

export default function SsoPage(): JSX.Element {
  return (
    <PageFrame
      title="Enterprise SAML SSO"
      subtitle="Identity provider federation profiles and rollout state."
      rightLabel={`${ssoProfiles.length} tenants`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Profile ID</th>
                <th>Protocol</th>
                <th>Domain</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ssoProfiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.tenant}</td>
                  <td className="mono">{profile.id}</td>
                  <td>{profile.protocol}</td>
                  <td>{profile.domain}</td>
                  <td>
                    <span className={`badge ${profile.status === 'active' ? 'ok' : 'warn'}`}>
                      {profile.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

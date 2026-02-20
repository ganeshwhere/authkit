import { PageFrame } from '../../../components/page-frame'
import { sessions } from '../../../lib/mock-data'

export default function SessionsPage(): JSX.Element {
  return (
    <PageFrame
      title="Session Control"
      subtitle="Realtime session inventory with risk context."
      rightLabel={`${sessions.length} active`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Session</th>
                <th>User</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Risk</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="mono">{session.id}</td>
                  <td className="mono">{session.user}</td>
                  <td className="mono">{session.ip}</td>
                  <td>{session.device}</td>
                  <td>
                    <span className={`badge ${session.risk === 'low' ? 'ok' : 'warn'}`}>{session.risk}</span>
                  </td>
                  <td className="mono">{session.expiresAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

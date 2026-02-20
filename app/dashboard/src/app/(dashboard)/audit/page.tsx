import { PageFrame } from '../../../components/page-frame'
import { auditEvents } from '../../../lib/mock-data'

export default function AuditPage(): JSX.Element {
  return (
    <PageFrame
      title="Audit Timeline"
      subtitle="Security-sensitive events with source context."
      rightLabel="retention: 180d"
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Source</th>
                <th>Occurred At</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((event) => (
                <tr key={event.id}>
                  <td className="mono">{event.id}</td>
                  <td>{event.event}</td>
                  <td className="mono">{event.actor}</td>
                  <td>{event.source}</td>
                  <td className="mono">{event.at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

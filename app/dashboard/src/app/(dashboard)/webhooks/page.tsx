import { PageFrame } from '../../../components/page-frame'
import { webhooks } from '../../../lib/mock-data'

export default function WebhooksPage(): JSX.Element {
  return (
    <PageFrame
      title="Webhook Delivery"
      subtitle="Endpoint reliability and retry health."
      rightLabel={`${webhooks.length} endpoints`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>ID</th>
                <th>Subscribed Events</th>
                <th>Success Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td>{webhook.endpoint}</td>
                  <td className="mono">{webhook.id}</td>
                  <td>{webhook.eventCount}</td>
                  <td>{webhook.successRate}</td>
                  <td>
                    <span className={`badge ${webhook.status === 'active' ? 'ok' : 'warn'}`}>
                      {webhook.status}
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

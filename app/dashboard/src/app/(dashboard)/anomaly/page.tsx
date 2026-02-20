import { PageFrame } from '../../../components/page-frame'
import { anomalySignals } from '../../../lib/mock-data'

export default function AnomalyPage(): JSX.Element {
  return (
    <PageFrame
      title="Anomaly Detection"
      subtitle="Behavioral detections for token abuse and suspicious sign-ins."
      rightLabel={`${anomalySignals.length} queued`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Signal ID</th>
                <th>Type</th>
                <th>User</th>
                <th>Severity</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {anomalySignals.map((signal) => (
                <tr key={signal.id}>
                  <td className="mono">{signal.id}</td>
                  <td className="mono">{signal.type}</td>
                  <td>{signal.user}</td>
                  <td>
                    <span className={`badge ${signal.severity === 'high' ? 'warn' : 'ok'}`}>
                      {signal.severity}
                    </span>
                  </td>
                  <td className="mono">{signal.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

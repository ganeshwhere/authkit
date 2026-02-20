import { PageFrame } from '../../components/page-frame'
import {
  anomalySignals,
  dashboardMetrics,
  projects,
} from '../../lib/mock-data'

export default function OverviewPage(): JSX.Element {
  return (
    <PageFrame
      title="Security Overview"
      subtitle="Operational auth telemetry and threat posture."
      rightLabel="live: 15s"
    >
      <section className="grid metrics">
        {dashboardMetrics.map((metric) => (
          <article className="card" key={metric.label}>
            <h2>{metric.label}</h2>
            <div className="metric-value">{metric.value}</div>
            <p>{metric.delta} from last week</p>
          </article>
        ))}
      </section>

      <section className="split" style={{ marginTop: '0.9rem' }}>
        <article className="card">
          <h3>Project Health Radar</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Region</th>
                  <th>Signups</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.name}</td>
                    <td>{project.region}</td>
                    <td>{project.signups}</td>
                    <td>
                      <span className={`badge ${project.status === 'healthy' ? 'ok' : 'warn'}`}>
                        {project.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Active Anomaly Queue</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>User</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {anomalySignals.map((signal) => (
                  <tr key={signal.id}>
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
      </section>
    </PageFrame>
  )
}

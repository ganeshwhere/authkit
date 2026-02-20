import { PageFrame } from '../../../components/page-frame'
import { projects } from '../../../lib/mock-data'

export default function ProjectsPage(): JSX.Element {
  return (
    <PageFrame
      title="Project Portfolio"
      subtitle="Per-project traffic, user growth, and deploy readiness."
      rightLabel={`${projects.length} active`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Project ID</th>
                <th>Region</th>
                <th>Users</th>
                <th>Daily Signups</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td className="mono">{project.id}</td>
                  <td>{project.region}</td>
                  <td>{project.users.toLocaleString()}</td>
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
    </PageFrame>
  )
}

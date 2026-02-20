import { PageFrame } from '../../../components/page-frame'
import { teams } from '../../../lib/mock-data'

export default function OrgsPage(): JSX.Element {
  return (
    <PageFrame
      title="Organizations and Team RBAC"
      subtitle="Permission boundaries for platform and support teams."
      rightLabel={`${teams.length} teams`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Members</th>
                <th>Primary Permission</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.name}>
                  <td>{team.name}</td>
                  <td>{team.members}</td>
                  <td className="mono">{team.permission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

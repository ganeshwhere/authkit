import { PageFrame } from '../../../components/page-frame'
import { users } from '../../../lib/mock-data'

export default function UsersPage(): JSX.Element {
  return (
    <PageFrame
      title="User Access"
      subtitle="Identity posture with MFA coverage and role distribution."
      rightLabel={`${users.length} sampled`}
    >
      <article className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>MFA</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="mono">{user.id}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`badge ${user.mfa ? 'ok' : 'warn'}`}>{user.mfa ? 'enabled' : 'off'}</span>
                  </td>
                  <td className="mono">{user.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </PageFrame>
  )
}

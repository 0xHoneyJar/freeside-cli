import { Cli } from 'incur'
import { VERSION, DESCRIPTION } from './version.ts'
import { zones } from './commands/zones.ts'
import { worlds } from './commands/worlds.ts'
import { doctor } from './commands/doctor.ts'
import { status } from './commands/status.ts'
import { credential } from './commands/credential.ts'
import { identity } from './commands/identity.ts'
import { session } from './commands/session.ts'

export const cli = Cli.create('freeside', {
  version: VERSION,
  description: DESCRIPTION,
  sync: {
    suggestions: [
      'show all zones freeside offers',
      'probe ecosystem health',
      'list worlds and what zones they claim',
    ],
  },
})

cli.command(zones)
cli.command(worlds)
cli.command(doctor)
cli.command(status)
// Three-layer identity spine verbs (FR-CLI-2/3/4) — per identity-spine doctrine
cli.command(credential)
cli.command(identity)
cli.command(session)

export default cli

import { Cli } from 'incur'
import { VERSION } from './version.ts'
import { zones } from './commands/zones.ts'
import { worlds } from './commands/worlds.ts'
import { doctor } from './commands/doctor.ts'
import { status } from './commands/status.ts'

export const cli = Cli.create('freeside', {
  version: VERSION,
  description:
    'Sovereign CLI for Freeside. Navigate zones, worlds, deployments deterministically. CLI is sovereign · construct is lens · they compose.',
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

export default cli

// The tilt guard audits compiled WXSS, so the build must exist and be current
// no matter how the suite was launched: `npm test`, `npx jest`, IDE runners.
const { execSync } = require('child_process')

module.exports = () => {
  execSync('npm run build:weapp', { stdio: 'ignore' })
}

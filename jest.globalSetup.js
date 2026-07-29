// The tilt guard audits compiled WXSS, so the build must exist and be current
// no matter how the suite was launched. pretest only covers `npm test`;
// this covers `npx jest`, IDE runners and everything else.
const { execSync } = require('child_process')

module.exports = () => {
  execSync('npm run build:weapp', { stdio: 'ignore' })
}

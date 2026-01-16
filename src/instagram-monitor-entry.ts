import { runInstagramMonitor } from './instagram-monitor.js'

runInstagramMonitor()
  .then(() => {
    console.log('Instagram monitor completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Instagram monitor failed:', error)
    process.exit(1)
  })

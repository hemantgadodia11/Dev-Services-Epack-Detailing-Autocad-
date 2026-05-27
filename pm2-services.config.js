module.exports = {
  apps: [
    {
      name: 'epack-backend',
      script: 'backend-wrapper.js',
      cwd: 'C:\\dev-services',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
{
  name: 'epack-frontend',
  script: 'frontend-wrapper.js',  
  cwd: 'C:\\dev-services',
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '1G'
}
  ]
}
module.exports = {
  apps: [
    {
      name: 'scaterx-api',
      script: 'apps/api/src/server.js',
      instances: 2,
      exec_mode: 'cluster'
    }
  ]
};

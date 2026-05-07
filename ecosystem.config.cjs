module.exports = {
  apps: [
    {
      name: 'scaterx-api',
      script: 'apps/api/src/server.js',
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};

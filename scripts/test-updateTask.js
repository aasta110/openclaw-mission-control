(async () => {
  const { updateTask } = require('../lib/local-storage');
  try {
    const id = process.argv[2];
    const t = await updateTask(id, { title: 'ping-test' });
    console.log('updated?', !!t);
  } catch (e) {
    console.error('updateTask threw:', e);
    process.exitCode = 1;
  }
})();

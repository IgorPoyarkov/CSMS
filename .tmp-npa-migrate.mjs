const pg = require('pg');
(async () => {
  const c = new pg.Client({ host: 'localhost', port: 5433, user: 'postgres', database: 'csms_eis' });
  await c.connect();
  const h = await c.query("select schemaname, tablename from pg_tables where tablename like '%Migrations%' or tablename = 'npa_rules' order by 1, 2");
  console.log('tables:');
  for (const r of h.rows) console.log('  ' + r.schemaname + '.' + r.tablename);
  const cols = await c.query("select column_name from information_schema.columns where table_schema = 'ref' and table_name = 'npa_rules' order by ordinal_position");
  console.log('npa_rules cols:', cols.rows.map(x => x.column_name).join(', '));
  await c.end();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });

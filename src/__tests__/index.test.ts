import * as fs from 'fs';
import * as tmp from 'tmp';
import webpack from 'webpack';
import Plugin from '..';

const processDir = process.cwd();

describe('Webpack GraphQL CodeGen Plugin', () => {
  let tmpDir: tmp.SynchrounousResult;

  beforeAll(() => {
    tmp.setGracefulCleanup();
  });

  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    process.chdir(tmpDir.name);
  });

  afterEach(() => {
    process.chdir(processDir);
    if (tmpDir) {
      tmpDir.removeCallback();
      tmpDir = null;
    }
  });

  it('Generates type from basic schema', async () => {
    const SCHEMA_FILENAME = 'schema.graphql';
    const QUERY_FILENAME = 'query.graphql';
    fs.writeFileSync(SCHEMA_FILENAME, 'type Query { dummy: Int }');
    fs.writeFileSync(QUERY_FILENAME, '{ dummy }');
    fs.writeFileSync('entry.js', `import './schema.graphql';\nimport './query.graphql';`);
    const plugin = new Plugin();
    const compiler = webpack({
      plugins: [plugin],
      module: {
        rules: [
          {
            test: /\.graphql$/,
            use: require.resolve('graphql-tag/loader')
          }
        ]
      },
      mode: 'development',
      entry: './entry.js',
      output: {
        filename: 'bundle.js',
        path: tmpDir.name
      }
    });
    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err || stats.hasErrors()) {
          reject(err || stats.toString());
        } else {
          resolve();
        }
      });
    });
  });
});

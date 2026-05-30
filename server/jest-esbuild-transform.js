const esbuild = require('esbuild');

const transformer = async (src, filename) => {
  const result = await esbuild.transform(src, {
    loader: filename.endsWith('.ts') ? 'ts' : 'jsx',
    format: 'esm',
    target: 'es2020',
    jsx: 'automatic',
  });
  return {
    code: result.code,
    map: result.map ? JSON.parse(result.map) : null,
  };
};

transformer.process = (src, filename) => transformer(src, filename);

module.exports = {
  process: async (src, filename) => {
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) {
      return transformer(src, filename);
    }
    return src;
  },
};
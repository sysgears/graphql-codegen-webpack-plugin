import { compilation, Compiler } from 'webpack';

interface PluginOptions {
  outputPath?: string;
  excludeRegex?: RegExp;
  graphqlRegex?: RegExp;
}

export default class GraphQLCodeGenPlugin {
  public options: PluginOptions;

  constructor(options?: PluginOptions) {
    this.options = options || {};
    this.options.excludeRegex = this.options.excludeRegex || /[\\/]node_modules[\\/]/;
    this.options.graphqlRegex = this.options.graphqlRegex || /(.graphql|.gql)$/;
  }

  public apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('graphqlCodeGen', (comp: compilation.Compilation) => {
      comp.chunks.forEach((chunk: compilation.Chunk) => {
        chunk.modulesIterable.forEach((module: any) => {
          if (!this.options.excludeRegex.test(module.resource) && this.options.graphqlRegex.test(module.resource)) {
          }
        });
      });
    });
  }
}

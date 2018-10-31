import { compilation, Compiler } from 'webpack';
import { schemaToTemplateContext, makeExecutableSchema } from 'graphql-codegen-core';

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
      comp.hooks.finishModules.tap('graphqlCodeGen', (modules: compilation.Module[]) => {
        const typeDefs = [];
        modules.forEach((module: any) => {
          if (!this.options.excludeRegex.test(module.resource) && this.options.graphqlRegex.test(module.resource)) {
            if (module.type !== 'javascript/auto' || !module.originalSource) {
              throw new Error('Unable to handle the module' + module);
            }
            typeDefs.push(eval(module.originalSource().source()));
          }
        });
        const schema = makeExecutableSchema({ typeDefs, resolvers: {}, allowUndefinedInResolve: true })
        console.log(schemaToTemplateContext(schema));
      });
    });
  }
}

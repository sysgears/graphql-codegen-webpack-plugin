import { compilation, Compiler } from 'webpack';
import { schemaToTemplateContext, makeExecutableSchema, transformDocumentsFiles, DocumentFile } from 'graphql-codegen-core';
import { separateOperations } from 'graphql';

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
        const documents: DocumentFile[] = [];
        modules.forEach((module: any) => {
          if (!module.error && !this.options.excludeRegex.test(module.resource) && this.options.graphqlRegex.test(module.resource)) {
            if (module.type !== 'javascript/auto' || !module.originalSource) {
              throw new Error('Unable to handle the module' + module);
            }
            const ast: DocumentFile = eval(module.originalSource().source());
            if (Object.keys(separateOperations(ast)).length !== 0) {
              // if operations defined treat file as a document
              documents.push({ filePath: module.resource, content: ast });
            } else {
              // if operations are not defined treat file as a schema part
              typeDefs.push(ast);
            }
          }
        });
        const schema = makeExecutableSchema({ typeDefs, resolvers: {}, allowUndefinedInResolve: true })
        const schemaContext = schemaToTemplateContext(schema);
        const transformedDocs = transformDocumentsFiles(schema, documents);
        console.log(transformedDocs);
      });
    });
  }
}

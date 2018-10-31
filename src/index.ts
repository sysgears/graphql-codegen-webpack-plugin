import { compilation, Compiler } from 'webpack';
import { schemaToTemplateContext, makeExecutableSchema, transformDocumentsFiles, DocumentFile, FileOutput } from 'graphql-codegen-core';
import { compileTemplate } from 'graphql-codegen-compiler';
import { separateOperations } from 'graphql';
import * as fs from 'fs';

interface PluginOptions {
  outputPath?: string;
  template?: string
  excludeRegex?: RegExp;
  graphqlRegex?: RegExp;
}

export default class GraphQLCodeGenPlugin {
  public options: PluginOptions;

  constructor(options?: PluginOptions) {
    this.options = options || {};
    this.options.template = this.options.template || 'graphql-codegen-typescript-template';
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
        const templateFromExport = require(this.options.template);
        const templateConfig = templateFromExport.default || templateFromExport.config || templateFromExport;

        const schema = makeExecutableSchema({ typeDefs, resolvers: {}, allowUndefinedInResolve: true })
        const templateContext = schemaToTemplateContext(schema);
        const transformedDocs = transformDocumentsFiles(schema, documents);
        compileTemplate(templateConfig, templateContext, [transformedDocs], {
          generateDocuments: true,
          generateSchema: true
        }).then((results: FileOutput[]) => {
          results.forEach((file: FileOutput) => {
            const content = fs.existsSync(file.filename) ? fs.readFileSync(file.filename).toString() : undefined;
            if (content !== file.content) {
              // TODO: add prettifier
              fs.writeFileSync(file.filename, file.content);
            }
          });
        });
      });
    });
  }
}

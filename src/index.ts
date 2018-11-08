import * as fs from 'fs';
import { separateOperations } from 'graphql';
import { compileTemplate } from 'graphql-codegen-compiler';
import {
  DocumentFile,
  FileOutput,
  makeExecutableSchema,
  parse,
  schemaToTemplateContext,
  Source,
  transformDocumentsFiles
} from 'graphql-codegen-core';
import mkdirp from 'mkdirp';
import * as path from 'path';
import { compilation, Compiler } from 'webpack';

interface PluginOptions {
  out?: string;
  template?: string;
  excludeRegex?: RegExp;
  graphqlRegex?: RegExp;
}

export default class GraphQLCodeGenPlugin {
  public options: PluginOptions;

  constructor(options?: PluginOptions) {
    this.options = options || {};
    this.options.out = this.options.out || '';
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
          if (
            !module.error &&
            !this.options.excludeRegex.test(module.resource) &&
            this.options.graphqlRegex.test(module.resource)
          ) {
            if (module.type !== 'javascript/auto' || !module.originalSource) {
              throw new Error('Unable to handle the module' + module);
            }
            try {
              const ast = parse(new Source(fs.readFileSync(module.resource).toString(), module.resource));
              if (Object.keys(separateOperations(ast)).length !== 0) {
                // if operations defined treat file as a document
                documents.push({ filePath: module.resource, content: ast });
              } else {
                // if operations are not defined treat file as a schema part
                typeDefs.push(ast);
              }
            } catch (e) {
              console.error(module.originalSource().source());
              throw e;
            }
          }
        });
        const templateFromExport = require(this.options.template);
        const templateConfig = templateFromExport.default || templateFromExport.config || templateFromExport;

        const schema = makeExecutableSchema({ typeDefs, resolvers: {}, allowUndefinedInResolve: true });
        const templateContext = schemaToTemplateContext(schema);
        const transformedDocs = transformDocumentsFiles(schema, documents);
        compileTemplate(templateConfig, templateContext, [transformedDocs], {
          generateDocuments: true,
          generateSchema: true
        }).then((results: FileOutput[]) => {
          results.forEach((file: FileOutput) => {
            const fullOutputPath = path.join(this.options.out, file.filename);
            mkdirp.sync(path.dirname(fullOutputPath));
            const content = fs.existsSync(fullOutputPath) ? fs.readFileSync(fullOutputPath).toString() : undefined;
            if (content !== file.content) {
              // TODO: add prettifier
              fs.writeFileSync(fullOutputPath, file.content);
            }
          });
        });
      });
    });
  }
}

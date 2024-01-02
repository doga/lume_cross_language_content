// Replaces cross-language constants in the build directory after the build.
// This is a handler for Lume's "afterBuild" events (https://lume.land/docs/core/events/#afterbuild).

import { path, YAML } from "./deps.ts";

const placeholderSyntax = /§§\{([^}]+)\}/;

function isObject(o: unknown):boolean {return typeof o === 'object' && !(o instanceof Array);}
function isLiteral(o: unknown):boolean {return typeof o === 'string' || typeof o === 'number';}

type Literal = string | number;

class Constants {
  values: Record<string, unknown>;
  constructor(filePath: string) {
    this.values = YAML.parse(Deno.readTextFileSync(filePath)) as Record<string, unknown>;
    if(!isObject(this.values))throw new Error("constants container is not an object");
  }

  getValue(path:string): Literal{
    path = path.trim();
    const constantPath = path.split('.'); 
    return this._getValue(this.values, constantPath);
  }

  _getValue(value:Record<string, unknown>,path:string[]): Literal {
    if(path.length == 0) throw new Error("constant not found");

    const name = `${path.shift()}`;
    if (!Object.prototype.hasOwnProperty.call(value, name)) throw new Error(`constant path segment ${name} not found`);

    const e = value[name];
    if (path.length === 0) {
      // e must be a literal
      if(!isLiteral(e)) throw new Error("constant is not a literal");
      return e as Literal;
    }
    // a must be an object
    if(!isObject(e)) throw new Error("constant's path contains a non-object");
    return this._getValue(e as Record<string, unknown>, path);
  }
}

function createAfterBuildListener(srcDir: string, buildDir: string ) {
  // find out the urls of the source and destination directories
  let 
  srcPathAbs  : string = path.resolve(Deno.cwd(), srcDir),
  buildPathAbs: string = path.resolve(Deno.cwd(), buildDir);

  if(!srcPathAbs.endsWith(path.SEP)) srcPathAbs += path.SEP;
  if(!buildPathAbs.endsWith(path.SEP)) buildPathAbs += path.SEP;

  const
  srcPathUrl  : URL = path.toFileUrl(srcPathAbs),
  buildPathUrl: URL = path.toFileUrl(buildPathAbs);

  // return the handler for Lume's "afterBuild" event
  return (event: Lume.SiteEvent) => {
    if(!event.pages)return;
    // console.info(`buildPathUrl: ${buildPathUrl}`);

    // read the cross-language constants
    const
    constantsFileUrlStr = `${srcPathUrl}_data/cross-language-content.yaml`,
    constantsFilePathAbs = path.fromFileUrl(constantsFileUrlStr);
    try {
      const constants = new Constants(constantsFilePathAbs);

      // update the built pages (replace constants placeholders with their values)
      for (const page of event.pages) {
        // find out built page's absolute path
        let urlPathWithoutStartingSlash = `${(page.data.url || '/').substring(1)}`;
        if(urlPathWithoutStartingSlash.endsWith('/')) urlPathWithoutStartingSlash += 'index.html';  
        const
        builtPageFileUrl = new URL(urlPathWithoutStartingSlash, buildPathUrl),
        builtPageFilePath = path.fromFileUrl(builtPageFileUrl);
        // console.info(`cross-language-constants: page: ${builtPageFileUrl}`);
        // console.info(`                                ${builtPageFilePath}`);

        // update the built page
        try {
          // read the built page
          let
          inText = Deno.readTextFileSync(builtPageFilePath),
          // if(inText.indexOf(prefix) !== -1) // console.info(`found ${prefix} in ${builtPageFilePath}`);
          outText = '', match;

          // replace the placeholders with their values
          while ((match = placeholderSyntax.exec(inText)) !== null) {
            // console.log(
            //   `Found ${match[1]} start=${match.index} end=${placeholderSyntax.lastIndex}.`,
            // );
            outText += inText.substring(0, match.index);
            outText += constants.getValue(match[1]);
            inText = inText.substring(match.index+match[0].length);
          }
          outText += inText.substring(placeholderSyntax.lastIndex);

          // write the built page
          Deno.writeTextFileSync(builtPageFilePath, outText);

        } catch (_error) {
          console.error(`cross-language-constants: skipping unreadable page: ${builtPageFilePath}`);
        }


      }
    } catch (error) {
      console.error(error); 
      console.error(`cross-language-constants: aborting, unreadable constants file: ${constantsFilePathAbs}`); return;
    }



  };
}

export {createAfterBuildListener};

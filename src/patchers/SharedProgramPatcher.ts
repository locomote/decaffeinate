import determineIndent from '../utils/determineIndent';
import NodePatcher from './NodePatcher';
import { PatcherContext } from './types';

export interface HelperInfo {
  code: string;
  insertUnlessContentMatches: (() => RegExp) | undefined;
}

export default class ProgramPatcher extends NodePatcher {
  body: NodePatcher | null;
  helpers: Map<string, HelperInfo> = new Map();
  _indentString: string | null = null;

  constructor(patcherContext: PatcherContext, body: NodePatcher | null) {
    super(patcherContext);
    this.body = body;
  }

  shouldTrimContentRange(): boolean {
    return true;
  }

  /**
   * Register a helper to be reused in several places.
   *
   * FIXME: Pick a different name than what is in scope.
   */
  registerHelper(name: string, code: string, insertUnlessContentMatches?: () => RegExp): string {
    code = code.trim();
    if (this.helpers.has(name)) {
      if (this.helpers.get(name)!.code !== code) {
        throw new Error(`BUG: cannot override helper '${name}'`);
      }
    } else {
      this.helpers.set(name, { code, insertUnlessContentMatches });
    }
    return name;
  }

  patchHelpers(): void {
    for (let helper of this.helpers.values()) {
      const discardRegexp = helper.insertUnlessContentMatches && helper.insertUnlessContentMatches();
      if (!discardRegexp || !this.editor.toString().match(discardRegexp)) {
        this.editor.prepend(`\n${helper.code}\n\n`);
      }
    }
  }

  /**
   * Gets the indent string used for each indent in this program.
   */
  getProgramIndentString(): string {
    if (!this._indentString) {
      this._indentString = determineIndent(this.context.source);
    }
    return this._indentString;
  }
}

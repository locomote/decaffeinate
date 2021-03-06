/**
 * Handles soaked array or string slicing, e.g. `names?[i..]`.
 */
import { REMOVE_GUARD } from '../../../suggestions';
import findSoakContainer from '../../../utils/findSoakContainer';
import SlicePatcher from './SlicePatcher';
import SoakedMemberAccessOpPatcher from './SoakedMemberAccessOpPatcher';

const GUARD_HELPER =
  `function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}`;

export default class SoakedSlicePatcher extends SlicePatcher {
  patchAsExpression(): void {
    if (this.shouldPatchAsOptionalChainingViaLodashGet()) {
      SoakedMemberAccessOpPatcher.prototype.patchAsOptionalChainingViaLodashGet.apply(this);
      return;
    } else if (this.shouldPatchAsOptionalChaining()) {
      super.patchAsExpression();
      return;
    }

    this.registerHelper('__guard__', GUARD_HELPER);
    this.addSuggestion(REMOVE_GUARD);

    let soakContainer = findSoakContainer(this);
    let varName = soakContainer.claimFreeBinding('x');
    let prefix = this.slice(soakContainer.contentStart, this.contentStart);

    if (prefix.length > 0) {
      this.remove(soakContainer.contentStart, this.contentStart);
    }

    this.insert(this.expression.outerEnd, `, ${varName} => ${prefix}${varName}`);

    soakContainer.insert(soakContainer.contentStart, '__guard__(');

    super.patchAsExpression();
    soakContainer.appendDeferredSuffix(')');
  }

  /**
   * For a soaked splice operation, we are the soak container.
   */
  getSpliceCode(expressionCode: string): string {
    if (this.shouldPatchAsOptionalChaining()) {
      return super.getSpliceCode(expressionCode);
    }
    let spliceStart = this.captureCodeForPatchOperation(() => {
      this.registerHelper('__guard__', GUARD_HELPER);
      this.addSuggestion(REMOVE_GUARD);
      let varName = this.claimFreeBinding('x');
      this.insert(this.expression.outerEnd, `, ${varName} => ${varName}`);
      this.patchAsSpliceExpressionStart();
    });
    return `__guard__(${spliceStart}, ...[].concat(${expressionCode})))`;
  }

  shouldPatchAsOptionalChaining(): boolean {
    return this.options.useOptionalChaining || false;
  }

  shouldPatchAsOptionalChainingViaLodashGet(): boolean {
    return this.options.useOptionalChainingViaLodashGet || false;
  }
}

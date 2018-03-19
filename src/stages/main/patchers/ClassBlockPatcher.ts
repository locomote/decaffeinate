import { Node } from 'decaffeinate-parser/dist/nodes';
import { PatchOptions } from '../../../patchers/types';
import { REMOVE_BABEL_WORKAROUND } from '../../../suggestions';
import adjustIndent from '../../../utils/adjustIndent';
import babelConstructorWorkaroundLines from '../../../utils/babelConstructorWorkaroundLines';
import getBindingCodeForMethod from '../../../utils/getBindingCodeForMethod';
import { getNameForMethod } from '../../../utils/getBindingCodeForMethod';
import getInvalidConstructorErrorMessage from '../../../utils/getInvalidConstructorErrorMessage';
import { PatcherClass } from './../../../patchers/NodePatcher';
import BlockPatcher from './BlockPatcher';
import ClassAssignOpPatcher from './ClassAssignOpPatcher';
import ClassPatcher from './ClassPatcher';
import ConstructorPatcher from './ConstructorPatcher';

export default class ClassBlockPatcher extends BlockPatcher {
  static patcherClassForChildNode(node: Node, property: string): PatcherClass | null {
    if (property === 'statements' && node.type === 'AssignOp') {
      return ClassAssignOpPatcher;
    }
    return null;
  }

  patch(options: PatchOptions = {}): void {
    for (let boundMethod of this.boundInstanceMethods()) {
      boundMethod.key.setRequiresRepeatableExpression();
    }

    super.patch(options);

    if (!this.hasConstructor()) {
      if (this.boundInstanceMethods().length > 0) {
        let isSubclass = this.getClassPatcher().isSubclass();
        if (isSubclass && !this.shouldAllowInvalidConstructors() && !this.shouldBindMethodsAfterSuperCall()) {
          throw this.error(getInvalidConstructorErrorMessage(
            'Cannot automatically convert a subclass that uses bound methods.'
          ));
        }

        let { source } = this.context;
        let insertionPoint = this.statements[0].outerStart;
        let methodIndent = adjustIndent(source, insertionPoint, 0);
        let methodBodyIndent = adjustIndent(source, insertionPoint, 1);
        let constructor = '';
        if (isSubclass) {
          constructor += `constructor(...args) {\n`;
          if (this.shouldEnableBabelWorkaround()) {
            for (let line of babelConstructorWorkaroundLines) {
              constructor += `${methodBodyIndent}${line}\n`;
            }
          }
        } else {
          constructor += `constructor() {\n`;
        }

        const bindMethods = () => {
          this.getBindingCodeForAllBoundMethods().forEach((methodBindingCode) => {
            constructor +=  `${methodBodyIndent}${methodBindingCode};\n`;
          });
        };

        if (!this.shouldBindMethodsAfterSuperCall()) { bindMethods(); }
        if (isSubclass) {
          constructor += `${methodBodyIndent}super(...args)\n`;
        }
        if (this.shouldBindMethodsAfterSuperCall()) { bindMethods(); }

        constructor += `${methodIndent}}\n\n${methodIndent}`;
        this.prependLeft(insertionPoint, constructor);
      }
    }
  }

  getBindingCodeForAllBoundMethods(): Array<string> {
    const boundMethods = this.boundInstanceMethods();
    const result: Array<string> = [];

    if (!(boundMethods.length > 0)) {
      return result;
    }

    if (this.shouldCompactMethodsBinding()) {
      const boundMethodNames = boundMethods.map((m) => `'${getNameForMethod(m)}'`).join(', ');
      result.push(`this._bindMethods(${boundMethodNames})`);
    } else {
      boundMethods.forEach(method => {
        result.push(getBindingCodeForMethod(method));
      });
    }

    return result;
  }

  shouldAllowInvalidConstructors(): boolean {
    return !this.options.disallowInvalidConstructors;
  }

  shouldBindMethodsAfterSuperCall(): boolean {
    return !!this.options.bindMethodsAfterSuperCall;
  }

  shouldCompactMethodsBinding(): boolean {
    return !!this.options.compactMethodsBinding;
  }

  shouldEnableBabelWorkaround(): boolean {
    let shouldEnable = !this.options.disableBabelConstructorWorkaround;
    if (shouldEnable) {
      this.addSuggestion(REMOVE_BABEL_WORKAROUND);
    }
    return shouldEnable;
  }

  getClassPatcher(): ClassPatcher {
    if (!(this.parent instanceof ClassPatcher)) {
      throw this.error('Expected class block parent to be a class.');
    }
    return this.parent;
  }

  canPatchAsExpression(): boolean {
    return false;
  }

  hasConstructor(): boolean {
    return this.statements.some(
      statement => statement instanceof ConstructorPatcher
    );
  }

  boundInstanceMethods(): Array<ClassAssignOpPatcher> {
    let boundMethods = [];
    for (let statement of this.statements) {
      if (statement instanceof ClassAssignOpPatcher && statement.isBoundInstanceMethod()) {
        boundMethods.push(statement);
      }
    }
    return boundMethods;
  }
}

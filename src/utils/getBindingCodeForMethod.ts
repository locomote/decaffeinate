import ClassAssignOpPatcher from '../stages/main/patchers/ClassAssignOpPatcher';
import IdentifierPatcher from '../stages/main/patchers/IdentifierPatcher';

function getAccessCodeForMethod(method: ClassAssignOpPatcher): string {
  if (method.key instanceof IdentifierPatcher) {
    return `.${method.key.node.data}`;
  } else {
    return `[${method.key.getRepeatCode()}]`;
  }
}

export function getNameForMethod(method: ClassAssignOpPatcher): string {
  return getAccessCodeForMethod(method).substr(1);
}

export default function getBindingCodeForMethod(method: ClassAssignOpPatcher): string {
  const accessCode = getAccessCodeForMethod(method);
  return `this${accessCode} = this${accessCode}.bind(this)`;
}

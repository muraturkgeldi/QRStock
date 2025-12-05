export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const denied = `The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
    super(`FirestoreError: Missing or insufficient permissions: ${denied}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}

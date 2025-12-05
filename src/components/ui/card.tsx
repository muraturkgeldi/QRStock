// This file acts as a shim to resolve case-sensitivity issues in imports.
// It redirects any imports from '.../ui/card' to the correct '.../ui/Card' file.
export * from './Card';

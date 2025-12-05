import { EventEmitter } from 'events';

// This is a global event emitter for handling specific errors like permission denied.
export const errorEmitter = new EventEmitter();

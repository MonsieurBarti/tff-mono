export abstract class EventBus {
	abstract publish<T>(eventName: string, payload: T): Promise<void>;
	abstract subscribe<T>(eventName: string, handler: (payload: T) => void | Promise<void>): void;
}

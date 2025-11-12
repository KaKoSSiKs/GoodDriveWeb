// Структурированное логирование для GoodDrive
// Используется pino для production-ready логирования

// Simple logger implementation (можно заменить на pino позже)
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
	level: LogLevel;
	message: string;
	timestamp: string;
	context?: string;
	error?: string;
	stack?: string;
	[key: string]: any;
}

class Logger {
	private logLevel: LogLevel;
	private isDevelopment: boolean;

	constructor() {
		this.isDevelopment = process.env.NODE_ENV === 'development';
		this.logLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'info');
	}

	private shouldLog(level: LogLevel): boolean {
		const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
		return levels.indexOf(level) >= levels.indexOf(this.logLevel);
	}

	private formatMessage(entry: LogEntry): string {
		const timestamp = new Date().toISOString();
		const context = entry.context ? `[${entry.context}]` : '';
		const error = entry.error ? ` | Error: ${entry.error}` : '';
		const stack = entry.stack && this.isDevelopment ? `\n${entry.stack}` : '';
		
		return `[${timestamp}] ${entry.level.toUpperCase()} ${context} ${entry.message}${error}${stack}`;
	}

	private log(level: LogLevel, message: string, data?: any, context?: string) {
		if (!this.shouldLog(level)) return;

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date().toISOString(),
			context,
			...(data && typeof data === 'object' ? data : { data })
		};

		// В development выводим красиво, в production - структурированно
		if (this.isDevelopment) {
			const formatted = this.formatMessage(entry);
			console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](formatted);
		} else {
			// В production можно отправлять в файл или систему мониторинга
			console.log(JSON.stringify(entry));
		}
	}

	debug(message: string, data?: any, context?: string) {
		this.log('debug', message, data, context);
	}

	info(message: string, data?: any, context?: string) {
		this.log('info', message, data, context);
	}

	warn(message: string, data?: any, context?: string) {
		this.log('warn', message, data, context);
	}

	error(message: string, error?: Error | any, context?: string) {
		const errorData = error instanceof Error
			? {
				error: error.message,
				stack: error.stack,
				name: error.name
			}
			: { error: String(error) };

		this.log('error', message, errorData, context);
	}
}

// Singleton instance
export const logger = new Logger();

// Для будущей интеграции с pino
// import pino from 'pino';
// 
// export const logger = pino({
//   level: process.env.LOG_LEVEL || 'info',
//   transport: process.env.NODE_ENV === 'development'
//     ? {
//         target: 'pino-pretty',
//         options: {
//           colorize: true,
//           translateTime: 'HH:MM:ss Z',
//           ignore: 'pid,hostname'
//         }
//       }
//     : undefined
// });


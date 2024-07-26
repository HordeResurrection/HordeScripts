
/**
 * Уровень записей в лог.
 */
export enum LogLevel {
    Debug,
    Info,
    Warning,
    Error
}

/**
 *  Выполняет логгирование.
 */
export class Logger {
    public logLevel: LogLevel = LogLevel.Info;
    public msgPrefix: string = "";

    /**
     * Конструктор.
     */
    public constructor() {
        
    }

    /**
     * Сделать отладочную запись.
     */
    public debug(...vars: any[]) {
        if (this.logLevel > LogLevel.Debug) {
            return;
        }
        this.write(this.prepareMsg("DBG", ...vars));
    }
    
    /**
     * Сделать info-запись.
     */
    public info(...vars: any[]) {
        if (this.logLevel > LogLevel.Info) {
            return;
        }
        this.write(this.prepareMsg("Info", ...vars));
    }
    
    /**
     * Сделать warning-запись.
     */
    public warning(...vars: any[]) {
        if (this.logLevel > LogLevel.Warning) {
            return;
        }
        this.write(this.prepareMsg("WARN", ...vars));
    }
    
    /**
     * Сделать error-запись.
     */
    public error(...vars: any[]) {
        if (this.logLevel > LogLevel.Error) {
            return;
        }
        this.write(this.prepareMsg("ERR", ...vars));
    }
    
    /**
     * Сделать запись об исключении.
     */
    public exception(ex) {
        this.error(ex);
        DebugLogger.WriteLine(ex.stack);
    }

    /**
     * Вызывается при добавлении записи в лог.
     * Можно переопределить, чтобы перенаправить вывод, например, в игровой чат.
     */
    private write(line) {
        DebugLogger.WriteLine(line);
    }

    /**
     * Составляет строку для записи в лог.
     */
    private prepareMsg(level: string, ...vars: any[]) {
        if (vars.length == 0)
            return;

        let msg = vars.join(' ');
        return `[JS: ${level}] ${this.msgPrefix}${msg}`;
    }
}

/**
 * Глобальный логгер по умолчанию.
 */
export const log = new Logger();

//TODO: these are obsolete, get rid of this in the future

export function* enumerate(enumerable) {
    var IEnumeratorT = xHost.type('System.Collections.IEnumerator');
    var enumerator = xHost.cast(IEnumeratorT, enumerable.GetEnumerator());
    while (enumerator.MoveNext()) {
        yield enumerator.Current;
    }
    
    var IDisposableT = xHost.type('System.IDisposable');
    xHost.cast(IDisposableT, enumerator).Dispose();
}

export function eNext(enumerated) {
    var next = enumerated.next();
    if (next.done)
        return undefined;
    return next.value;
}

export abstract class FsmState {
    abstract OnEntry(): void;
    abstract OnExit(): void;
    abstract Tick(tickNumber: number): void;
}
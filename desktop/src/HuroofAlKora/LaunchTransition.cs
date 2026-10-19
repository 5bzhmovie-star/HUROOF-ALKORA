namespace HuroofAlKora;

// The native cover stays up until both the document and the rendered game are ready.
// Passing time in makes fast starts, retries and stale WebView events deterministic.
internal sealed class LaunchTransition
{
    private ulong navigation;
    private DateTimeOffset started;
    private bool loaded, ready, failed, completed;
    internal void Begin(ulong id, DateTimeOffset now)
    {
        navigation = id; started = now;
        loaded = ready = failed = completed = false;
    }
    internal void DocumentLoaded(ulong id) { if (id == navigation) loaded = true; }
    internal void AppReady(ulong id) { if (id == navigation) ready = true; }
    internal void Fail(ulong id) { if (id == navigation) failed = true; }
    internal bool HasTimedOut(DateTimeOffset now) => !completed && now - started >= TimeSpan.FromSeconds(30);
    internal bool TryComplete(DateTimeOffset now)
    {
        if (completed || failed || HasTimedOut(now) || !loaded || !ready || now - started < TimeSpan.FromMilliseconds(550)) return false;
        completed = true;
        return true;
    }
}

using HuroofAlKora;
var now=DateTimeOffset.Parse("2026-10-19T10:47:00Z");
static void Check(bool condition,string reason){if(!condition)throw new Exception(reason);}
var transition=new LaunchTransition();
transition.Begin(1,now);transition.DocumentLoaded(1);
Check(!transition.TryComplete(now.AddSeconds(1)),"An HTML load alone must not remove the splash before the game is ready.");
transition.AppReady(1);Check(!transition.TryComplete(now.AddMilliseconds(100)),"Very fast starts must not flash the loading screen.");Check(transition.TryComplete(now.AddMilliseconds(600)),"The ready game must open without another click.");
transition.Begin(2,now);transition.DocumentLoaded(2);transition.AppReady(1);Check(!transition.TryComplete(now.AddSeconds(1)),"A stale page must not dismiss the splash for a newer navigation.");transition.AppReady(2);Check(transition.TryComplete(now.AddSeconds(1)),"The current page can complete.");
transition.Begin(3,now);transition.Fail(3);transition.DocumentLoaded(3);transition.AppReady(3);Check(!transition.TryComplete(now.AddSeconds(1)),"Failure must keep retry UI visible.");
transition.Begin(4,now);transition.AppReady(4);Check(!transition.TryComplete(now.AddSeconds(1)),"App readiness alone is insufficient before navigation succeeds.");Check(transition.HasTimedOut(now.AddSeconds(31)),"Startup must time out instead of spinning indefinitely.");transition.DocumentLoaded(4);Check(!transition.TryComplete(now.AddSeconds(31)),"A late response must not reveal a failed startup.");
transition.Begin(5,now.AddSeconds(32));transition.DocumentLoaded(5);transition.AppReady(5);Check(transition.TryComplete(now.AddSeconds(33)),"Retry must discard the previous error and timeout state.");
Check(!transition.HasTimedOut(now.AddMinutes(5)),"An already shown game must never time out.");
Console.WriteLine("LAUNCH_TESTS_OK: document + app readiness, minimum display, stale navigation, failure, timeout, retry.");

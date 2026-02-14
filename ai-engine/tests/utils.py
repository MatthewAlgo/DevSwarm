import functools
import pytest
import asyncio

def probabilistic(trials=5, threshold=0.6):
    """
    Decorator to run a test multiple times and pass if a threshold percentage
    of runs succeed. Useful for nondeterministic LLM outputs.
    Works for both sync and async test functions.
    """
    def decorator(test_func):
        @functools.wraps(test_func)
        async def wrapper(*args, **kwargs):
            successes = 0
            last_error = None
            
            for _ in range(trials):
                try:
                    if asyncio.iscoroutinefunction(test_func):
                        await test_func(*args, **kwargs)
                    else:
                        test_func(*args, **kwargs)
                    successes += 1
                except Exception as e:
                    last_error = e
            
            rate = successes / trials
            if rate < threshold:
                pytest.fail(
                    f"Probabilistic test failed: {successes}/{trials} successful "
                    f"(needed {threshold*100}%). Last error: {last_error}"
                )
        return wrapper
    return decorator

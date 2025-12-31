def add(a: int, b: int) -> int:
    return a + b


# Type error that should be ignored when disabled
result: str = add(1, 2)

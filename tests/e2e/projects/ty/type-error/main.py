def add(a: int, b: int) -> int:
    return a + b


# Type error: assigning int to str
result: str = add(1, 2)

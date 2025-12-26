"""Clean Python module with no dead code."""


def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"


def main() -> None:
    """Entry point."""
    message = greet("World")
    print(message)


if __name__ == "__main__":
    main()

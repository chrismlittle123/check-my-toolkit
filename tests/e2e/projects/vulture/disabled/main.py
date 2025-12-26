"""Python file with dead code (but vulture is disabled)."""
import os  # unused import


def unused_function():
    """This function is never called."""
    return "dead code"


def main():
    print("Hello")


if __name__ == "__main__":
    main()

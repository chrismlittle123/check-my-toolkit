"""Unformatted Python file."""
def greet(  name:str   )->str:
    """Return a greeting."""
    return f"Hello, {name}!"
def add(a:int,b:int)->int:
    return a+b
if __name__=="__main__":
    print(greet(  "World"  ))

# BuildLang

![Logo](docs/logo.png)

### by: Ty Valencia and Christine Li

## Description

A block-based language that builds off the simplicity of Python but has advanced functionality and is even easier to read! This language is good for beginners and advanced programmers alike. BuildLang is supposed to mimic assembling Lego bricks together so that it can bridge the gap for those looking to get into code. It also serves as a good basis as one gets more advanced. As a conglomerate of interesting coding techniques, it can serve as a powerful tool for those who know how to use them.

Github Page: https://tyvalencia.github.io/BuildLang/
[View our Grammar](https://github.com/TyValencia/BuildLang/blob/main/src/buildlang.ohm)

## Features

- Pipe operators easily connect blocks (functions)
- Statically typed
- Python indenting and dedenting
- Stack simplifies counting loops

## Examples

### Hello World

<table>
<tr> <th>Python</th><th>BuildLang</th><tr>
</tr>

<td>

```
if __name__ = main:
    print("Hello world!")
```

</td>
<td>

```
say("Hello world!")
```

</td>
</table>

### Fibonacci Sequence

<table>
<tr> <th>Python</th><th>BuildLang</th><tr>
</tr>

<td>

```
n = 10
num1 = 0
num2 = 1
next_number = num2
count = 1

for _ in range(n):
    print(next_number)
    count += 1
    num1, num2 = num2, next_number
    next_number = num1 + num2
```

</td>
<td>

```
int n=10
int num1 = 0
int num2 = 1
int nextNumber = num2

stack n:
    say(nextNumber)
    num1, num2 = num2, nextNumber
    nextNumber = num1 + num2
```

</td>
</table>

### Implementing Pipelines

<table>
<tr> <th>Python</th><th>BuildLang</th><tr>
</tr>

<td>

```
def sin_greater_than_pi(x):
    return math.sin(x) > math.pi

def is_true(z):
    return z == True

def main():
    z = 0.5
    print(is_true(sin_greater_than_pi(z)))
```

</td>
<td>

```
block sinGreaterThanPi(float x) sends bool:
  send sin(x) > π

block isTrue(bool z) sends bool:
  send z

float z = 0.5
z |> sinGreaterThanPi |> isTrue
```

</td>
</table>

### Async Functions (can be implemented in the future)

<table>
<tr> <th>Python</th><th>BuildLang</th><tr>
</tr>

<td>

```
import asyncio

async def print_msg(delay, message):
    await asyncio.sleep(delay)
    print(message)

async def msgs():
    await asyncio.gather(
        print_msg(1, "Hello after 1 second"),
        print_msg(2, "World after 2 seconds")
    )

def main:
    asyncio.run(msgs())
```

</td>
<td>

```
async block sayMsg(int delay, string message):
    await asyncio.sleep(delay)
    say(message)

async block msgs():
    await asyncio.gather(
        sayMsg(1, "Hello after 1 second"),
        sayMsg(2, "World after 2 seconds")
    )

msgs()
```

</td>
</table>

### Optionals (can be implemented in the future)

<table>
<tr> <th>Python</th><th>BuildLang</th><tr>
</tr>

<td>

```
def find_user(username):
    if username == "ty":
        return {"username": "ty", "email": "ty@lion.lmu.edu"}
    else:
        return None

if __name__ = __main__:
    user = find_user("ty")
    if user is not None:
        print(user["email"])
    else:
        print("User not found")
```

</td>
<td>

```
block find_user(string username) sends user?:
  if username == "ty":
    send user(username: "ty", email: "ty@lion.lmu.edu")

// since find_user is an optional, if no value is sent, None will automatically be sent
user = find_user("ty")
ifExists user then:
    say(user.email)
else:
	say("User not found")
```

</td>
</table>

## Notes

Implemented Python indenting and dedenting, static typing, and pipeline operators
Stretch goals: async, optionals, SIMD, simple generators

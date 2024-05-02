# BuildLang

![Logo](docs/logo.png)

### by: Ty Valencia and Christine Li

## Description

A block-based language that builds off the simplicity of Python but has advanced functionality and is even easier to read! This language is good for beginners and advanced programmers alike. BuildLang is supposed to mimic assembling Lego bricks together so that it can bridge the gap for those looking to get into code. It also serves as a good basis as one gets more advanced. As a conglomerate of interesting coding techniques, it can serve as a powerful tool for those who know how to use them.

Github Page: https://github.com/TyValencia/BuildLang/deployments/github-pages

## Features

- Blocks (functions) can be easily connected each other in an intuitive way through the pipe operator |> and <|
- Type Inference makes it make it easier to interpret code
- Optionals ? are borrowed from JavaScript's approach to handling nulls and errors
- Async also borrowed from JavaScript

## Stretch goals

- Single Instruction, Multiple Data (SIMD) from Mojo
- Simple generators from Mojo
- Unique IDE - create a clean UI that makes it fun for kids to code (stretch goal)

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
    print(next_number, end=" ")
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
    say(nextNumber, " ")
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
def multiply(num1, num2):
	return num1 * num2

def convert_binary(num):
	binary_num = ""
    while num > 0:
        binary_num = str(num % 2) + binary_num
        num = num // 2
    return binary_num

def main:
	function2(function1(3, 5))
```

</td>
<td>

```
block multiply(int num1, int num2) sends int:
    send num1 * num2

block convertBinary(int num) sends string:
    binaryNum = ""
    while num > 0:
        binaryNum = str(num % 2) + binaryNum
        num = math.floor(num / 2)
    send binaryNum

3, 5 |> multiply |> converyBinary
```

</td>
</table>

### Async Functions

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

Implemented Python indenting and dedenting, static typing, pipeline operators, and async
To be implemented: optionals, SIMD, simple generators, and unique IDE

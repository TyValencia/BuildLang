const regexes = {
    canadianPostalCode: /^[ABCEGHJKLMNPRSTVWXYZ]\d[ABCEGHJKLMNPRSTVWXYZ] \d[ABCEGHJKLMNPRSTVWXYZ]\d$/,
    visa: /^4(\d{12}|\d{15})$/,
    masterCard: /^(5[1-5]\d{14}|(222[1-9]|22[3-9]\d|2[3-6]\d\d|27[0-1]\d|2720)\d{12})$/,
    notThreeEndingInOO: /^(?!(\p{L}{1}oo)$)\p{L}*$/iu,
    divisibleBy16:  /^[01]*0000$/,
    eightThroughThirtyTwo: /^(8|9|1\d|2\d|3[0-2])$/,
    notPythonPycharmPyc: /^(?!.*\b(python|pycharm|pyc)\b).*$/u,
    restrictedFloats:  /^\d+(\.\d*)?[eE][+-]?\d{1,3}$/i,
    palindromes2358: /^(?:(.)\1|(.).\2|(.)(.).\4\3|(.)(.)(.)(.)\8\7\6\5)$/u,
    pythonStringLiterals: /^(r|u|R|U|f|F|rf|fr|b|B|br|Br|bR|BR|rf|FR|Rf|RF|rb|Rb|rB|RB)?(?:'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|'''(?:\\.|[^\\])*'''|"""(?:\\.|[^\\])*""")$/,
  }
  
  export function matches(name, string) {
    return regexes[name].test(string)
  }  

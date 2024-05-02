import * as ohm from "ohm-js";

export function matches(name, s) {
    const grammars = {
        canadianPostalCode: String.raw` G {
            code = letter digit letter " " digit letter digit
            letter = "A".."C" | "E".."H" | "J".."N" | "P" | R".."T" | "V".."Z"
        }`,
        visa: String.raw`G {
            visa = "4" digit{15} | "4" digit{12}
        }`,
        masterCard: String.raw`G {
            masterCard = ("51".."55" digit{14}) | ("2221".."2720" digit{12})
        }`,
        notThreeEndingInOO: String.raw`G {
            notThreeEndingInOO = ~("3".."3") any ~("o".."o") ~("o".."o")
        }`,
        divisibleBy16: String.raw`G {
            divisibleBy16 = ("0" | "1")* "0000"
        }`,
        eightThroughThirtyTwo: String.raw`G {
            eightThroughThirtyTwo = "8".."32"
        }`,
        notPythonPycharmPyc: String.raw`G {
            notPythonPycharmPyc = ~"python" ~"pycharm" ~"pyc" any
        }`,
        restrictedFloats: String.raw`G {
            restrictedFloats = digit* "." digit* "e" ("+" | "-") digit{1,3}
        }`,
        palindromes: String.raw`G {
            palindromes = "aa" | "bb" | "cc" 
                        | "a" ("a" | "b" | "c") "a" | "b" ("a" | "b" | "c") "b" | "c" ("a" | "b" | "c") "c"
                        | "a" ... 
            
        }`,
        pythonStringLiterals: String.raw`G {
            stringliteral        = "[" stringprefix "]" (shortstring | longstring)
            stringprefix         = "r" | "u" | "R" | "U" | "f" | "F"
                                 | "fr" | "Fr" | "fR" | "FR" | "rf" | "rF" | "Rf" | "RF"
            shortstring          = "'" shortstringitem* "'" | '"' shortstringitem* '"'
            longstring           = "'''" longstringitem* "'''" | '"""' longstringitem* '"""'
            shortstringitem      = shortstringchar | stringescapeseq
            longstringitem       =  longstringchar | stringescapeseq
            shortstringchar      =  ~("\"" |  "\\n" | "\\\"") any*
            longstringchar       =  ~"\"" any*
            stringescapeseq      =  "\"" any*
            bytesliteral         =  "bytesprefix" (shortbytes | longbytes)
            bytesprefix          =  "b" | "B" | "br" | "Br" | "bR" | "BR" | "rb" | "rB" | "Rb" | "RB"
            shortbytes           =  "'" shortbytesitem* "'" | '"' shortbytesitem* '"'
            longbytes            =  "'''" longbytesitem* "'''" | '"""' longbytesitem* '"""'
            shortbytesitem       =  shortbyteschar | bytesescapeseq
            longbytesitem        =  longbyteschar | bytesescapeseq
            shortbyteschar       =  ~("\"" |  "\\n" | "\\\"") letter*
            longbyteschar        =  ~"\"" letter*
            bytesescapeseq       =  "\"" letter*
        }`
    }
}

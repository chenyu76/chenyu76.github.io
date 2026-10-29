const questions = [
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running `disp('\\n')`?",
    options : [
      "```>> disp('\\n')\n>>```", "```>> disp('\\n')\n\n>>```",
      "```>> disp('\\n')\n\\n\n>>```"
    ],
    answer : 2,
    explanation :
        "`\\n` will not be automatically formatted as a newline character; `disp` will output `\\n` as is."
  },
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running `fprintf('\\n')`?",
    options : [
      "```>> fprintf('\\n')\n\\n\n>>```", "```>> fprintf('\\n')\n\n>>```",
      "```>> fprintf('\\n')\n\\n>>```"
    ],
    answer : 1,
    explanation :
        "`fprintf` interprets escape sequences like `\\n` in its format string (the first argument) as a true newline character. Unlike `disp`, `fprintf` does not automatically append an extra newline at the end."
  },
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running `fprintf('%s', '\\n')`?",
    options : [
      "```>> fprintf('%s', '\\n')\n\n>>```",
      "```>> fprintf('%s', '\\n')\n\\n\n>>```",
      "```>> fprintf('%s', '\\n')\n\\n>>```"
    ],
    answer : 2,
    explanation :
        "Escape sequences are only parsed within the format string. When `\\n` is passed as a data argument to `%s`, it is treated as a literal backslash and 'n' (`\\n`). Since the format string lacks a newline, the prompt `>>` appears on the same line."
  },
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running `fprintf('\\n', '%s')`?",
    options : [
      "```>> fprintf('\\n', '%s')\n%s\n>>```",
      "```>> fprintf('\\n', '%s')\n\n>>```",
      "```>> fprintf('\\n', '%s')\n\\n\n>>```"
    ],
    answer : 1,
    explanation :
        "The format string `\\n` contains a newline escape sequence but no formatting operators (like `%s`). When `fprintf` finds no formatting operators, it simply prints the format string and ignores all subsequent data arguments."
  },
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running `fprintf('%s\\n', '\\n')`?",
    options : [
      "```>> fprintf('%s\\n', '\\n')\n\\n\n>>```",
      "```>> fprintf('%s\\n', '\\n')\n\n\n>>```",
      "```>> fprintf('%s\\n', '\\n')\n\\n>>```"
    ],
    answer : 0,
    explanation :
        "The format string `'%s\\n'` dictates that a string will be printed followed by a newline. The data argument `\\n` is passed literally. Thus, `fprintf` outputs the literal characters `\\n`, followed by the parsed newline."
  },
  {
    question : "What is the result of evaluating `\"str\" == 'str'` in MATLAB?",
    options : [ "1 (true)", "0 (false)", "[1, 1, 1]", "Error" ],
    answer : 0,
    explanation :
        "MATLAB performs an implicit type conversion, converting the character vector to a string."
  },
  {
    question :
        "What is the result of evaluating `double('1') == double(\"1\")` in MATLAB?",
    options : [ "1 (true)", "0 (false)", "Error", "[]" ],
    answer : 1,
    explanation :
        "`double('1')` converts the character '1' to its numeric character code, 49, whereas `double(\"1\")` converts the string \"1\" to the numeric value 1. Therefore, `49 == 1` evaluates to `0` (false)."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
str1='str1';
str2="str2";
disp(str1(4)==str2(4))
\`\`\`
`,
    options : [ "0 (false)", "1 (true)", "Error" ],
    answer : 2,
    explanation :
        "The index exceeds the number of array elements. It must not exceed 1 because `str2` is a 1x1 string array."
  },
  {
    question : "What is the result of evaluating `\"\"\"\" == ''''` in MATLAB?",
    options : [ "1 (true)", "0 (false)", "[]", "Error" ],
    answer : 1,
    explanation :
        "`\"\"\"\"` will be parsed as a string containing `\"`, while `''''` will be parsed as a character vector containing `'`. Even with implicit type conversion, they are not equal."
  },
  {
    question :
        "What is the result of evaluating `disp(class(class(\"class\")))` in MATLAB?",
    options : [ "string", "char", "class", "Error" ],
    answer : 1,
    explanation :
        "In MATLAB, `class(\"class\")` returns `'string'` because the double quotes define a scalar of type `string`. Then, the input to `class('string')` is a character array (enclosed in single quotes), so it returns `char`."
  },
  {
    question :
        "What is the result of evaluating\n`length('M') == length(\"M\")`?",
    options : [ "1 (true)", "0 (false)", "Error", "Empty array" ],
    answer : 0,
    explanation :
        "In MATLAB, `'M'` is a 1x1 character array with a length of 1, whereas `\"M\"` is a 1x1 string scalar with a length of 1."
  },
  {
    question :
        "What is the result of evaluating\n`length('MATLAB') == length(\"MATLAB\")`?",
    options : [ "1 (true)", "0 (false)", "Error", "Empty array" ],
    answer : 1,
    explanation :
        "In MATLAB, `'MATLAB'` is a 1x6 character array with a length of 6, whereas `\"MATLAB\"` (introduced in R2016b) is a 1x1 string scalar with a length of 1."
  },
  {
    question : "What does `disp(['A', 66, 'C'])` output?",
    options : [ "A66C", "['A', '66', 'C']", "ABC", "Error" ],
    answer : 2,
    explanation :
        "When concatenating numbers with character arrays (using single quotes), MATLAB implicitly converts the numbers to their corresponding ASCII characters. The ASCII code 66 corresponds to 'B'."
  },
  {
    question : "What does `isempty('')` evaluate to?",
    options : [ "1 (true)", "0 (false)", "Error", "[]" ],
    answer : 0,
    explanation :
        "In MATLAB, `''` creates a 0x0 character array. Because its dimensions include a zero, `isempty()` evaluates to `1` (true)."
  },
  {
    question : "What does `isempty(\"\")` evaluate to?",
    options : [ "1 (true)", "0 (false)", "Error", "[]" ],
    answer : 1,
    explanation :
        "In MATLAB, `\"\"` creates a 1x1 string array (a string scalar) that happens to contain no characters. Since it is a 1x1 array, `isempty()` evaluates to `0` (false)."
  },
  {
    question :
        "What is the result of evaluating the chained inequality `1 < 2 < 3`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 0,
    explanation :
        "MATLAB evaluates operators from left to right. It first evaluates `(1 < 2)`, which returns logical `1` (true). It then evaluates `1 < 3`, which evaluates to `1` (true)."
  },
  {
    question :
        "What is the result of evaluating the chained inequality `3 > 2 > 1`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 3,
    explanation :
        "MATLAB evaluates operators from left to right. It first evaluates `(3 > 2)`, which returns logical `1` (true). It then evaluates `1 > 1`, which evaluates to `0` (false)."
  },
  {
    question : "What is the result of evaluating the expression `~ 1==2`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 3,
    explanation : "`~` has higher precedence than `==`, so MATLAB evaluates `(~1) == 2`, which is false."
  },
  {
    question : "What is the result of evaluating the expression `i==j`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 0,
    explanation : "If neither has been assigned a value, `i` and `j` both represent the imaginary unit."
  },
  {
    question :
        "What is the output of comparing two NaN (Not-a-Number) values: `disp(NaN == NaN)`?",
    options : [ "0 (false)", "1 (true)", "NaN", "[]" ],
    answer : 0,
    explanation :
        "According to the IEEE floating-point standard, NaN is not equal to anything, including itself. To properly check for equality involving NaN values, you must use the `isnan()` or `isequaln()` functions."
  },
  {
    question :
        "What is the output of comparing two empty arrays: `disp([] == [])`?",
    options : [ "0 (false)", "1 (true)", "[]", "No output" ],
    answer : 3,
    explanation :
        "MATLAB compares the arrays element by element, so the result is a 0x0 logical array."
  },
  {
    question :
        "What is the output of comparing two empty arrays: `disp([] == [[]])`?",
    options : [ "0 (false)", "1 (true)", "[]", "No output" ],
    answer : 3,
    explanation :
        "MATLAB compares the arrays element by element, so the result is a 0x0 logical array."
  },
  {
    question :
        "What is the output of the integer addition `uint8(200) + uint8(100)`?",
    options : [ "44", "300", "255", "Error" ],
    answer : 2,
    explanation :
        "MATLAB uses saturation arithmetic for integer types by default. Any operation that exceeds the maximum value for the type (`255` for `uint8`) is capped at that maximum value, rather than wrapping around."
  },
  {
    question : "What does the function `sum([])` return?",
    options : [ "NaN", "[]", "0", "1" ],
    answer : 2,
    explanation :
        "By mathematical convention, the sum of an empty array evaluates to the additive identity, which is 0. Conversely, `prod([])` evaluates to the multiplicative identity, which is 1."
  },
  {
    question :
        "What are the value and data type of `true + true`?",
    options : [ "true (logical)", "1 (logical)", "2 (double)", "Error" ],
    answer : 2,
    explanation :
        "When mathematical operations (like addition) are performed on logical values in MATLAB, they are implicitly converted to the `double` data type. Thus, `1 + 1` becomes `2` of type double."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
vec = [1, 2, 3];
disp(ndims(vec));
\`\`\`
`,
    options : [ "0", "1", "2", "3" ],
    answer : 2,
    explanation :
        "`vec` is a 1x3 double array. `N = ndims(A)` returns the number of dimensions of the array `A`. The number of dimensions is always greater than or equal to 2."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
mat = [1, 2; 3, 4];
disp(ndims(mat));
\`\`\`
`,
    options : [ "0", "1", "2", "3", "4" ],
    answer : 2,
    explanation :
        "`mat` is a 2x2 double array. `N = ndims(A)` returns the number of dimensions of the array `A`. The number of dimensions is always greater than or equal to 2."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
ten = [[1,2],[3,4];[5,6],[7,8]];
disp(ndims(ten));
\`\`\`
`,
    options : [ "0", "1", "2", "3", "4" ],
    answer : 2,
    explanation :
        "`ten` is a 2x4 double array. `N = ndims(A)` returns the number of dimensions of the array `A`. The number of dimensions is always greater than or equal to 2.This syntax creates a two-dimensional array, rather than a higher-dimensional tensor."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
vec = [1, 2, 3];
disp(ismatrix(vec));
\`\`\`
`,
    options : [ "0", "1" ],
    answer : 1,
    explanation : "It's **MAT**LAB, so `vec` is a 1x3 **mat**rix. :("
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
sca = 1;
disp(ismatrix(sca));
\`\`\`
`,
    options : [ "0", "1" ],
    answer : 1,
    explanation : "It's **MAT**LAB, so `sca` is a 1x1 **mat**rix. :("
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
ten = ones(2,2,2);
disp(ismatrix(ten));
\`\`\`
`,
    options : [ "0", "1" ],
    answer : 0,
    explanation : "A tensor is not a matrix, of course."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
ten = ones(1,1,1);
disp(ismatrix(ten));
\`\`\`
`,
    options : [ "0", "1" ],
    answer : 1,
    explanation : "The function ignores trailing singleton dimensions."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
mat = NaN(2, 2);
s1 = numel(mat);
mat(:, :) = -1;
s2 = numel(mat);
disp(s1==s2); 
\`\`\`
`,
    options : [ "0 (false)", "1 (true)", "Error" ],
    answer : 1,
    explanation :
        "`A(:, :) = b` fills `A` with elements from `b`, keeping `A`'s original dimensions."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
mat = NaN(0, 0);
s1 = numel(mat);
mat(:, :) = -1;
s2 = numel(mat);
disp(s1==s2); 
\`\`\`
`,
    options : [ "0 (false)", "1 (true)", "Error" ],
    answer : 0,
    explanation : `I don't know :( 

<a href="https://www.mathworks.com/matlabcentral/answers/2183830-unexpected-size-change-when-assigning-a-scalar-to-a-0x0-matrix-using-indexing">
See my question on MATLAB Answers.
</a>`
  },
  {
    question :
        `Which of the following MATLAB code snippets correctly plots both curves with logarithmic scales on both axes?`,
    options : [
      `\`\`\`
x = [1 2 3 4];
y = [2 4 8 16];
z = [1 3 5 7];

figure;
loglog(x, y);
hold on
loglog(x, z);
\`\`\``,
      `\`\`\`
x = [1 2 3 4];
y = [2 4 8 16];
z = [1 3 5 7];

figure;
hold on
loglog(x, y);
loglog(x, z);
\`\`\``,
      "Both", "Neither"
    ],
    answer : 0,
    explanation :
        "`hold on` preserves the current axes properties, including `XScale` and `YScale`. Therefore, either call `loglog` before `hold on`, or explicitly set `XScale` and `YScale` to logarithmic scales afterward."
  },
  {
    question : `
Which of the following statements can print \`NaN\`?
`,
    options : [
      "`fprintf(string(NaN))`", "`fprintf(num2str(NaN))`", "`fprintf(NaN)`",
      "All three", "None of the above"
    ],
    answer : 1,
    explanation : "`string(NaN)` returns a missing string value."
  },
  {
    question : `
Which of the following statements can print \`missing\`?
`,
    options : [
      "`fprintf(string(missing))`", "`fprintf(num2str(missing))`",
      "`fprintf(missing)`", "All three", "None of the above"
    ],
    answer : 4,
    explanation : "Most MATLAB functions do not accept `missing`."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
diff = unicode2native("A")-unicode2native("a");
disp(char('HELLO' - diff))
\`\`\`
`,
    options : [ "hello", "HELLO", "Error using -" ],
    answer : 2,
    explanation :
        `\`unicode2native\` returns a \`uint8\` value. Use \`double(unicode2native(...))\` to convert it.`
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
diff = double(unicode2native("A")-unicode2native("a"));
disp(char('HELLO' - diff))
\`\`\`
`,
    options : [ "hello", "HELLO", "Error using -" ],
    answer : 1,
    explanation :
        `Arithmetic operations performed directly on integer data types (here, the \`uint8\` values returned by \`unicode2native\`) use saturation arithmetic. This means that if a result falls outside the range of the data type ([0, 255] for \`uint8\`), it is clipped to the nearest boundary.`
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
disp(char('HELLO' - 'A' + 'a')) 
\`\`\`
`,
    options : [ "hello", "HELLO", "Error using -" ],
    answer : 0,
    explanation :
        `MATLAB treats characters in arithmetic operations as their standard double-precision ASCII numeric values.`
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
x = hex2num('fff8000000000000');
bits = cell(20000, 1);
for k = 1:20000
    bits{k} = num2hex(-x);
end
disp(isequal(bits{:}))
\`\`\`
`,
    options : [ "0", "1", "Error" ],
    answer : 0,
    explanation :
        `Here, \`x\` is NaN. The observed result may be due to JIT optimizations.`
  },
];

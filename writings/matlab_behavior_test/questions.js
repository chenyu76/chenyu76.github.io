const questions = [
  {
    question :
        "Which of the following is the correct MATLAB command-line output after running the `disp('\\n')`?",
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
        "MATLAB performed an implicit type conversion, converting the char vector to a string."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
str1='str1';
str2="str2";
disp(str1(4)==str(4))
\`\`\`
`,
    options : [ "0 (false)", "1 (true)", "Error" ],
    answer : 2,
    explanation :
        "Index exceeds the number of array elements. Index must not exceed 1 since `str2` is a 1x1 string."
  },
  {
    question : "What is the result of evaluating `\"\"\"\" == ''''` in MATLAB?",
    options : [ "1 (true)", "0 (false)", "[]", "Error" ],
    answer : 1,
    explanation :
        "`\"\"\"\"` will be parsed as a string containing `\"`, while `''''` will be parsed as a char vector containing `'`. Even with implicit type conversion, they are not equal."
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
        "What is the return of evaluating\n`length('M') == length(\"M\")`?",
    options : [ "1 (true)", "0 (false)", "Error", "Empty array" ],
    answer : 0,
    explanation :
        "In MATLAB, `'M'` is a 1x1 character array with a length of 1, whereas `\"M\"` is a 1x1 string scalar with a length of 1."
  },
  {
    question :
        "What is the return of evaluating\n`length('MATLAB') == length(\"MATLAB\")`?",
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
    question : "What is the result of evaluating the equality `~ 1==2`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 3,
    explanation : "`~` has a higher priority."
  },
  {
    question : "What is the result of evaluating the equality `i==j`?",
    options : [ "1 (true)", "NaN", "Error", "0 (false)" ],
    answer : 0,
    explanation : "Without assignment, `i` and `j` are both imaginary units."
  },
  {
    question :
        "What is the output of comparing two Not-a-Number values: `disp(NaN == NaN)`?",
    options : [ "0 (false)", "1 (true)", "NaN", "[]" ],
    answer : 0,
    explanation :
        "According to the IEEE floating-point standard, NaN is not equal to anything, including itself. To properly check for equality involving NaN values, you must use the `isnan()` or `isequaln()` functions."
  },
  {
    question :
        "What is the output of comparing two empty arrays: `disp([] == [])`?",
    options : [ "0 (false)", "1 (true)", "[]", "" ],
    answer : 3,
    explanation :
        "MATLAB trys to compare elements in the matrix, so the result is a 0x0 logical array."
  },
  {
    question :
        "What is the output of comparing two empty arrays: `disp([] == [[]])`?",
    options : [ "0 (false)", "1 (true)", "[]", "" ],
    answer : 3,
    explanation :
        "MATLAB trys to compare elements in the matrix, so the result is a 0x0 logical array."
  },
  {
    question :
        "What is the output of the integer addition `uint8(200) + uint8(100)`?",
    options : [ "44", "300", "255", "Error" ],
    answer : 2,
    explanation :
        "MATLAB uses saturation arithmetic for integer types by default. Any operation that exceeds the maximum value for the type (`255` for `uint8`) is capped at that maximum value, rather than wrapping around like in C/C++."
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
        "What is the mathematical output and data type of `true + true`?",
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
        "`vec` is 1x3 double. `N = ndims(A)` returns the number of dimensions in the array A. The number of dimensions is always greater than or equal to 2. "
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
        "`mat` is 2x2 double. `N = ndims(A)` returns the number of dimensions in the array A. The number of dimensions is always greater than or equal to 2. "
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
        "`ten` is 2x4 double. `N = ndims(A)` returns the number of dimensions in the array A. The number of dimensions is always greater than or equal to 2. Unfortunately you cannot construct a tensor in MATLAB like this."
  },
  {
    question : `
What is the output of the following MATLAB program?
\`\`\`
vec = [1, 2, 3];
disp(ismartix(vec));
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
disp(ismartix(sca));
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
What is the output of the following MATLAB program:
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
See my question in MATLAB help Center.
</a>`
  },
  {
    question :
        `Which of the following MATLAB codes can correctly create the graph with the logarithmic coordinate axis？`,
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
        "`hold on` will fix the current coordinate axis properties, including XScale and YScale. Therefore, either `loglog` first and then `hold on`, or reset XScale and YScale again."
  },
  {
    question : `
Which of the following statement can print out \`NaN\`?
`,
    options : [
      "`fprintf(string(NaN))`", "`fprintf(num2str(NaN))`", "fprintf(NaN)",
      "All of three", "Neither"
    ],
    answer : 1,
    explanation : "`string(NaN)` returns a `<missing>`."
  },
  {
    question : `
Which of the following statement can print out \`missing\`?
`,
    options : [
      "`fprintf(string(missing))`", "`fprintf(num2str(missing))`",
      "fprintf(missing)", "All of three", "Neither"
    ],
    answer : 4,
    explanation : "Most of functions in MATLAB don't accept `missing`."
  },
];

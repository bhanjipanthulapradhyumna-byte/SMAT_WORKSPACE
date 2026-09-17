const math = require("mathjs");

async function executeCode(code) {
  try {
    const lines = code
      .replace(/\r/g, "")
      .split("\n");

    const variables = {};
    const functions = {};
    const plots = [];
    const output = [];

    const clean = (line) =>
      line.replace(/%.*$/, "").trim();

    function evaluate(expression, localVars = variables) {
      expression = expression
        .trim()
        .replace(/;$/, "")
        .trim();

      if (!expression) return undefined;

      // MATLAB power operators
      expression = expression
        .replace(/\.\^/g, "^")
        .replace(/\.\*/g, "*")
        .replace(/\.\//g, "/");

      // MATLAB logical operators
      expression = expression
        .replace(/&&/g, " and ")
        .replace(/\|\|/g, " or ")
        .replace(/~=/g, "!=");

      // MATLAB true/false
      expression = expression
        .replace(/\btrue\b/gi, "true")
        .replace(/\bfalse\b/gi, "false");

      // MATLAB colon operator
      expression = expression.replace(
        /(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/g,
        "range($1, $2)"
      );

      // User functions
      for (const name of Object.keys(functions)) {
        if (
          new RegExp(
            "\\b" + escapeRegExp(name) + "\\s*\\("
          ).test(expression)
        ) {
          const fn = functions[name];

          math[name] = (...args) => {
            const local = {};

            fn.params.forEach((p, i) => {
              local[p] = args[i];
            });

            return executeFunctionBody(
              fn.body,
              local
            );
          };
        }
      }

      const scope = {
        ...localVars,

        pi: Math.PI,
        e: Math.E,

        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,

        sqrt: Math.sqrt,
        abs: Math.abs,
        exp: Math.exp,
        log: Math.log,
        log10: Math.log10,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,

        sum: math.sum,
        mean: math.mean,
        min: math.min,
        max: math.max,

        range: (a, b) =>
          math.range(a, b + 1).toArray(),

        length: (x) =>
          Array.isArray(x) ? x.length : 1,

        size: (x) => {
          const s = math.size(x).valueOf();
          return s;
        }
      };

      return math.evaluate(
        expression,
        scope
      );
    }

    function executeFunctionBody(body, local) {
      let result;

      for (const raw of body) {
        const line = clean(raw);

        if (!line) continue;

        const returnMatch = line.match(
          /^([A-Za-z_]\w*)\s*=\s*(.+);?$/
        );

        if (returnMatch) {
          result = evaluate(
            returnMatch[2],
            local
          );

          local[returnMatch[1]] = result;
          continue;
        }

        result = evaluate(line, local);
      }

      return result;
    }

    function formatValue(value) {
      if (value === undefined) return "";

      if (
        value &&
        typeof value.toArray === "function"
      ) {
        value = value.toArray();
      }

      if (Array.isArray(value)) {
        return formatMatrix(value);
      }

      if (typeof value === "number") {
        if (Number.isInteger(value)) {
          return String(value);
        }

        return math.format(value, {
          precision: 8
        });
      }

      return String(value);
    }

    function formatMatrix(matrix) {
      if (!Array.isArray(matrix)) {
        return String(matrix);
      }

      if (
        matrix.length > 0 &&
        Array.isArray(matrix[0])
      ) {
        return matrix
          .map(row =>
            row
              .map(v => formatValue(v))
              .join("\t")
          )
          .join("\n");
      }

      return matrix
        .map(v => formatValue(v))
        .join("\t");
    }

    function findBlock(start, keyword) {
      let depth = 0;

      for (
        let i = start;
        i < lines.length;
        i++
      ) {
        const l = clean(lines[i]);

        if (
          l.startsWith(keyword) ||
          l.startsWith("for ") ||
          l.startsWith("if ") ||
          l.startsWith("function ")
        ) {
          depth++;
        }

        if (l === "end") {
          depth--;

          if (depth === 0) {
            return i;
          }
        }
      }

      throw new Error(
        `Missing end for ${keyword}`
      );
    }

    async function executeRange(
      start,
      end,
      scope = variables
    ) {
      let i = start;

      while (i < end) {
        const raw = lines[i];
        const line = clean(raw);

        if (!line) {
          i++;
          continue;
        }

        // Comment
        if (line.startsWith("%")) {
          i++;
          continue;
        }

        // FUNCTION
        const functionMatch = line.match(
          /^function\s+(?:\[(.*?)\]|([A-Za-z_]\w*))\s*=\s*([A-Za-z_]\w*)\s*\((.*?)\)/
        );

        if (functionMatch) {
          const outputs =
            functionMatch[1]
              ? functionMatch[1]
                  .split(",")
                  .map(x => x.trim())
              : [
                  functionMatch[2]
                ];

          const name =
            functionMatch[3];

          const params =
            functionMatch[4]
              ? functionMatch[4]
                  .split(",")
                  .map(x => x.trim())
              : [];

          const blockEnd =
            findBlock(i, "function");

          functions[name] = {
            outputs,
            params,
            body: lines.slice(
              i + 1,
              blockEnd
            )
          };

          i = blockEnd + 1;
          continue;
        }

        // FOR
        const forMatch = line.match(
          /^for\s+([A-Za-z_]\w*)\s*=\s*(.+)$/
        );

        if (forMatch) {
          const variable =
            forMatch[1];

          const rangeExpression =
            forMatch[2];

          const blockEnd =
            findBlock(i, "for");

          let values =
            evaluate(
              rangeExpression,
              scope
            );

          if (
            values &&
            typeof values.toArray ===
              "function"
          ) {
            values = values.toArray();
          }

          if (!Array.isArray(values)) {
            values = [values];
          }

          for (const value of values) {
            scope[variable] = value;

            await executeRange(
              i + 1,
              blockEnd,
              scope
            );
          }

          i = blockEnd + 1;
          continue;
        }

        // IF
        if (
          line.startsWith("if ")
        ) {
          const ifEnd =
            findBlock(i, "if");

          const branches = [];
          let currentStart = i + 1;
          let currentCondition =
            line.substring(3);

          let depth = 0;

          for (
            let j = i + 1;
            j < ifEnd;
            j++
          ) {
            const l = clean(lines[j]);

            if (
              l.startsWith("if ")
            ) depth++;

            if (l === "end") depth--;

            if (
              depth === 0 &&
              l.startsWith("elseif ")
            ) {
              branches.push({
                condition:
                  currentCondition,
                start:
                  currentStart,
                end: j
              });

              currentCondition =
                l.substring(7);

              currentStart =
                j + 1;
            }

            if (
              depth === 0 &&
              l === "else"
            ) {
              branches.push({
                condition:
                  currentCondition,
                start:
                  currentStart,
                end: j
              });

              currentCondition =
                "true";

              currentStart =
                j + 1;
            }
          }

          branches.push({
            condition:
              currentCondition,
            start:
              currentStart,
            end:
              ifEnd
          });

          for (const branch of branches) {
            const condition =
              evaluate(
                branch.condition,
                scope
              );

            if (condition) {
              await executeRange(
                branch.start,
                branch.end,
                scope
              );

              break;
            }
          }

          i = ifEnd + 1;
          continue;
        }

        // DISP
        const dispMatch =
          line.match(
            /^disp\s*\((.*)\)\s*;?$/
          );

        if (dispMatch) {
          const value =
            evaluate(
              dispMatch[1],
              scope
            );

          output.push(
            formatValue(value)
          );

          i++;
          continue;
        }

        // PLOT
        const plotMatch =
          line.match(
            /^plot\s*\((.*?)\)\s*;?$/
          );

        if (plotMatch) {
          const args =
            splitArguments(
              plotMatch[1]
            );

          if (args.length === 1) {
            const y =
              evaluate(
                args[0],
                scope
              );

            plots.push({
              x: Array.from(
                {
                  length:
                    getLength(y)
                },
                (_, n) => n + 1
              ),
              y: toArray(y)
            });
          } else {
            const x =
              evaluate(
                args[0],
                scope
              );

            const y =
              evaluate(
                args[1],
                scope
              );

            plots.push({
              x: toArray(x),
              y: toArray(y)
            });
          }

          output.push(
            "[Plot generated]"
          );

          i++;
          continue;
        }

        // Assignment
        const assignment =
          line.match(
            /^([A-Za-z_]\w*)\s*=\s*(.+);?$/
          );

        if (assignment) {
          const name =
            assignment[1];

          const expression =
            assignment[2];

          scope[name] =
            evaluate(
              expression,
              scope
            );

          i++;
          continue;
        }

        // Plain expression
        const value =
          evaluate(
            line,
            scope
          );

        if (
          value !== undefined
        ) {
          output.push(
            formatValue(value)
          );
        }

        i++;
      }
    }

    await executeRange(
      0,
      lines.length,
      variables
    );

    return {
      success: true,
      output:
        output.join("\n"),
      plots,
      variables: serializeVariables(
        variables
      ),
      error: null
    };

  } catch (error) {
    return {
      success: false,
      output: "",
      plots: [],
      error:
        error.message
    };
  }
}


function splitArguments(text) {
  const result = [];
  let current = "";
  let depth = 0;

  for (const char of text) {
    if (char === "(" || char === "[") {
      depth++;
    }

    if (char === ")" || char === "]") {
      depth--;
    }

    if (
      char === "," &&
      depth === 0
    ) {
      result.push(
        current.trim()
      );

      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(
      current.trim()
    );
  }

  return result;
}


function toArray(value) {
  if (
    value &&
    typeof value.toArray ===
      "function"
  ) {
    value =
      value.toArray();
  }

  if (Array.isArray(value)) {
    return value.flat(
      Infinity
    );
  }

  return [value];
}


function getLength(value) {
  return toArray(value).length;
}


function serializeVariables(
  variables
) {
  const result = {};

  for (const [
    key,
    value
  ] of Object.entries(
    variables
  )) {
    try {
      result[key] =
        value &&
        typeof value.toArray ===
          "function"
          ? value.toArray()
          : value;
    } catch {
      result[key] =
        String(value);
    }
  }

  return result;
}


function escapeRegExp(text) {
  return text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}


module.exports = {
  executeCode
};

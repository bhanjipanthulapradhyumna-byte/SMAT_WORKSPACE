function executeCode(code) {
  return new Promise((resolve) => {
    try {
      const lines = code
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      const variables = {};
      const output = [];

      for (const line of lines) {
        // MATLAB comments
        if (line.startsWith("%")) {
          continue;
        }

        // disp(...)
        const dispMatch = line.match(/^disp\s*\((.*)\)\s*;?$/);

        if (dispMatch) {
          const value = evaluateExpression(
            dispMatch[1].trim(),
            variables
          );

          output.push(formatValue(value));
          continue;
        }

        // variable assignment
        const assignment = line.match(
          /^([a-zA-Z_]\w*)\s*=\s*(.+?);?$/
        );

        if (assignment) {
          const variableName = assignment[1];
          const expression = assignment[2].trim();

          variables[variableName] =
            evaluateExpression(expression, variables);

          continue;
        }

        // expression without assignment
        const value = evaluateExpression(line, variables);

        if (value !== undefined && value !== null) {
          output.push(formatValue(value));
        }
      }

      resolve({
        success: true,
        output: output.join("\n"),
        error: null
      });

    } catch (error) {
      resolve({
        success: false,
        output: "",
        error: error.message
      });
    }
  });
}


function evaluateExpression(expression, variables) {
  expression = expression
    .replace(/;$/, "")
    .trim();

  // Variable directly
  if (
    Object.prototype.hasOwnProperty.call(
      variables,
      expression
    )
  ) {
    return variables[expression];
  }

  // Strings
  if (
    (expression.startsWith('"') &&
      expression.endsWith('"')) ||
    (expression.startsWith("'") &&
      expression.endsWith("'"))
  ) {
    return expression.slice(1, -1);
  }

  // Replace known variables with their numeric values
  let converted = expression.replace(
    /\b[a-zA-Z_]\w*\b/g,
    (name) => {
      if (
        Object.prototype.hasOwnProperty.call(
          variables,
          name
        )
      ) {
        const value = variables[name];

        if (typeof value === "number") {
          return String(value);
        }

        throw new Error(
          `Variable ${name} is not numeric`
        );
      }

      return name;
    }
  );

  // Allow only basic arithmetic
  if (!/^[0-9+\-*/().\s]+$/.test(converted)) {
    throw new Error(
      `Unsupported expression: ${expression}`
    );
  }

  return Function(
    '"use strict"; return (' + converted + ')'
  )();
}


function formatValue(value) {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value);
}


module.exports = {
  executeCode
};

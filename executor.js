function executeCode(code) {
  return new Promise((resolve) => {
    try {
      const lines = code.split("\n").map(line => line.trim()).filter(Boolean);
      const variables = {};
      const output = [];

      for (const line of lines) {
        if (line.startsWith("%")) continue;

        const dispMatch = line.match(/^disp\s*\((.*)\)\s*;?$/);
        if (dispMatch) {
          output.push(String(evaluateExpression(dispMatch[1].trim(), variables)));
          continue;
        }

        const assignment = line.match(/^([a-zA-Z_]\w*)\s*=\s*(.+?);?$/);
        if (assignment) {
          variables[assignment[1]] = evaluateExpression(assignment[2], variables);
          continue;
        }

        const value = evaluateExpression(line, variables);
        if (value !== undefined && value !== null) output.push(String(value));
      }

      resolve({ success: true, output: output.join("\n"), error: null });
    } catch (error) {
      resolve({ success: false, output: "", error: error.message });
    }
  });
}

function evaluateExpression(expression, variables) {
  expression = expression.replace(/;$/, "").trim();

  if (Object.prototype.hasOwnProperty.call(variables, expression)) return variables[expression];

  if ((expression.startsWith('"') && expression.endsWith('"')) ||
      (expression.startsWith("'") && expression.endsWith("'"))) {
    return expression.slice(1, -1);
  }

  if (/^[0-9+\-*/().\s]+$/.test(expression)) {
    return Function('"use strict"; return (' + expression + ')')();
  }

  throw new Error(`Unsupported expression: ${expression}`);
}

module.exports = { executeCode };
